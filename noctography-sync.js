/* Noctography: sync between devices, with no account.
   ------------------------------------------------------------------------------------------
   A private key made on the first device, and carried to others by a link or a QR code. Everything
   is encrypted on the device with that key before it leaves (AES-GCM), and the box on the server
   is found by a hash of it, so the server holds nothing it can read and nothing that says whose
   it is. Any number of devices can hold the key.

   What travels: compositions and plans (with their small picture, not the full one), saved places
   and Scout's recent places, the kit, the night log, aurora notes, and the choices that belong to
   the person rather than the device (colour scheme, weather models, Scout's hand, Live contrast,
   H-alpha). Records merge one by one on their id, the latest edit winning; a deletion is
   remembered, so it stays deleted everywhere. Not synced: what belongs to one device (its layout,
   night vision, its offline ground, its location). */
(function () {
if (window.NoctoSync) return;
const ENDPOINT = 'https://noctography-terrain.jpchaworth.workers.dev/sync/';
const KEY = 'noctography.sync.key', GONE = 'noctography.sync.gone', STAT = 'noctography.sync.status';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const b64url = u => b64(u).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

function key() { try { const k = localStorage.getItem(KEY); return k && /^[A-Za-z0-9_-]{30,60}$/.test(k) ? k : null; } catch (e) { return null; } }
function setKey(k) { try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch (e) {} }
function freshKey() { const u = new Uint8Array(32); crypto.getRandomValues(u); return b64url(u); }
async function derive(k) {
  const h = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  const idB = await h('noctography-sync-id:' + k), kB = await h('noctography-sync-key:' + k);
  return { id: Array.from(idB.slice(0, 16), x => x.toString(16).padStart(2, '0')).join(''),
    aes: await crypto.subtle.importKey('raw', kB, 'AES-GCM', false, ['encrypt', 'decrypt']) };
}
async function squeeze(bytes, how) {
  if (!window.CompressionStream) return bytes;
  const s = new Blob([bytes]).stream().pipeThrough(how === 'in' ? new CompressionStream('gzip') : new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function seal(obj, aes) {
  const z = await squeeze(enc.encode(JSON.stringify(obj)), 'in'), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, z));
  const out = new Uint8Array(13 + ct.length); out[0] = window.CompressionStream ? 1 : 0; out.set(iv, 1); out.set(ct, 13);
  return b64(out);
}
async function open(s, aes) {
  const u = unb64(s), iv = u.slice(1, 13);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aes, u.slice(13)));
  return JSON.parse(dec.decode(u[0] ? await squeeze(pt, 'out') : pt));
}

/* ---- compositions: every save is stamped, every delete remembered ---- */
let C = null, rawPut = null, rawDel = null;
function hook() {
  const N = window.NoctoComp; if (!N || N.__synced) return !!N;
  C = N; rawPut = N.put; rawDel = N.del; N.__synced = true;
  N.put = rec => { if (rec && !rec.__sync) rec.upd = Date.now(); if (rec) delete rec.__sync; return rawPut(rec).then(r => { soon(); return r; }); };
  N.del = id => { const g = read(GONE, {}); g[id] = Date.now(); write(GONE, g); return rawDel(id).then(r => { soon(); return r; }); };
  return true;
}
/* ---- settings: whole values, the latest change on any device winning ----
   Each change made here is stamped as it is written, so a merge can tell which side is newer. */
const PREFS = ['nocto-kit-v1', 'noctography.palette', 'noctography.wxModels', 'noctography.wxCompare', 'noctography.hand',
  'noctography.liveCon', 'noctography.ground', 'noctography.arHa'];
const STAMPS = 'noctography.sync.stamps', FAVBASE = 'noctography.sync.favBase', FAVGONE = 'noctography.sync.favGone';
const LISTS = ['noctography.favs', 'nocto.log.v1', 'nocto-sightings-v1'];
let rawSet = null;
(function stampWrites(){
  try {
    const P = Storage.prototype; if (P.__noctoSync) return; rawSet = P.setItem;
    P.setItem = function (k, v) {
      rawSet.call(this, k, v);
      if (this === window.localStorage && k === 'nocto.log.v1') logTrack(v);
      if (this === window.localStorage && (PREFS.includes(k) || LISTS.includes(k))) {
        try { const st = JSON.parse(localStorage.getItem(STAMPS) || '{}'); st[k] = Date.now(); rawSet.call(this, STAMPS, JSON.stringify(st)); } catch (e) {}
        if (key()) soon();
      }
    };
    P.__noctoSync = true;
  } catch (e) {}
})();
/* the night log has no edit times of its own, so each night's content is fingerprinted as it is
   written: a night whose fingerprint changed was edited here, then; one that vanished was deleted */
const LOGH = 'noctography.sync.logHash', LOGS = 'noctography.sync.logStamps', LOGGONE = 'noctography.sync.logGone';
const fp = o => { const t = JSON.stringify(o) || ''; let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + t.length; };
function logTrack(raw, at) {
  let db = null; try { db = JSON.parse(raw); } catch (e) {} if (!db || !db.nights) return;
  const prev = read(LOGH, null), st = read(LOGS, {}), gone = read(LOGGONE, {}), now = {}, t = at || Date.now();
  Object.keys(db.nights).forEach(k => { now[k] = fp(db.nights[k]); if (prev && prev[k] !== now[k] && !at) st[k] = t; if (!prev && !st[k]) st[k] = 0; });
  if (prev && !at) Object.keys(prev).forEach(k => { if (!now[k]) gone[k] = t; });
  write(LOGH, now); write(LOGS, st); write(LOGGONE, gone);
}
const rawWrite = (k, v) => { try { (rawSet || Storage.prototype.setItem).call(localStorage, k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} };
const rawGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const stamps = () => read(STAMPS, {});
/* a saved place taken off here is remembered as gone, by comparing with what was there last sync */
function favGone() {
  const base = read(FAVBASE, null), now = new Set(read('noctography.favs', []).map(placeId).filter(Boolean)), g = read(FAVGONE, {});
  if (Array.isArray(base)) base.forEach(id => { if (!now.has(id) && !g[id]) g[id] = Date.now(); });
  now.forEach(id => { if (g[id] && stamps()['noctography.favs'] > g[id]) delete g[id]; });
  write(FAVGONE, g); return g;
}
const stamp = r => r.upd || r.cap || r.at || 0;
const blobB64 = b => b ? b.arrayBuffer().then(a => b64(a)) : Promise.resolve(null);
const toBlob = s => s ? new Blob([unb64(s)], { type: 'image/jpeg' }) : null;
const placeId = v => v && v.lat != null ? (+v.lat).toFixed(4) + ',' + (+v.lon).toFixed(4) : null;
function unionPlaces(a, b, cap) {
  const seen = new Set(), out = [];
  (a || []).concat(b || []).forEach(v => { const id = placeId(v); if (!id || seen.has(id)) return; seen.add(id); out.push(v); });
  return cap ? out.slice(0, cap) : out;
}

async function snapshot() {
  const list = C ? await C.all() : [];
  const comps = await Promise.all(list.map(async r => { const o = {}; Object.keys(r).forEach(k => { if (k !== 'img' && k !== 'thumb') o[k] = r[k]; }); o.thumb64 = await blobB64(r.thumb); return o; }));
  const prefs = {}, st = stamps();
  PREFS.forEach(k => { const v = rawGet(k); if (v != null) prefs[k] = { v, at: st[k] || 0 }; });
  return { fmt: 2, comps, gone: read(GONE, {}), favs: read('noctography.favs', []), favGone: favGone(), recent: read('noctography.scout.recent', []),
    prefs, log: read('nocto.log.v1', null), logStamps: read(LOGS, {}), logGone: read(LOGGONE, {}), notes: read('nocto-sightings-v1', []) };
}
async function merge(remote) {
  let changed = 0;
  const gone = Object.assign({}, remote.gone || {}), mine = read(GONE, {});
  Object.keys(mine).forEach(id => { gone[id] = Math.max(gone[id] || 0, mine[id]); });
  /* a year of remembered deletions is plenty */
  Object.keys(gone).forEach(id => { if (Date.now() - gone[id] > 365 * 86400000) delete gone[id]; });
  write(GONE, gone);
  if (C) {
    const here = new Map((await C.all()).map(r => [r.id, r]));
    for (const r of remote.comps || []) {
      if (!r || !r.id || (gone[r.id] && gone[r.id] >= stamp(r))) continue;
      const l = here.get(r.id);
      if (l && stamp(l) >= stamp(r)) continue;
      const rec = Object.assign({}, r); delete rec.thumb64;
      rec.thumb = toBlob(r.thumb64) || (l && l.thumb) || null;
      rec.img = (l && l.img) || rec.thumb;
      rec.__sync = true; await rawPut(rec); delete rec.__sync; changed++;
    }
    for (const [id, l] of here) if (gone[id] && gone[id] >= stamp(l)) { await rawDel(id); changed++; }
  }
  /* saved places: both sides' lists, less any either side has taken off */
  const fg = Object.assign({}, remote.favGone || {}), mg = favGone();
  Object.keys(mg).forEach(id => { fg[id] = Math.max(fg[id] || 0, mg[id]); });
  Object.keys(fg).forEach(id => { if (Date.now() - fg[id] > 365 * 86400000) delete fg[id]; });
  write(FAVGONE, fg);
  const was = read('noctography.favs', []);
  const lst = stamps()['noctography.favs'] || 0, mineIds = new Set(was.map(placeId));
  /* put back here after it was taken off elsewhere: the later of the two wins */
  Object.keys(fg).forEach(id => { if (mineIds.has(id) && lst > fg[id]) delete fg[id]; }); write(FAVGONE, fg);
  const favs = unionPlaces(was, remote.favs).filter(v => !fg[placeId(v)]);
  if (JSON.stringify(favs.map(placeId)) !== JSON.stringify(was.map(placeId))) { rawWrite('noctography.favs', favs); changed++; }
  write(FAVBASE, favs.map(placeId).filter(Boolean));
  const rec = unionPlaces(read('noctography.scout.recent', []), remote.recent, 12);
  rawWrite('noctography.scout.recent', rec);
  /* settings: the newer side wins, key by key */
  const st = stamps();
  Object.keys(remote.prefs || {}).forEach(k => {
    if (!PREFS.includes(k)) return; const r = remote.prefs[k]; if (!r || r.v == null) return;
    if ((r.at || 0) > (st[k] || 0) && rawGet(k) !== r.v) { rawWrite(k, r.v); st[k] = r.at; changed++; }
  });
  rawWrite(STAMPS, st);
  /* the night log: every night from both, and where both have a night, the one edited last */
  if (remote.log && remote.log.nights) {
    if (!read(LOGH, null)) logTrack(rawGet('nocto.log.v1') || '{"nights":{}}', 1);
    const cur = read('nocto.log.v1', null) || { nights: {}, exportedAt: 0, sinceExport: 0 }; if (!cur.nights) cur.nights = {};
    const ls = read(LOGS, {}), lg = read(LOGGONE, {}), rs = remote.logStamps || {}, rg = remote.logGone || {};
    let n = 0;
    Object.keys(remote.log.nights).forEach(k => { const r = remote.log.nights[k], l = cur.nights[k], rt = rs[k] || 0, lt = ls[k] || 0;
      if (lg[k] && lg[k] >= rt) return;
      if (!l || (rt > lt && fp(r) !== fp(l))) { cur.nights[k] = r; ls[k] = rt; n++; } });
    Object.keys(rg).forEach(k => { if (cur.nights[k] && rg[k] > (ls[k] || 0)) { delete cur.nights[k]; lg[k] = rg[k]; n++; } });
    write(LOGS, ls); write(LOGGONE, lg);
    if (n) { rawWrite('nocto.log.v1', cur); logTrack(JSON.stringify(cur), 1); changed += n; }
  }
  /* aurora notes: everything from both, one each */
  if (Array.isArray(remote.notes) && remote.notes.length) {
    const cur = read('nocto-sightings-v1', []), seen = new Set(cur.map(x => x && x.at)); let n = 0;
    remote.notes.forEach(x => { if (x && x.at && !seen.has(x.at)) { cur.push(x); seen.add(x.at); n++; } });
    if (n) { cur.sort((a, b) => (a.at > b.at ? 1 : -1)); rawWrite('nocto-sightings-v1', cur); changed += n; }
  }
  return changed;
}

let busy = false, again = false, timer = 0;
const say = (o) => { const s = Object.assign(read(STAT, {}), o); write(STAT, s); window.dispatchEvent(new CustomEvent('nocto-sync', { detail: s })); };
async function run() {
  const k = key(); if (!k || !hook()) return;
  if (busy) { again = true; return; }
  busy = true; say({ state: 'syncing' });
  try {
    const { id, aes } = await derive(k);
    for (let tries = 0; tries < 4; tries++) {
      let r;
      /* a blocked or unreachable service shows as a bare network error: say which it probably is */
      try { r = await fetch(ENDPOINT + id, { cache: 'no-store' }); }
      catch (e) { throw new Error(navigator.onLine === false ? 'there is no connection' : 'the sync service could not be reached from this web address'); }
      let v = 0, changed = 0;
      if (r.ok) { const j = await r.json(); v = j.v || 0; if (j.data) changed = await merge(await open(j.data, aes)); }
      else if (r.status !== 404) throw new Error(r.status === 503 ? 'the sync service is not set up yet' : r.status === 403 ? 'the sync service does not accept this web address yet' : 'the sync service said ' + r.status);
      const body = JSON.stringify({ v, data: await seal(await snapshot(), aes) });
      const p = await fetch(ENDPOINT + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      if (p.status === 409) continue;
      if (!p.ok) throw new Error(p.status === 413 ? 'there is too much to sync' : 'the sync service said ' + p.status);
      const n = C ? (await C.all()).length : 0;
      say({ state: 'ok', at: Date.now(), count: n, err: '', changed });
      break;
    }
  } catch (e) { say({ state: 'error', err: (e && e.message) || 'could not reach the sync service' }); }
  busy = false;
  if (again) { again = false; soon(); }
}
function soon() { if (!key()) return; clearTimeout(timer); timer = setTimeout(run, 3500); }

/* ---- linking ---- */
function linkUrl() {
  const k = key(); if (!k) return '';
  const p = location.pathname, base = /\/(scout|app)\/?(index\.html|desktop\.html)?$/.test(p) ? p.replace(/(scout|app)\/?(index\.html|desktop\.html)?$/, 'app/') : p;
  return location.origin + base + '?link=' + k;
}
function fromLink() {
  const m = location.search.match(/[?&]link=([A-Za-z0-9_-]{30,60})/); if (!m) return false;
  setKey(m[1]);
  const rest = location.search.replace(/[?&]link=[^&]+/, '').replace(/^&/, '?');
  history.replaceState(null, '', location.pathname + (rest === '?' ? '' : rest) + location.hash);
  say({ linked: Date.now() });
  return true;
}
async function start() { const k = freshKey(); setKey(k); await run(); return k; }
function stop() { setKey(null); write(STAT, {}); say({ state: 'off' }); }
/* a new key cuts off every device that is not re-linked: the old box is emptied */
async function rekey() {
  const old = key(); if (!old) return start();
  try { const { id } = await derive(old); await fetch(ENDPOINT + id, { method: 'DELETE' }); } catch (e) {}
  return start();
}
/* ---- a code to type ----
   On iPhone a scanned link always opens in Safari, and a home-screen app keeps its own storage apart
   from Safari's, so the link cannot reach it. A short code can: the device that is already syncing
   leaves its key with the sync service for ten minutes, sealed with the code, and the other device
   types the code to collect it. Used once, then gone. */
const PAIR = ENDPOINT.replace(/\/sync\/$/, '/pair/');
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
async function pairOffer() {
  if (!key()) await start();
  const u = crypto.getRandomValues(new Uint8Array(8)); let c = ''; for (const b of u) c += ABC[b % ABC.length];
  const { id, aes } = await derive('pair:' + c);
  const r = await fetch(PAIR + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: await seal({ k: key() }, aes) }) });
  if (!r.ok) throw new Error(r.status === 404 ? 'the sync service needs updating for codes' : 'the sync service said ' + r.status);
  return c.slice(0, 4) + '-' + c.slice(4);
}
async function pairAccept(code) {
  const c = normCode(code); if (c.length !== 8) throw new Error('A code is eight letters and numbers.');
  const { id, aes } = await derive('pair:' + c);
  let r; try { r = await fetch(PAIR + id, { cache: 'no-store' }); } catch (e) { throw new Error('The sync service could not be reached.'); }
  if (r.status === 404) throw new Error('That code is not right, or its ten minutes are up. Make a new one on the other device.');
  if (!r.ok) throw new Error('The sync service said ' + r.status + '.');
  const j = await r.json(); let k = null;
  try { k = (await open(j.data, aes)).k; } catch (e) { throw new Error('That code is not right.'); }
  if (!k || !/^[A-Za-z0-9_-]{30,60}$/.test(k)) throw new Error('That code is not right.');
  setKey(k); say({ linked: Date.now() });
  fetch(PAIR + id, { method: 'DELETE' }).catch(() => {});
  await run();
  return true;
}
let qrLib = null;
function qr(text) {
  const make = () => { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + 2) + ' ' + (r + 2) + 'h1v1h-1z';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 4) + ' ' + (n + 4) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#E8C98A"/><path d="' + d + '" fill="#0A0A0B"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); };
  if (window.qrcode) return Promise.resolve(make());
  qrLib = qrLib || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return qrLib.then(make);
}
function status() { return Object.assign({ on: !!key() }, read(STAT, {})); }

fromLink();
const boot = () => { if (!hook()) { setTimeout(boot, 300); return; } if (key()) run(); };
boot();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
setInterval(() => { if (document.visibilityState === 'visible' && key()) run(); }, 5 * 60000);

window.NoctoSync = { run, soon, start, stop, rekey, status, linkUrl, qr, pairOffer, pairAccept, on: () => !!key() };
})();
