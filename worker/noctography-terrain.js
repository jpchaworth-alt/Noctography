/* Noctography terrain proxy (Cloudflare Worker).

   Some open elevation sources refuse requests from web pages (no CORS headers). This worker fetches
   them on the page's behalf and adds the headers. It only talks to the hosts listed below, passes
   Range requests through (Scout reads Cloud Optimised GeoTIFFs a window at a time), and caches
   answers at the edge for a week, so the same tile is fetched from the source once.

   Routes
     /canopy/<quadkey>.tif      Meta and WRI canopy height, 1 m, near global
     /overpass?data=<query>     OpenStreetMap buildings (Overpass API)
     /fetch?url=<encoded url>   any allowed host below, for WCS services without CORS
     /buildings/14/<x>/<y>      Overture buildings, slimmed and kept in R2 (needs the BUILDINGS binding)
     /buildings/check           open in a browser: says whether buildings are set up, and tries a tile

   Deploy: Cloudflare dashboard > Workers > Create > paste this file > Deploy. Then in the app:
     NoctoSurfaces.config({ proxy: 'https://<your-worker>.workers.dev' })
*/
const CANOPY = 'https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm/';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const ALLOW = [
  'dataforgood-fb-data.s3.amazonaws.com',
  'wcs.geonorge.no',                       // Norway, DOM and DTM
  'mapy.geoportal.gov.pl',                 // Poland, NMPT and NMT
  'ags.cuzk.cz',                           // Czechia, DMP 1G and DMR 5G
  'servicios.idee.es',                     // Spain, MDS
  'idecan1.grafcan.es',                    // Canary Islands, GRAFCAN MDS
  'geoservices.bayern.de', 'geodienste.sachsen.de', 'isk.geobasis-bb.de',
  'environment.data.gov.uk',               // England, when its answers to the page lose their CORS headers
  'dl1.lantmateriet.se',                   // Sweden, Markhöjdmodell 1 m (needs LM_USER and LM_PASS)
];
/* Hosts that want a login. The login lives in the worker's secrets, never in the page. */
const LOGINS = { 'dl1.lantmateriet.se': env => env.LM_USER && env.LM_PASS ? 'Basic ' + btoa(env.LM_USER + ':' + env.LM_PASS) : null };
const ORIGINS = ['https://noctography.net', 'https://www.noctography.net'];
/* the live site, a local copy, the design preview, and Netlify test deploys (any *.netlify.app,
   including branch and deploy previews, which are named site--branch.netlify.app) */
const allowed = o => ORIGINS.includes(o) || o.startsWith('http://localhost') || /^https:\/\/[a-z0-9-]+\.claudeusercontent\.com$/.test(o)
  || /^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.netlify\.app$/.test(o);

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, HEAD, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    let target = null, auth = null;
    if (u.pathname.startsWith('/buildings/')) return buildings(req, env, ctx, u, cors);
    if (u.pathname.startsWith('/sync/')) return sync(req, env, u, cors, origin);
    if (u.pathname.startsWith('/pair/')) return pair(req, env, u, cors, origin);
    if (u.pathname.startsWith('/canopy/')) {
      const q = u.pathname.slice(8);
      if (!/^[0-3]{6,12}\.tif$/.test(q)) return new Response('bad tile', { status: 400, headers: cors });
      target = CANOPY + q;
    } else if (u.pathname === '/overpass') {
      const data = u.searchParams.get('data') || '';
      if (!/^\[out:json\]/.test(data) || data.length > 2000) return new Response('bad query', { status: 400, headers: cors });
      for (const base of OVERPASS) {
        const r = await fetch(base + '?data=' + encodeURIComponent(data), { cf: { cacheTtl: 604800, cacheEverything: true } });
        if (r.ok) return withCors(r, cors);
      }
      return new Response('overpass busy', { status: 503, headers: cors });
    } else if (u.pathname === '/fetch') {
      try { target = new URL(u.searchParams.get('url')); } catch (e) { return new Response('bad url', { status: 400, headers: cors }); }
      if (target.protocol !== 'https:' || !ALLOW.includes(target.hostname)) return new Response('host not allowed', { status: 403, headers: cors });
      auth = LOGINS[target.hostname] ? LOGINS[target.hostname](env) : null;
      target = target.href;
    } else return new Response('not found', { status: 404, headers: cors });

    const range = req.headers.get('Range'), headers = {};
    if (range) headers.Range = range;
    if (auth) headers.Authorization = auth;
    const r = await fetch(target, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      cf: { cacheTtl: 604800, cacheEverything: true },
    });
    return withCors(r, cors);
  },
};

function withCors(r, cors) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  h.set('Cache-Control', 'public, max-age=604800');
  return new Response(r.body, { status: r.status, headers: h });
}

/* ---- buildings ----
   Overture's building tiles, one zoom-14 tile at a time. The first request for a tile reads it out
   of Overture's archive and stores it in R2; every request after that is served from R2. Pinned to
   one Overture release: move OV_RELEASE on deliberately, and the old copies can be deleted from the
   bucket. */
const OV_RELEASE = '2026-09-23.1';
const OV_URL = 'https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/' + OV_RELEASE + '/buildings.pmtiles';
const OV_KEEP = ['height', 'min_height', 'num_floors', 'class', 'subtype', 'is_underground', '@geometry_source', '@height_source'];
/* Slimming makes each tile about three times smaller but takes 15–70 ms of processing, and the
   free Workers plan allows 10 ms a request. Off, tiles are stored as Overture sends them (already
   compressed, 50–100 KB). Turn on only on the paid plan. */
const SLIM = false;
async function tileFor(z, x, y) {
  const raw = await pmGet(z, x, y);
  if (!raw) return new ArrayBuffer(0);
  if (SLIM) return gzip(slimTile(await gunzip(raw)));
  const h = new Uint8Array(raw, 0, 2);
  return h[0] === 0x1f && h[1] === 0x8b ? raw : gzip(raw);
}

async function buildings(req, env, ctx, u, cors) {
  const json = (o, s) => new Response(JSON.stringify(o, null, 2), { status: s || 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (u.pathname === '/buildings/check') {
    const out = { release: OV_RELEASE, bucket: env.BUILDINGS ? 'bound' : 'missing: add an R2 binding called BUILDINGS' };
    try {
      const t0 = Date.now(), t = await tileFor(14, 15074, 9828);
      out.test = t.byteLength ? { tile: 'Sydney 14/15074/9828', KB: Math.round(t.byteLength / 1024), slimmed: SLIM, ms: Date.now() - t0 } : 'no tile there';
      if (env.BUILDINGS && t.byteLength) { await env.BUILDINGS.put(key(14, 15074, 9828), t); out.stored = true; }
      out.ok = !!(env.BUILDINGS && t.byteLength);
    } catch (e) { out.ok = false; out.error = String(e && e.message || e); }
    return json(out, out.ok ? 200 : 500);
  }
  const m = /^\/buildings\/(1[2-4])\/(\d+)\/(\d+)$/.exec(u.pathname);
  if (!m) return json({ error: 'bad tile' }, 400);
  const z = +m[1], x = +m[2], y = +m[3], n = 1 << z;
  if (x >= n || y >= n) return json({ error: 'bad tile' }, 400);
  const hdr = { ...cors, 'Content-Type': 'application/vnd.mapbox-vector-tile', 'Cache-Control': 'public, max-age=2592000' };
  const send = body => body && body.byteLength
    ? new Response(body, { headers: { ...hdr, 'Content-Encoding': 'gzip' }, encodeBody: 'manual' })
    : new Response(null, { status: 204, headers: hdr });
  const k = key(z, x, y);
  if (env.BUILDINGS) {
    const hit = await env.BUILDINGS.get(k);
    if (hit) return send(await hit.arrayBuffer());
  }
  let slim;
  try { slim = await tileFor(z, x, y); }
  catch (e) { return json({ error: String(e && e.message || e) }, 502); }
  /* empty tiles are stored too (as nothing), so the sea is only asked about once */
  if (env.BUILDINGS) ctx.waitUntil(env.BUILDINGS.put(k, slim));
  return send(slim);
}
const key = (z, x, y) => 'ov/' + OV_RELEASE + '/' + z + '/' + x + '/' + y + '.mvt.gz';

/* A small PMTiles v3 reader: header and root directory in one read, leaf directories kept in
   memory while this copy of the worker stays warm. */
let PM = null;
const PM_DIRS = new Map();
async function rangeGet(off, len) {
  const r = await fetch(OV_URL, { headers: { Range: 'bytes=' + off + '-' + (off + len - 1) } });
  if (r.status !== 206 && r.status !== 200) throw new Error('overture ' + r.status);
  return r.arrayBuffer();
}
function rv(b, p) { let v = 0, m = 1, x; do { x = b[p.i++]; v += (x & 0x7f) * m; m *= 128; } while (x & 0x80); return v; }
const u64 = (dv, o) => dv.getUint32(o, true) + dv.getUint32(o + 4, true) * 4294967296;
async function pmHead() {
  if (PM) return PM;
  const buf = await rangeGet(0, 16384), dv = new DataView(buf);
  if (new TextDecoder().decode(new Uint8Array(buf, 0, 7)) !== 'PMTiles' || dv.getUint8(7) !== 3) throw new Error('not PMTiles v3');
  const h = { rootOff: u64(dv, 8), rootLen: u64(dv, 16), leafOff: u64(dv, 40), dataOff: u64(dv, 56), ic: dv.getUint8(97), tc: dv.getUint8(98) };
  h.root = parseDir(h.ic === 2 ? await gunzip(buf.slice(h.rootOff, h.rootOff + h.rootLen)) : buf.slice(h.rootOff, h.rootOff + h.rootLen));
  return (PM = h);
}
function parseDir(buf) {
  const b = new Uint8Array(buf), p = { i: 0 }, n = rv(b, p), e = new Array(n);
  let id = 0;
  for (let i = 0; i < n; i++) { id += rv(b, p); e[i] = { id, run: 0, len: 0, off: 0 }; }
  for (let i = 0; i < n; i++) e[i].run = rv(b, p);
  for (let i = 0; i < n; i++) e[i].len = rv(b, p);
  for (let i = 0; i < n; i++) { const v = rv(b, p); e[i].off = v === 0 && i > 0 ? e[i - 1].off + e[i - 1].len : v - 1; }
  return e;
}
function findEntry(e, id) {
  let lo = 0, hi = e.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1, c = id - e[m].id; if (c > 0) lo = m + 1; else if (c < 0) hi = m - 1; else return e[m]; }
  if (hi >= 0) { const f = e[hi]; if (f.run === 0 || id - f.id < f.run) return f; }
  return null;
}
function tileId(z, x, y) {
  let acc = 0; for (let t = 0; t < z; t++) acc += Math.pow(4, t);
  let a = z - 1, tx = x, ty = y, d = 0;
  for (let s = 1 << a; s > 0; s >>= 1) {
    const rx = tx & s, ry = ty & s;
    d += ((3 * rx) ^ ry) * (1 << a);
    if (ry === 0) { if (rx !== 0) { tx = s - 1 - tx; ty = s - 1 - ty; } const t = tx; tx = ty; ty = t; }
    a--;
  }
  return acc + d;
}
async function pmGet(z, x, y) {
  const h = await pmHead(), id = tileId(z, x, y);
  let dir = h.root;
  for (let depth = 0; depth < 4; depth++) {
    const e = findEntry(dir, id);
    if (!e) return null;
    if (e.run > 0) return rangeGet(h.dataOff + e.off, e.len);
    const k = h.leafOff + e.off;
    dir = PM_DIRS.get(k);
    if (!dir) {
      const raw = await rangeGet(k, e.len);
      dir = parseDir(h.ic === 2 ? await gunzip(raw) : raw);
      if (PM_DIRS.size > 200) PM_DIRS.delete(PM_DIRS.keys().next().value);
      PM_DIRS.set(k, dir);
    }
  }
  return null;
}
const gunzip = buf => new Response(new Response(buf).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
const gzip = buf => new Response(new Response(buf).body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();

/* Slimming, done on the raw protocol buffer so geometry is copied byte for byte: only the building
   layers, only polygons, only the properties Scout reads, and no ids or names. */
function slimTile(buf) {
  const b = new Uint8Array(buf), W = writer(), p = { i: 0 }, td = new TextDecoder();
  while (p.i < b.length) {
    const t = rv(b, p), f = t >> 3, w = t & 7;
    if (f === 3 && w === 2) { const l = rv(b, p), L = slimLayer(b.subarray(p.i, p.i + l), td); p.i += l; if (L) W.bytes(3, L); }
    else skip(b, p, w);
  }
  return W.done();
}
function slimLayer(b, td) {
  const p = { i: 0 }, feats = [], keys = [], vals = [];
  let name = '', extent = 4096, version = 2;
  while (p.i < b.length) {
    const t = rv(b, p), f = t >> 3, w = t & 7;
    if (w === 2) {
      const l = rv(b, p), s = b.subarray(p.i, p.i + l); p.i += l;
      if (f === 1) name = td.decode(s); else if (f === 2) feats.push(s); else if (f === 3) keys.push(td.decode(s)); else if (f === 4) vals.push(s);
    } else if (w === 0) { const v = rv(b, p); if (f === 5) extent = v; else if (f === 15) version = v; }
    else skip(b, p, w);
  }
  if (name !== 'building' && name !== 'building_part') return null;
  const kMap = new Map(), newKeys = [];
  keys.forEach((k, i) => { if (OV_KEEP.includes(k)) { kMap.set(i, newKeys.length); newKeys.push(k); } });
  const vMap = new Map(), newVals = [], F = [];
  for (const fb of feats) {
    const q = { i: 0 }; let type = 0, geom = null, tags = [];
    while (q.i < fb.length) {
      const t = rv(fb, q), f = t >> 3, w = t & 7;
      if (f === 3 && w === 0) type = rv(fb, q);
      else if (f === 4 && w === 2) { const l = rv(fb, q); geom = fb.subarray(q.i, q.i + l); q.i += l; }
      else if (f === 2 && w === 2) { const l = rv(fb, q), end = q.i + l; while (q.i < end) tags.push(rv(fb, q)); }
      else skip(fb, q, w);
    }
    if (type !== 3 || !geom) continue;
    const nt = [];
    for (let i = 0; i + 1 < tags.length; i += 2) {
      const nk = kMap.get(tags[i]); if (nk == null) continue;
      let nv = vMap.get(tags[i + 1]);
      if (nv == null) { nv = newVals.length; vMap.set(tags[i + 1], nv); newVals.push(vals[tags[i + 1]]); }
      nt.push(nk, nv);
    }
    const FW = writer();
    FW.packed(2, nt); FW.varint(3, 3); FW.bytes(4, geom);
    F.push(FW.done());
  }
  if (!F.length) return null;
  const LW = writer(), te = new TextEncoder();
  LW.varint(15, version); LW.bytes(1, te.encode(name));
  F.forEach(f => LW.bytes(2, f));
  newKeys.forEach(k => LW.bytes(3, te.encode(k)));
  newVals.forEach(v => LW.bytes(4, v));
  LW.varint(5, extent);
  return LW.done();
}
function skip(b, p, w) {
  if (w === 0) rv(b, p); else if (w === 1) p.i += 8; else if (w === 2) { const l = rv(b, p); p.i += l; } else if (w === 5) p.i += 4;
  else throw new Error('bad wire type ' + w);
}
function writer() {
  const parts = []; let size = 0;
  const vi = n => { const a = []; while (n > 127) { a.push((n & 127) | 128); n = Math.floor(n / 128); } a.push(n); const u = Uint8Array.from(a); parts.push(u); size += u.length; };
  const raw = u => { parts.push(u); size += u.length; };
  return {
    varint(f, v) { vi(f << 3); vi(v); },
    bytes(f, u) { vi((f << 3) | 2); vi(u.length); raw(u); },
    packed(f, arr) { if (!arr.length) return; const w = writer(); arr.forEach(v => w.raw(v)); const u = w.done(); this.bytes(f, u); },
    raw(v) { vi(v); },
    done() { const o = new Uint8Array(size); let k = 0; for (const u of parts) { o.set(u, k); k += u.length; } return o; },
  };
}
/* ---- end buildings ---- */

/* Sync between devices. Each key is one box holding an encrypted blob: the worker cannot read it,
   and knows nothing about whose it is. The box id is a hash of the key, made on the device. A write
   names the version it was based on; if another device got there first the write is refused and
   the device merges and tries again. Boxes nobody has touched for 400 days lapse on their own.
   Needs a KV namespace bound to this worker as SYNC. */
/* A device's sync key left here for ten minutes, sealed on the device with a short code, so a phone
   whose home-screen app cannot open a link can type the code instead. Collected once, then deleted. */
async function pair(req, env, u, cors, origin) {
  const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!allowed(origin)) return json({ error: 'origin' }, 403);
  if (!env.SYNC) return json({ error: 'sync is not set up on the worker' }, 503);
  const id = u.pathname.slice(6);
  if (!/^[0-9a-f]{32}$/.test(id)) return json({ error: 'bad id' }, 400);
  const k = 'pair:' + id;
  if (req.method === 'GET') { const v = await env.SYNC.get(k, 'json'); return v ? json(v) : json({ error: 'none' }, 404); }
  if (req.method === 'DELETE') { await env.SYNC.delete(k); return json({ ok: true }); }
  if (req.method === 'PUT') {
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad body' }, 400); }
    if (typeof body.data !== 'string' || body.data.length > 4096) return json({ error: 'bad data' }, 400);
    await env.SYNC.put(k, JSON.stringify({ data: body.data }), { expirationTtl: 600 });
    return json({ ok: true });
  }
  return json({ error: 'method' }, 405);
}
async function sync(req, env, u, cors, origin) {
  const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  /* typed into a browser's address bar there is no Origin at all: answer whether sync is set up,
     and nothing else, so the setup check has something to read */
  if (!origin && req.method === 'GET') return json(env.SYNC ? { ok: true, sync: 'set up' } : { ok: false, sync: 'not set up: the KV binding called SYNC is missing' }, env.SYNC ? 200 : 503);
  if (!allowed(origin)) return json({ error: 'origin', origin }, 403);
  if (!env.SYNC) return json({ error: 'sync is not set up on the worker' }, 503);
  const id = u.pathname.slice(6);
  if (!/^[0-9a-f]{32}$/.test(id)) return json({ error: 'bad id' }, 400);
  const k = 'box:' + id;
  if (req.method === 'GET') { const v = await env.SYNC.get(k, 'json'); return v ? json(v) : json({ v: 0, data: null }, 404); }
  if (req.method === 'DELETE') { await env.SYNC.delete(k); return json({ ok: true }); }
  if (req.method === 'PUT') {
    const len = +(req.headers.get('Content-Length') || 0);
    if (len > 20 * 1048576) return json({ error: 'too big' }, 413);
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad body' }, 400); }
    if (typeof body.data !== 'string' || body.data.length > 20 * 1048576) return json({ error: 'bad data' }, 400);
    const cur = await env.SYNC.get(k, 'json'), cv = cur ? cur.v : 0;
    if ((body.v || 0) !== cv) return json(cur || { v: 0, data: null }, 409);
    const next = { v: cv + 1, data: body.data, at: Date.now() };
    await env.SYNC.put(k, JSON.stringify(next), { expirationTtl: 400 * 86400 });
    return json({ v: next.v, at: next.at });
  }
  return json({ error: 'method' }, 405);
}
