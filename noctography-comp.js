/* ======================= saved compositions =======================
   The scouting half of the app. You are standing somewhere in daylight, you can see a picture in
   the landscape, and Sky AR has just told you which night and which minute the sky lines up with
   it. This file is what happens when you press the button: the composite, the stamp burned into
   it, the EXIF written into the file, the store it lives in, and the arithmetic that works out
   when the same framing comes round again. No UI here.

   Three decisions worth stating.

   The store is the record and Photos is an export. A browser cannot write into the camera roll,
   so anything that depends on the operating system accepting a file is a second, optional step.
   The composition itself is saved on the tap, always, with no dialogue, into this device's own
   database. That is also why the nudge to get a copy out exists: nothing here is backed up.

   The stamp is burned into the picture as well as written into the file. Metadata is the better
   record and the worse survivor: canvas encoding strips it, messaging apps strip it, a screenshot
   of a screenshot has never carried any. A band along the bottom survives all of that, and it
   means the file is self-describing when it is sitting in a folder with nothing else to identify
   it.

   The aim is worth more than the picture. Azimuth, altitude, field and the calibration state cost
   nothing to store at the moment of the tap, and they are what let the app put you back on the
   same framing, walk you back to the spot, and tell you every future night the sky returns to it.
   The picture is what the user asks for; the aim is why this is not just a photo with a note. */
"use strict";
(function () {
if (window.NoctoComp) return;

const DBN = 'nocto-comps', STORE = 'comps', VER = 1;
const SIDEREAL_MS = 86164090.5;          // one sidereal day: 23h 56m 04.09s
const D2R = Math.PI / 180;

/* ---------------------------------------------------------------- store ----
   IndexedDB rather than the key store the night log uses: that one holds a few megabytes of
   strings and a composition is a picture. A 1600px long edge lands around 300 KB, so a hundred
   compositions is about 30 MB, which is comfortable. Blobs go in as Blobs; base64 in a string
   would cost a third more for nothing. */
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no indexeddb')); return; }
    const rq = indexedDB.open(DBN, VER);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('night', 'night');
      }
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error || new Error('open failed'));
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
function tx(mode, fn) {
  return db().then(d => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}
const all = () => tx('readonly', s => s.getAll()).then(r => (r || []).slice().sort((a, b) => a.night - b.night));
const put = rec => tx('readwrite', s => s.put(rec)).then(() => rec);
const del = id => tx('readwrite', s => s.delete(id));
const get = id => tx('readonly', s => s.get(id));

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ------------------------------------------------------------ the picture ---
   What is on screen in AR is three stacked layers: the camera video, a canvas of nebula sprites
   and the Milky Way panorama blended as screen, and a canvas of lines, labels and the frame
   rectangle. This rebuilds that stack into one image at the overlay's own device resolution,
   which on a modern phone is around 800 by 1600.

   Three details have to be carried across or the export does not match the screen. Digital zoom
   is a CSS transform on the video, so the source frame is cropped by the same factor here. The
   sprite layer is mix-blend-mode: screen in CSS, which is the screen composite operation on a
   canvas. The daylight contrast slider is a CSS filter, which canvas can also apply, though it is
   tried rather than trusted: older Safari ignores ctx.filter, and a picture without the contrast
   lift is a great deal better than no picture. */
function compose(o) {
  const vec = o.vecCv;
  if (!vec || !vec.width) return null;
  const W = vec.width, H = vec.height;
  const bandH = o.stamp ? Math.max(126, Math.round(W * 0.215)) : 0;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H + bandH;
  const x = cv.getContext('2d');
  if (!x) return null;

  x.fillStyle = '#000';
  x.fillRect(0, 0, W, H + bandH);

  const v = o.video;
  if (v && v.videoWidth && o.camOn !== false) {
    const s = Math.max(W / v.videoWidth, H / v.videoHeight) * (o.zoom || 1);
    const dw = v.videoWidth * s, dh = v.videoHeight * s;
    x.save();
    try { if (o.camFilter) x.filter = o.camFilter; } catch (e) {}
    try { x.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) {}
    x.restore();
  }

  if (o.imgCv && o.imgCv.width) {
    x.save();
    x.globalCompositeOperation = 'screen';
    try { if (o.imgFilter) x.filter = o.imgFilter; } catch (e) {}
    try { x.drawImage(o.imgCv, 0, 0, W, H); } catch (e) {}
    x.restore();
  }

  try { x.drawImage(vec, 0, 0, W, H); } catch (e) {}

  if (bandH) band(x, W, H, bandH, o.stamp);
  return cv;
}

/* The band. House voice, mono for anything that is data, and the one sentence that has to be
   there when the compass was never calibrated: a bearing recorded on a phone compass alone can be
   fifteen degrees out, and this picture will outlive anyone's memory of that. */
function band(x, W, y, h, st) {
  const u = W / 1000;                                  // one scale for the whole band
  x.fillStyle = '#050506';
  x.fillRect(0, y, W, h);
  x.fillStyle = 'rgba(214,179,104,.8)';
  x.fillRect(0, y, W, Math.max(1, 2 * u));

  const L = 34 * u;
  let ty = y + 48 * u;
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#F3F0EA';
  x.font = '400 ' + (44 * u).toFixed(1) + 'px "Cormorant Garamond", Georgia, serif';
  x.fillText(clip(x, st.name || 'Untitled composition', W - L * 2), L, ty);

  ty += 38 * u;
  x.fillStyle = '#D6B368';
  x.font = '500 ' + (25 * u).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
  x.fillText(clip(x, st.line1 || '', W - L * 2), L, ty);

  ty += 32 * u;
  x.fillStyle = '#ADA79B';
  x.font = (23 * u).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
  x.fillText(clip(x, st.line2 || '', W - L * 2), L, ty);

  if (st.line3) {
    ty += 30 * u;
    x.fillStyle = st.warn ? '#DCD7CC' : '#918B81';
    x.font = (st.warn ? 'italic ' : '') + (21 * u).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
    x.fillText(clip(x, st.line3, W - L * 2), L, ty);
  }

  x.fillStyle = 'rgba(243,240,234,.3)';
  x.font = '600 ' + (18 * u).toFixed(1) + 'px "Barlow", system-ui, sans-serif';
  const mark = 'NOCTOGRAPHY';
  x.fillText(mark, W - L - x.measureText(mark).width, y + h - 20 * u);
}
function clip(x, s, max) {
  s = String(s || '');
  if (x.measureText(s).width <= max) return s;
  while (s.length > 4 && x.measureText(s + '\u2026').width > max) s = s.slice(0, -1);
  return s + '\u2026';
}

/* A smaller copy for the lists and the map card. Kept as its own blob so a list of forty
   compositions is not decoding forty full-size JPEGs to draw forty thumbnails. */
/* The picture as it leaves the phone: the stored frame with the band burned along the bottom.
   Kept apart from the capture on purpose. The name and the note arrive after the tap, in the car,
   with two hands, so the stored frame carries no band and the band is burned at the moment a copy
   is asked for, when the words are known. */
function stamped(blob, stamp) {
  return createImageBitmap(blob).then(bmp => {
    const W = bmp.width, H = bmp.height;
    const bandH = Math.max(126, Math.round(W * 0.215));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H + bandH;
    const x = cv.getContext('2d');
    x.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    band(x, W, H, bandH, stamp || {});
    return cv;
  });
}

function thumb(cv, long) {
  const target = long || 420;
  const s = Math.min(1, target / Math.max(cv.width, cv.height));
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(cv.width * s));
  t.height = Math.max(1, Math.round(cv.height * s));
  const c = t.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(cv, 0, 0, t.width, t.height);
  return t;
}
function toBlob(cv, q) {
  return new Promise(res => {
    if (cv.toBlob) cv.toBlob(b => res(b), 'image/jpeg', q == null ? 0.86 : q);
    else res(dataToBlob(cv.toDataURL('image/jpeg', q == null ? 0.86 : q)));
  });
}
function dataToBlob(url) {
  const bin = atob(String(url).split(',')[1] || '');
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: 'image/jpeg' });
}

/* --------------------------------------------------------------- the EXIF ---
   Canvas encoding strips metadata, so this writes an APP1 Exif segment by hand and splices it in
   after the start-of-image marker. No library: a TIFF directory is three numbers and a payload
   per entry, and the whole thing is a few hundred bytes.

   Which date goes in the date fields is the one real judgement here. The capture time goes in,
   not the intended night: a future DateTimeOriginal is a date no photo library expects and the
   behaviour when it meets one is not something to promise. The intended night is in the burned
   band, in the description, and it is what the app itself sorts and reminds on.

   GPSImgDirection is the field worth carrying beyond the obvious ones. It exists exactly for
   "which way was the camera pointing", and some map and gallery apps will draw it back as a small
   cone on a pin, which is precisely what a scouted composition is. */
const T_BYTE = 1, T_ASCII = 2, T_SHORT = 3, T_LONG = 4, T_RATIONAL = 5, T_UNDEF = 7;
const be16 = v => [(v >> 8) & 255, v & 255];
const be32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const eAscii = (tag, s) => { const b = []; const t = String(s == null ? '' : s); for (let i = 0; i < t.length; i++) b.push(t.charCodeAt(i) & 255); b.push(0); return { tag, type: T_ASCII, count: b.length, bytes: b }; };
const eShort = (tag, v) => ({ tag, type: T_SHORT, count: 1, bytes: be16(v) });
const eLong = (tag, v) => ({ tag, type: T_LONG, count: 1, bytes: be32(v) });
const eBytes = (tag, arr) => ({ tag, type: T_BYTE, count: arr.length, bytes: arr.slice() });
const eUndef = (tag, arr) => ({ tag, type: T_UNDEF, count: arr.length, bytes: arr.slice() });
function eRational(tag, pairs) {
  const b = [];
  pairs.forEach(p => { be32(Math.round(p[0])).forEach(v => b.push(v)); be32(Math.round(p[1])).forEach(v => b.push(v)); });
  return { tag, type: T_RATIONAL, count: pairs.length, bytes: b };
}
function rat(v, den) {
  const d = den || 10000;
  return [Math.round(Math.abs(v) * d), d];
}
function dms(v) {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = (a - d - m / 60) * 3600;
  return [[d, 1], [m, 1], [Math.round(s * 1000), 1000]];
}
function packIfd(entries, base) {
  entries = entries.slice().sort((a, b) => a.tag - b.tag);
  const n = entries.length, dirSize = 2 + 12 * n + 4;
  let dataAt = base + dirSize;
  const dir = new Uint8Array(dirSize);
  const put16 = (o, v) => { dir[o] = (v >> 8) & 255; dir[o + 1] = v & 255; };
  const put32 = (o, v) => { dir[o] = (v >>> 24) & 255; dir[o + 1] = (v >>> 16) & 255; dir[o + 2] = (v >>> 8) & 255; dir[o + 3] = v & 255; };
  put16(0, n);
  const chunks = [];
  entries.forEach((e, i) => {
    const o = 2 + i * 12;
    put16(o, e.tag); put16(o + 2, e.type); put32(o + 4, e.count);
    if (e.bytes.length <= 4) {
      for (let k = 0; k < e.bytes.length; k++) dir[o + 8 + k] = e.bytes[k];
    } else {
      put32(o + 8, dataAt);
      const pad = e.bytes.length % 2;
      chunks.push(new Uint8Array(e.bytes.concat(pad ? [0] : [])));
      dataAt += e.bytes.length + pad;
    }
  });
  return { dir, chunks, end: dataAt };
}
function exifBlock(f) {
  const dt = f.captured instanceof Date ? f.captured : new Date(f.captured || Date.now());
  const p2 = v => String(v).padStart(2, '0');
  const stamp = dt.getFullYear() + ':' + p2(dt.getMonth() + 1) + ':' + p2(dt.getDate()) + ' '
    + p2(dt.getHours()) + ':' + p2(dt.getMinutes()) + ':' + p2(dt.getSeconds());

  const ifd0 = [
    eAscii(0x010E, f.description || ''),
    eAscii(0x010F, 'Noctography'),
    eAscii(0x0110, f.model || 'Sky AR composition'),
    eAscii(0x0131, f.software || 'Noctography'),
    eAscii(0x0132, stamp),
    eShort(0x0112, 1),
    eLong(0x8769, 0), eLong(0x8825, 0),
  ];
  const comment = 'ASCII\0\0\0' + (f.comment || '');
  const cbytes = [];
  for (let i = 0; i < comment.length; i++) cbytes.push(comment.charCodeAt(i) & 255);
  const exif = [
    eAscii(0x9003, stamp), eAscii(0x9004, stamp),
    eUndef(0x9286, cbytes),
    eUndef(0x9000, [48, 50, 51, 48]),                 // ExifVersion 0230
    eShort(0xA405, Math.round(f.focal35 || 0)),
    eRational(0x920A, [rat(f.focal || 0, 100)]),
    eLong(0xA002, f.width || 0), eLong(0xA003, f.height || 0),
    eAscii(0xA434, f.lens || ''),
  ];
  const gps = [
    eBytes(0x0000, [2, 3, 0, 0]),
    eAscii(0x0001, (f.lat || 0) >= 0 ? 'N' : 'S'), eRational(0x0002, dms(f.lat || 0)),
    eAscii(0x0003, (f.lon || 0) >= 0 ? 'E' : 'W'), eRational(0x0004, dms(f.lon || 0)),
    eAscii(0x0010, 'T'), eRational(0x0011, [rat(((f.az || 0) % 360 + 360) % 360, 100)]),
    eAscii(0x001D, dt.getUTCFullYear() + ':' + p2(dt.getUTCMonth() + 1) + ':' + p2(dt.getUTCDate())),
    eRational(0x0007, [[dt.getUTCHours(), 1], [dt.getUTCMinutes(), 1], [dt.getUTCSeconds(), 1]]),
  ];

  /* Sizes are fixed by the entry list, so the pointers can be resolved in one pass: pack once to
     find where the two sub-directories land, then pack IFD0 again with the real values in. */
  const first = packIfd(ifd0, 8);
  const exifPack = packIfd(exif, first.end);
  const gpsPack = packIfd(gps, exifPack.end);
  const ifd0Real = ifd0.map(e => (e.tag === 0x8769 ? eLong(0x8769, first.end)
    : e.tag === 0x8825 ? eLong(0x8825, exifPack.end) : e));
  const head = packIfd(ifd0Real, 8);

  const parts = [new Uint8Array([0x4D, 0x4D, 0, 42, 0, 0, 0, 8]), head.dir];
  head.chunks.forEach(c => parts.push(c));
  parts.push(exifPack.dir); exifPack.chunks.forEach(c => parts.push(c));
  parts.push(gpsPack.dir); gpsPack.chunks.forEach(c => parts.push(c));

  let len = 0; parts.forEach(p => { len += p.length; });
  const tiff = new Uint8Array(len);
  let at = 0; parts.forEach(p => { tiff.set(p, at); at += p.length; });

  const app1 = new Uint8Array(tiff.length + 10);
  app1[0] = 0xFF; app1[1] = 0xE1;
  const size = tiff.length + 8;
  app1[2] = (size >> 8) & 255; app1[3] = size & 255;
  app1.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  app1.set(tiff, 10);
  return app1;
}
/* The splice. A JPEG from canvas starts with the start-of-image marker and usually a JFIF block;
   Exif belongs immediately after the marker, which is where this puts it. If anything about the
   file is not what we expect, the original goes out unchanged: a picture without metadata beats
   no picture. */
function withExif(blob, fields) {
  return blob.arrayBuffer().then(buf => {
    const src = new Uint8Array(buf);
    if (src[0] !== 0xFF || src[1] !== 0xD8) return blob;
    const app1 = exifBlock(fields);
    const out = new Uint8Array(src.length + app1.length);
    out.set(src.subarray(0, 2), 0);
    out.set(app1, 2);
    out.set(src.subarray(2), 2 + app1.length);
    return new Blob([out], { type: 'image/jpeg' });
  }).catch(() => blob);
}

/* ------------------------------------------------------ getting a copy out ---
   The share sheet is the good route on a phone: it hands the file to iOS or Android and the user
   taps Save Image, which does put it in the camera roll with the metadata intact. It has to be
   fired from the tap itself, which is why this is a separate button on the card and not something
   tacked onto the end of a save. The download is the desktop answer and the fallback; on iOS it
   lands in Files rather than Photos, which is worth saying in the copy rather than pretending. */
function canShare(blob, name) {
  try {
    if (!navigator.canShare || !navigator.share) return false;
    return navigator.canShare({ files: [new File([blob], name || 'composition.jpg', { type: 'image/jpeg' })] });
  } catch (e) { return false; }
}
function share(blob, name, title) {
  const file = new File([blob], name || 'composition.jpg', { type: 'image/jpeg' });
  return navigator.share({ files: [file], title: title || name || 'Composition' });
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name || 'composition.jpg';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

/* ------------------------------------------------- when it comes round again ---
   A composition is an aim held against the ground: an altitude and an azimuth, at a place. The
   sky returns to any given arrangement when the local sidereal time comes back round, which is
   one sidereal day later, three minutes and fifty-six seconds earlier by the clock each night.
   So the framing recurs exactly; what changes is whether the sun is far enough down and where the
   moon is. That is the whole calculation, and it is done against the app's real ephemeris rather
   than a rule of thumb: for each candidate instant, the sun's altitude and the moon's altitude,
   illuminated fraction and separation from the aim.

   Which is also why this is worth having. Scout a barn once in September and the app can tell you
   every night for the next year that the sky stands where you saw it, with the moon out of the
   way, and the sun properly down. */
function recur(rec, opts, E) {
  if (!rec || !E) return [];
  const o = opts || {};
  const lat = rec.lat, lon = rec.lon;
  if (lat == null || lon == null) return [];
  const sunMax = o.dark === 'nautical' ? -12 : o.dark === 'any' ? 90 : -18;
  const moonRule = o.moon || 'any';
  const dimMax = o.dimMax == null ? 0.2 : o.dimMax;
  const from = o.from || Date.now();
  const days = Math.max(1, Math.round(o.days || 400));

  const jd0 = E.jdFrom(new Date(rec.at));
  const lst0 = E.lstOf(jd0, lon);
  const aimAz = ((rec.az || 0) % 360 + 360) % 360;
  const aimAlt = rec.alt || 0;

  /* The aim, held fixed against the ground, is a fixed point in the sky each time the sidereal
     clock returns: converting it once to right ascension and declination is what lets the moon's
     separation from the composition be a real angle rather than a guess. The standard horizon to
     equator turn, azimuth measured from north through east. */
  const sa = Math.sin(aimAlt * D2R), ca = Math.cos(aimAlt * D2R);
  const sp = Math.sin(lat * D2R), cp = Math.cos(lat * D2R);
  const decR = Math.asin(clampN(sa * sp + ca * cp * Math.cos(aimAz * D2R), -1, 1));
  const dec = decR / D2R;
  const cd = Math.cos(decR);
  const sinH = cd < 1e-9 ? 0 : -Math.sin(aimAz * D2R) * ca / cd;
  const cosH = cd < 1e-9 ? 1 : (sa - sp * Math.sin(decR)) / (cp * cd);
  const ha = Math.atan2(clampN(sinH, -1, 1), clampN(cosH, -1, 1)) / D2R;
  const ra = norm360(lst0 - ha);

  const out = [];
  const n0 = Math.max(0, Math.ceil((from - rec.at) / SIDEREAL_MS));
  for (let n = n0; n < n0 + days; n++) {
    let t = rec.at + n * SIDEREAL_MS;
    for (let k = 0; k < 2; k++) {
      const jd = E.jdFrom(new Date(t));
      const err = ((E.lstOf(jd, lon) - lst0 + 540) % 360) - 180;
      t -= err / 360.98564736629 * 86400000;
    }
    const d = new Date(t);
    const jd = E.jdFrom(d);
    const lst = E.lstOf(jd, lon);
    const s = E.sunPos(jd), m = E.moonPos(jd);
    const sunAlt = E.eq2horiz(s.ra, s.dec, lat, lst).alt;
    const mh = E.eq2horiz(m.ra, m.dec, lat, lst);
    const frac = E.moonIllum(jd, s, m).frac;
    const sep = angSep(dec, ra, m.dec, m.ra);
    const darkOk = sunAlt <= sunMax;
    const moonOk = moonRule === 'down' ? mh.alt <= 0
      : moonRule === 'dim' ? frac <= dimMax
      : true;
    out.push({
      at: t, date: d, sunAlt, moonAlt: mh.alt, moonAz: mh.az, moonFrac: frac, moonSep: sep,
      dark: darkOk, moonOk, ok: darkOk && moonOk,
    });
  }
  return out;
}
function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
function norm360(v) { return ((v % 360) + 360) % 360; }
function angSep(d1, r1, d2, r2) {
  const a = d1 * D2R, b = d2 * D2R, dr = (r1 - r2) * D2R;
  return Math.acos(clampN(Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dr), -1, 1)) / D2R;
}

/* Walking back to the spot, months later, in the dark. Great-circle bearing and distance from
   where you are standing now to where the composition was taken. */
function walk(fromLat, fromLon, toLat, toLon) {
  const p1 = fromLat * D2R, p2 = toLat * D2R, dl = (toLon - fromLon) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const brg = norm360(Math.atan2(y, x) / D2R);
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const m = 6371008.8 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return { bearing: brg, metres: m };
}

window.NoctoComp = {
  all, put, del, get, newId,
  compose, band, stamped, thumb, toBlob,
  withExif, exifBlock,
  canShare, share, download,
  recur, walk, SIDEREAL_MS,
};
})();
