/* Noctography: backup and restore.
   ------------------------------------------------------------------------------------------
   Everything this app knows about you lives on the one device: the compositions in IndexedDB,
   the saved places, the horizon profiles, the obstruction sectors and the night log in local
   storage. There is no server, no account and nothing to sign into, which is the promise the app
   makes and intends to keep. The cost of that promise is that a lost phone, a cleared browser or
   iOS reclaiming storage after a week unopened takes the lot, and the compositions are the part
   nobody can reconstruct: they are a picture of a night that has already gone.

   So: one file, written here, read back here. Three decisions worth recording.

   It is a zip, not a JSON blob with base64 inside it. Base64 costs a third more bytes and, more
   to the point, gives you a file that only this app can open. A zip can be unzipped on any
   machine, and the compositions are ordinary JPEGs inside it with the stamp and the coordinates
   already burned in. If Noctography disappears tomorrow the backup is still a folder of usable
   photographs, and that seemed the more honest thing to hand somebody.

   It is stored, not deflated. JPEG does not compress twice, so deflating buys a percent and costs
   a dependency. Reading does handle deflate, because a user may well unzip and rezip the folder
   themselves and their tool will compress the JSON.

   Restoring is additive and never destructive. An id already on the device is left alone and
   counted, rather than overwritten: somebody restoring an old backup onto a phone they have been
   using should not lose this week's work to last month's file. Nothing is deleted, ever.
   ------------------------------------------------------------------------------------------ */
"use strict";
(function () {
if (window.NoctoBackup) return;

const MANIFEST = 'noctography-backup.json';
const IMG_DIR = 'compositions/';
const FORMAT = 1;

/* The local-storage collections worth keeping. Deliberately not the whole namespace: the palette,
   the night-vision flag and the install nudge are preferences that belong to a device, and the
   tide and orbital-element caches are stale the moment they are written. What is here is the
   material a person made. */
const KEYS = [
  { key: 'noctography.favs',       label: 'places',   kind: 'array',  idOf: v => (v && v.lat != null) ? v.lat.toFixed(4) + ',' + v.lon.toFixed(4) : null },
  { key: 'noctography.horizons',   label: 'skylines', kind: 'object' },
  { key: 'nocto.log.v1',           label: 'log',      kind: 'log' },
  { key: 'nocto-sightings-v1',     label: 'aurora notes', kind: 'array', idOf: v => (v && v.at) || null },
];

/* ------------------------------------------------------------------ zip out --- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function dosStamp(d) {
  return {
    t: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
    d: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF,
  };
}
function zipWriter() {
  const parts = [], entries = [], enc = new TextEncoder();
  let at = 0;
  return {
    /* Takes a Blob and keeps it a Blob. The bytes are read once for the checksum and dropped, so
       a hundred compositions never sit in memory together: the browser can spill the assembled
       Blob to disk, an array of Uint8Arrays it cannot. */
    async add(name, blob) {
      const nb = enc.encode(name);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const crc = crc32(bytes), size = bytes.length, st = dosStamp(new Date());
      const hd = new DataView(new ArrayBuffer(30));
      hd.setUint32(0, 0x04034b50, true);
      hd.setUint16(4, 20, true);
      hd.setUint16(10, st.t, true); hd.setUint16(12, st.d, true);
      hd.setUint32(14, crc, true);
      hd.setUint32(18, size, true); hd.setUint32(22, size, true);
      hd.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(hd.buffer), nb, blob);
      entries.push({ nb, crc, size, t: st.t, d: st.d, at });
      at += 30 + nb.length + size;
    },
    blob() {
      const cd = [];
      let cdSize = 0;
      entries.forEach(en => {
        const hd = new DataView(new ArrayBuffer(46));
        hd.setUint32(0, 0x02014b50, true);
        hd.setUint16(4, 20, true); hd.setUint16(6, 20, true);
        hd.setUint16(12, en.t, true); hd.setUint16(14, en.d, true);
        hd.setUint32(16, en.crc, true);
        hd.setUint32(20, en.size, true); hd.setUint32(24, en.size, true);
        hd.setUint16(28, en.nb.length, true);
        hd.setUint32(42, en.at, true);
        cd.push(new Uint8Array(hd.buffer), en.nb);
        cdSize += 46 + en.nb.length;
      });
      const eo = new DataView(new ArrayBuffer(22));
      eo.setUint32(0, 0x06054b50, true);
      eo.setUint16(8, entries.length, true); eo.setUint16(10, entries.length, true);
      eo.setUint32(12, cdSize, true); eo.setUint32(16, at, true);
      return new Blob(parts.concat(cd, [new Uint8Array(eo.buffer)]), { type: 'application/zip' });
    },
  };
}

/* ------------------------------------------------------------------- zip in ---
   Read through the central directory rather than by walking local headers: a file rezipped by
   somebody's own tool may carry data descriptors, where the local header's sizes are zero and
   only the central directory is trustworthy. */
async function zipRead(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let eo = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  }
  if (eo < 0) throw new Error('not a zip file');
  const count = dv.getUint16(eo + 10, true);
  let p = dv.getUint32(eo + 16, true);
  const out = new Map();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip directory is damaged');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const cmtLen = dv.getUint16(p + 32, true);
    const lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = dv.getUint16(lo + 26, true);
    const lExtraLen = dv.getUint16(lo + 28, true);
    const start = lo + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, raw);
    else if (method === 8 && window.DecompressionStream) {
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([raw]).stream().pipeThrough(ds);
      out.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    } else throw new Error('this zip uses a compression this browser cannot read');
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

/* --------------------------------------------------------------------- read --- */
function readKey(k) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function writeKey(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { return false; }
}

/* --------------------------------------------------------------------- pack --- */
function readme(counts, when, version) {
  return [
    'Noctography backup',
    '',
    'Made ' + when.toISOString().slice(0, 16).replace('T', ' ') + ' by Noctography ' + (version || ''),
    '',
    counts.comps + ' compositions, ' + counts.places + ' saved places, ' + counts.skylines + ' skylines, '
      + counts.nights + ' nights in the log.',
    '',
    'compositions/  the frames as the phone saw them, plus a thumbnail of each. Ordinary JPEGs:',
    '               the stamp is burned along the bottom and the coordinates, the aim and the',
    '               focal length are written into each file, so they stand up on their own.',
    MANIFEST + '  everything else, as plain readable JSON.',
    '',
    'To restore, open Noctography, go to More, and choose Restore from a file. Pick this zip as',
    'it is: there is no need to unzip it first. Restoring only adds, so nothing already on the',
    'phone is overwritten or deleted.',
    '',
    'Nothing in this file has been anywhere near a server. Keep a copy somewhere that is not the',
    'phone: that is the whole point of it.',
    '',
  ].join('\n');
}

async function pack(opts) {
  const o = opts || {};
  const C = window.NoctoComp;
  const onStep = o.onStep || (() => {});
  const when = new Date();
  const zip = zipWriter();

  const comps = C ? await C.all() : [];
  const local = {};
  KEYS.forEach(k => { const v = readKey(k.key); if (v) local[k.key] = v; });

  const manifest = {
    format: FORMAT,
    app: o.version || '',
    made: when.toISOString(),
    comps: [],
    local,
  };

  let i = 0;
  for (const rec of comps) {
    i++;
    onStep(i, comps.length);
    const flat = {};
    Object.keys(rec).forEach(k => { if (k !== 'img' && k !== 'thumb') flat[k] = rec[k]; });
    if (rec.img) { flat.imgFile = IMG_DIR + rec.id + '.jpg'; await zip.add(flat.imgFile, rec.img); }
    if (rec.thumb) { flat.thumbFile = IMG_DIR + rec.id + '-thumb.jpg'; await zip.add(flat.thumbFile, rec.thumb); }
    manifest.comps.push(flat);
  }

  const counts = {
    comps: manifest.comps.length,
    places: (local['noctography.favs'] || []).length,
    skylines: Object.keys(local['noctography.horizons'] || {}).length,
    nights: Object.keys((local['nocto.log.v1'] || {}).nights || {}).length,
  };

  await zip.add(MANIFEST, new Blob([JSON.stringify(manifest, null, 1)], { type: 'application/json' }));
  await zip.add('README.txt', new Blob([readme(counts, when, o.version)], { type: 'text/plain' }));
  return { blob: zip.blob(), counts, when };
}

/* ------------------------------------------------------------------ restore ---
   Additive throughout. Every collection is merged on the identity it already uses elsewhere in
   the app, so a restore run twice changes nothing the second time. */
async function restore(file, opts) {
  const o = opts || {};
  const onStep = o.onStep || (() => {});
  const C = window.NoctoComp;
  const files = await zipRead(file);
  const mf = files.get(MANIFEST);
  if (!mf) throw new Error('this does not look like a Noctography backup: no ' + MANIFEST);
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(mf)); }
  catch (e) { throw new Error('the backup details inside the file are damaged'); }
  if (!manifest || manifest.format > FORMAT) {
    throw new Error('this backup was made by a newer version of Noctography than this one');
  }

  const added = { comps: 0, places: 0, skylines: 0, nights: 0, notes: 0 };
  const kept = { comps: 0, places: 0, skylines: 0, nights: 0, notes: 0 };

  /* Compositions. An id already present is left exactly as it is. */
  const list = manifest.comps || [];
  if (C && list.length) {
    const here = new Set((await C.all()).map(r => r.id));
    let i = 0;
    for (const flat of list) {
      i++;
      onStep(i, list.length);
      if (!flat || !flat.id) continue;
      if (here.has(flat.id)) { kept.comps++; continue; }
      const rec = {};
      Object.keys(flat).forEach(k => { if (k !== 'imgFile' && k !== 'thumbFile') rec[k] = flat[k]; });
      const img = flat.imgFile && files.get(flat.imgFile);
      const th = flat.thumbFile && files.get(flat.thumbFile);
      if (img) rec.img = new Blob([img], { type: 'image/jpeg' });
      if (th) rec.thumb = new Blob([th], { type: 'image/jpeg' });
      /* A record with no picture is not a composition, it is a row of numbers. Skipped rather
         than restored into a list of grey rectangles. */
      if (!rec.img && !rec.thumb) { kept.comps++; continue; }
      /* A composition without a place or a moment cannot be pinned, walked back to or asked when
         it comes round again, and a hand-edited backup is under nobody's control. Records that
         cannot answer those questions are counted rather than restored into something that half
         works. Missing numbers beyond that are the app's problem to print as a dash. */
      if (!isFinite(rec.lat) || !isFinite(rec.lon) || !isFinite(rec.at)) { kept.comps++; continue; }
      await C.put(rec);
      added.comps++;
    }
  }

  const local = manifest.local || {};

  /* Saved places, merged on the same three-decimal key the app itself uses. */
  const favsIn = local['noctography.favs'];
  if (Array.isArray(favsIn) && favsIn.length) {
    const cur = readKey('noctography.favs') || [];
    const seen = new Set(cur.map(f => (f && f.lat != null) ? f.lat.toFixed(3) + ',' + f.lon.toFixed(3) : ''));
    favsIn.forEach(f => {
      if (!f || f.lat == null) return;
      const k = f.lat.toFixed(3) + ',' + f.lon.toFixed(3);
      if (seen.has(k)) { kept.places++; return; }
      seen.add(k); cur.push(f); added.places++;
    });
    if (added.places) writeKey('noctography.favs', cur);
  }

  /* Horizon profiles, on their own four-decimal key. */
  const hzIn = local['noctography.horizons'];
  if (hzIn && typeof hzIn === 'object') {
    const cur = readKey('noctography.horizons') || {};
    Object.keys(hzIn).forEach(k => {
      if (cur[k]) { kept.skylines++; return; }
      cur[k] = hzIn[k]; added.skylines++;
    });
    if (added.skylines) writeKey('noctography.horizons', cur);
  }

  /* The log, night by night. A night present on both sides is left alone rather than having its
     shots merged: two lists of shots cannot be reconciled without inventing duplicates, and the
     local copy is the one somebody has been adding to. */
  const logIn = local['nocto.log.v1'];
  if (logIn && logIn.nights) {
    const cur = readKey('nocto.log.v1') || { v: 1, nights: {} };
    if (!cur.nights) cur.nights = {};
    Object.keys(logIn.nights).forEach(k => {
      if (cur.nights[k]) { kept.nights++; return; }
      cur.nights[k] = logIn.nights[k]; added.nights++;
    });
    if (added.nights) writeKey('nocto.log.v1', cur);
  }

  /* Aurora sightings, on their timestamp. */
  const sightIn = local['nocto-sightings-v1'];
  if (Array.isArray(sightIn) && sightIn.length) {
    const cur = readKey('nocto-sightings-v1') || [];
    const seen = new Set(cur.map(s => s && s.at));
    sightIn.forEach(s => {
      if (!s || !s.at) return;
      if (seen.has(s.at)) { kept.notes++; return; }
      seen.add(s.at); cur.push(s); added.notes++;
    });
    if (added.notes) writeKey('nocto-sightings-v1', cur.sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-200));
  }

  return { added, kept, made: manifest.made, app: manifest.app };
}

/* A sentence, because five counts in a row is not an answer to "did it work". */
function summarise(r) {
  const a = r.added, k = r.kept;
  const bits = [];
  const say = (n, one, many) => { if (n) bits.push(n + ' ' + (n === 1 ? one : many)); };
  say(a.comps, 'composition', 'compositions');
  say(a.places, 'place', 'places');
  say(a.skylines, 'skyline', 'skylines');
  say(a.nights, 'night in the log', 'nights in the log');
  say(a.notes, 'aurora note', 'aurora notes');
  const total = k.comps + k.places + k.skylines + k.nights + k.notes;
  if (!bits.length) {
    return total ? 'Nothing new: everything in that file is already on this phone.' : 'That file held nothing to restore.';
  }
  let s = 'Restored ' + bits.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
  if (total) s += ' ' + total + ' were already here and were left alone.';
  return s;
}

function fileName(when) {
  const d = when || new Date();
  const p = n => String(n).padStart(2, '0');
  return 'noctography-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.zip';
}

/* Getting the file off the phone. On iOS a download lands in Files, which is fine but easy to
   lose; the share sheet puts it in iCloud Drive or straight into a message, which is where a
   backup actually wants to go. Share is tried first and the download is the fallback, and it has
   to be its own function because the composition module's share hard-codes image/jpeg. */
async function deliver(blob, name) {
  const nm = name || fileName();
  try {
    if (navigator.canShare && navigator.share) {
      const file = new File([blob], nm, { type: 'application/zip' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Noctography backup' });
        return 'shared';
      }
    }
  } catch (e) {
    /* A cancelled share sheet is a decision, not a failure: no silent download behind it. */
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nm;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}

window.NoctoBackup = { pack, restore, summarise, fileName, deliver, zipRead, KEYS, FORMAT };
})();
