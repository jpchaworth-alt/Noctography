/* Noctography: real terrain horizons.
   ------------------------------------------------------------------------------------------
   The rest of the app assumes the horizon is a great circle at 0 degrees. That is wrong nearly
   everywhere, and the size of the error runs from a couple of degrees of hedgerow on the fens to
   thirty or more from a valley floor. This module works out the real skyline for one place, on the
   device, from open elevation data, and hands back a lookup of altitude by azimuth.

   What it deliberately does not do is touch sky brightness. Terrain changes what you can see, not
   how bright the sky is: the air column doing the scattering sits ten kilometres up and is lit
   whether or not a ridge shades the ground. So nothing here feeds real-world Bortle, the darkness
   window or the moon interference term. It feeds line of sight only.

   Two layers make up a horizon. The ground, from the elevation model, which is bare earth and
   knows nothing of trees, hedges or barns. And what the user tells us is in the way, which on flat
   ground is the entire horizon and the part that matters most. The effective horizon is the higher
   of the two at each azimuth, and the interface has to keep saying which is which.

   Data: AWS Terrain Tiles, Terrarium-encoded PNG, an AWS Open Data set with no key and no account.
   Global, including bathymetry, roughly 30 m where good national sources exist and interpolated
   from coarser data elsewhere, so a profile is not equally precise everywhere and should never be
   presented as though it were. Attribution varies by country and lives in the credits screen.
   ------------------------------------------------------------------------------------------ */
"use strict";
(function () {
if (window.NoctoTerrain) return;

const TILE_BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const TILE_PX = 256;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const R_EARTH = 6371000;
/* Sightlines bend back down, so the conventional dodge is an effective radius of 7/6 R. Without
   it, and without the curvature drop itself, the cast invents distant horizons that are not
   there: at 100 km, ground has to stand 673 m above eye height merely to reach 0 degrees. */
const R_EFF = R_EARTH * 7 / 6;
const EYE_M = 1.6;

/* Three rings, because angular precision matters near you and coverage matters far away. The ring
   is specified in metres per pixel rather than by zoom level, because a Web Mercator tile covers
   less ground as you go poleward: the same named zoom that costs 50 tiles at the equator costs
   several hundred at 68 degrees, for detail the cast cannot use. Resolving zoom from a resolution
   target gives the equator z13, z11 and z8, which is what this was originally specified as, and
   drops a level or two in the far north where the ground shrinks to fit.

   Targets: 30 m near you, where half a degree of azimuth is only a few tens of metres of arc; 120 m
   through the local relief; 700 m for distant peaks, which only have to catch things over 2 km
   tall. Going finer than the underlying 30 m data buys bandwidth and nothing else. */
const RING_SPECS = [
  { from: 0,     to: 5000,   targetM: 30,  minStep: 20,  maxStep: 40,  bilinear: true },
  { from: 5000,  to: 30000,  targetM: 120, minStep: 50,  maxStep: 150, bilinear: false },
  { from: 30000, to: 150000, targetM: 700, minStep: 200, maxStep: 500, bilinear: false },
];
const MAX_Z = 13;   // the data is 30 m: z13 is already oversampled

function ringsFor(lat){
  const base = 156543.03392 * Math.cos(lat * D2R);
  return RING_SPECS.map(s => {
    const z = Math.max(4, Math.min(MAX_Z, Math.ceil(Math.log2(base / s.targetM))));
    const mPerPx = base / Math.pow(2, z);
    return { z, mPerPx, from: s.from, to: s.to, bilinear: s.bilinear,
      step: Math.max(s.minStep, Math.min(s.maxStep, Math.round(mPerPx))) };
  });
}

/* The cast starts out here rather than at the site. Inside 50 m the elevation model is describing
   the ground you are standing on, not a horizon, and everything that actually blocks the view at
   that range is vegetation or masonry the model cannot see. The obstruction layer owns it. */
const START_M = 50;
const RAYS = 720;                 // half-degree steps
const RANGE_M = 150000;
const BYTES_PER_TILE = 62000;     // measured across a spread of tiles, for the size warning

/* ---------------- tile arithmetic ---------------- */
function lonToX(lon, z){ return (lon + 180) / 360 * Math.pow(2, z); }
function latToY(lat, z){
  const s = Math.min(85.0511, Math.max(-85.0511, lat)) * D2R;
  return (1 - Math.log(Math.tan(s) + 1 / Math.cos(s)) / Math.PI) / 2 * Math.pow(2, z);
}
/* Great-circle destination. An equirectangular shortcut is tempting and wrong at high latitude:
   over 150 km at 68 degrees the longitude scale changes by 8 per cent across the span, which puts
   a mountain a dozen kilometres from where it is. */
function destPoint(lat, lon, azDeg, distM){
  const d = distM / R_EARTH, br = azDeg * D2R;
  const la = lat * D2R, lo = lon * D2R;
  const sinLa = Math.sin(la), cosLa = Math.cos(la), sinD = Math.sin(d), cosD = Math.cos(d);
  const la2 = Math.asin(sinLa * cosD + cosLa * sinD * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * sinD * cosLa, cosD - sinLa * Math.sin(la2));
  return [la2 * R2D, ((lo2 * R2D + 540) % 360) - 180];
}

/* ---------------- what to fetch ----------------
   The tile set is found by walking exactly the loop the cast walks, collecting the tile each
   sample lands in. Predicting the set from the geometry instead was the first version and it was
   subtly short at the ring boundaries, which showed up as a cast that could see the ground for
   five kilometres and nothing beyond it. Deriving it from the cast cannot be short by
   construction, and the walk is arithmetic only: no lookups, a couple of hundred milliseconds. */
function ringFor(rings, d){
  for (const r of rings) if (d >= r.from && d <= r.to) return r;
  return rings[rings.length - 1];
}
function castKeys(lat, lon, rings){
  const keys = new Set();
  for (let i = 0; i < RAYS; i++) {
    const az = i * 360 / RAYS;
    let d = START_M;
    while (d <= RANGE_M) {
      const ring = ringFor(rings, d);
      const p = destPoint(lat, lon, az, d);
      const n = Math.pow(2, ring.z);
      let x = Math.floor(lonToX(p[1], ring.z)); x = ((x % n) + n) % n;
      const y = Math.min(n - 1, Math.max(0, Math.floor(latToY(p[0], ring.z))));
      keys.add(ring.z + '/' + x + '/' + y);
      /* the bilinear read on the inner ring can touch the next pixel, and at a tile edge that is
         the next tile, so its eastern and southern neighbours are wanted too */
      if (ring.bilinear) {
        keys.add(ring.z + '/' + (((x + 1) % n) + n) % n + '/' + y);
        keys.add(ring.z + '/' + x + '/' + Math.min(n - 1, y + 1));
      }
      d += ring.step;
    }
  }
  keys.add(rings[0].z + '/' + Math.floor(lonToX(lon, rings[0].z)) + '/' + Math.floor(latToY(lat, rings[0].z)));
  return [...keys].map(k => { const [z, x, y] = k.split('/').map(Number); return { z, x, y }; });
}

function plan(lat, lon){
  const rings = ringsFor(lat);
  const tiles = castKeys(lat, lon, rings);
  return { tiles, rings, count: tiles.length, bytes: tiles.length * BYTES_PER_TILE };
}

/* A sentence for the button, because a few megabytes on mobile data is the user's business. */
function sizeLine(lat, lon){
  const p = plan(lat, lon);
  const mb = p.bytes / 1048576;
  return { count: p.count, bytes: p.bytes,
    line: 'About ' + (mb < 1 ? Math.round(p.bytes / 1024) + ' kB' : mb.toFixed(1) + ' MB') +
      ' of elevation data, fetched once. After that this site works offline for good.' };
}

/* ---------------- fetch and decode ---------------- */
const mem = new Map();   // z/x/y -> Int16Array(TILE_PX * TILE_PX)

async function fetchTile(t){
  const key = t.z + '/' + t.x + '/' + t.y;
  if (mem.has(key)) return mem.get(key);
  const r = await fetch(TILE_BASE + key + '.png');
  if (!r.ok) throw new Error('tile ' + key + ' HTTP ' + r.status);
  const bm = await createImageBitmap(await r.blob());
  /* Width and height are read before the bitmap is closed. Closing it first sets both to zero,
     which produced an empty height grid and a cast that could see nothing at all: an hour of
     looking in the wrong place, recorded here so nobody repeats it. */
  const w = bm.width, h = bm.height;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bm, 0, 0);
  const px = cx.getImageData(0, 0, w, h).data;
  if (bm.close) bm.close();
  const out = new Int16Array(w * h);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    /* Terrarium: 16 bits of integer and 8 of fraction, offset by 32768 so everything is positive.
       Negative values are bathymetry or a genuine depression; either way the horizon is made by
       the water surface or by ground a few metres down, so the floor is sea level. Rounding to a
       metre is well inside the accuracy of the data. */
    const e = (px[p] * 256 + px[p + 1] + px[p + 2] / 256) - 32768;
    out[i] = e < 0 ? 0 : Math.round(e);
  }
  if (w !== TILE_PX) out.tileW = w;
  mem.set(key, out);
  return out;
}

/* The ground height at one point, for the pin readout. One tile off the inner ring, which is
   the same 30 m data the skyline cast uses, sampled bilinearly so dragging the pin across a slope
   gives a height that moves rather than a staircase. Answers are remembered per spot: the tile
   cache is emptied after a skyline read, and re-reading a place you have already asked about
   should not cost a fetch. */
const groundMem = new Map();
async function groundAt(lat, lon){
  if (lat == null || lon == null) return null;
  const key = lat.toFixed(5) + ',' + lon.toFixed(5);
  if (groundMem.has(key)) return groundMem.get(key);
  const ring = ringsFor(lat)[0];
  const fx = lonToX(lon, ring.z), fy = latToY(lat, ring.z);
  let out = null;
  try {
    const grid = await fetchTile({ z: ring.z, x: Math.floor(fx), y: Math.floor(fy) });
    const W = Math.round(Math.sqrt(grid.length));
    const px = (fx - Math.floor(fx)) * W, py = (fy - Math.floor(fy)) * W;
    const x0 = Math.min(W - 1, Math.floor(px)), y0 = Math.min(W - 1, Math.floor(py));
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(W - 1, y0 + 1);
    const dx = px - x0, dy = py - y0;
    const a = grid[y0 * W + x0], b = grid[y0 * W + x1], c = grid[y1 * W + x0], d = grid[y1 * W + x1];
    const v = (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + d * dx) * dy;
    if (isFinite(v)) out = v;
  } catch (e) { out = null; }
  groundMem.set(key, out);
  return out;
}

async function fetchAll(list, onProgress){
  const jobs = list.slice();
  let done = 0, failed = 0;
  const LANES = 6;   // polite, and enough to saturate a phone connection
  const next = async () => {
    while (jobs.length) {
      const t = jobs.shift();
      try { await fetchTile(t); } catch (e) { failed++; }
      done++;
      if (onProgress) onProgress(done, done + jobs.length, failed);
    }
  };
  await Promise.all(Array.from({ length: LANES }, next));
  return { failed };
}

/* ---------------- the cast ----------------
   In a worker: 720 rays by about a thousand samples each is a million lookups, which is a fifth of
   a second of arithmetic and long enough to drop frames on a phone if it runs on the main thread.
   The worker is built from a string so there is no extra file to keep in step. The tile grids are
   cloned rather than transferred: transferring detaches the originals, and a detached view reads as
   a zero-length array with no error anywhere, which is a long afternoon nobody needs twice. */
const WORKER_SRC = `
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const R_EARTH = ${R_EARTH}, R_EFF = ${R_EFF}, TILE_PX = ${TILE_PX};
function lonToX(lon, z){ return (lon + 180) / 360 * Math.pow(2, z); }
function latToY(lat, z){
  const s = Math.min(85.0511, Math.max(-85.0511, lat)) * D2R;
  return (1 - Math.log(Math.tan(s) + 1 / Math.cos(s)) / Math.PI) / 2 * Math.pow(2, z);
}
function destPoint(lat, lon, azDeg, distM){
  const d = distM / R_EARTH, br = azDeg * D2R;
  const la = lat * D2R, lo = lon * D2R;
  const sinLa = Math.sin(la), cosLa = Math.cos(la), sinD = Math.sin(d), cosD = Math.cos(d);
  const la2 = Math.asin(sinLa * cosD + cosLa * sinD * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * sinD * cosLa, cosD - sinLa * Math.sin(la2));
  return [la2 * R2D, ((lo2 * R2D + 540) % 360) - 180];
}
let TILES = null, RINGS = null;
const MISSING = new Set();   // kept, capped: a cast that finds no tiles should be able to say why
function sample(lat, lon, ring){
  const fx = lonToX(lon, ring.z), fy = latToY(lat, ring.z);
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const key = ring.z + '/' + tx + '/' + ty;
  const grid = TILES[key];
  if (!grid) { if (MISSING.size < 6) MISSING.add(key); return null; }
  const px = (fx - tx) * TILE_PX, py = (fy - ty) * TILE_PX;
  const W = Math.round(Math.sqrt(grid.length));   // 256 normally, but never assumed
  if (!ring.bilinear) {
    const i = Math.min(W - 1, Math.floor(py / TILE_PX * W)) * W + Math.min(W - 1, Math.floor(px / TILE_PX * W));
    const v = grid[i];
    return isFinite(v) ? v : null;
  }
  const gx = px / TILE_PX * W, gy = py / TILE_PX * W;
  const x0 = Math.min(W - 1, Math.floor(gx)), y0 = Math.min(W - 1, Math.floor(gy));
  const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(W - 1, y0 + 1);
  const dx = gx - x0, dy = gy - y0;
  const a = grid[y0 * W + x0], b = grid[y0 * W + x1];
  const c = grid[y1 * W + x0], d = grid[y1 * W + x1];
  if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d)) return null;
  return (a * (1 - dx) + b * dx) * (1 - dy) + (c * (1 - dx) + d * dx) * dy;
}
function ringForW(d){
  for (const r of RINGS) if (d >= r.from && d <= r.to) return r;
  return RINGS[RINGS.length - 1];
}
self.onmessage = e => {
  const m = e.data;
  TILES = m.tiles; RINGS = m.rings;
  const alt = new Int16Array(m.rays);
  const far = new Float32Array(m.rays);
  const h0 = m.h0;
  let hit = 0, miss = 0, high = -1e9;
  const keys = Object.keys(TILES).length;
  for (let i = 0; i < m.rays; i++) {
    const az = i * 360 / m.rays;
    let best = -90, bestD = 0;
    let d = m.start;
    while (d <= m.range) {
      const ring = ringForW(d);
      const p = destPoint(m.lat, m.lon, az, d);
      const h = sample(p[0], p[1], ring);
      if (h != null) { hit++; if (h > high) high = h;
        const drop = d * d / (2 * R_EFF);
        const a = Math.atan2(h - h0 - drop, d) * R2D;
        if (a > best) { best = a; bestD = d; }
      }
      else miss++;
      d += ring.step;
    }
    /* Hundredths of a degree, and negatives kept: from a clifftop the sea horizon sits below zero,
       about three hundredths of a degree down per metre of eye height, and clamping at zero would
       quietly delete that. */
    alt[i] = Math.max(-9000, Math.min(9000, Math.round(best * 100)));
    far[i] = bestD;
  }
  self.postMessage({ alt, far, diag: { hit, miss, tiles: keys, highestM: high, h0, missingKeys: [...MISSING] } }, [alt.buffer, far.buffer]);
};
`;

function runCast(msg){
  return new Promise((res, rej) => {
    let w;
    try { w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))); }
    catch (e) { return rej(e); }
    w.onmessage = ev => { res(ev.data); w.terminate(); };
    w.onerror = ev => { rej(new Error(ev.message || 'terrain worker failed')); w.terminate(); };
    w.postMessage(msg);
  });
}

/* ---------------- the profile ---------------- */
async function profileFor(lat, lon, opts){
  opts = opts || {};
  const p = plan(lat, lon);
  const res = await fetchAll(p.tiles, opts.onProgress);

  const tiles = {};
  p.tiles.forEach(t => {
    const key = t.z + '/' + t.x + '/' + t.y;
    const grid = mem.get(key);
    if (grid) tiles[key] = grid;
  });
  if (!Object.keys(tiles).length) throw new Error('no elevation tiles');

  /* Eye height above the ground the model gives for the site itself. Not clamped at sea level: a
     site genuinely below it, on a polder or a dry lake, is a real place to stand. */
  const inner = p.rings[0];
  const fx = lonToX(lon, inner.z), fy = latToY(lat, inner.z);
  const siteGrid = tiles[inner.z + '/' + Math.floor(fx) + '/' + Math.floor(fy)];
  let ground = 0;
  if (siteGrid && siteGrid.length) {
    const px = Math.min(TILE_PX - 1, Math.floor((fx - Math.floor(fx)) * TILE_PX));
    const py = Math.min(TILE_PX - 1, Math.floor((fy - Math.floor(fy)) * TILE_PX));
    const g = siteGrid[py * TILE_PX + px];
    if (isFinite(g)) ground = g;
  }

  const out = await runCast({
    tiles, rings: p.rings, lat, lon, h0: ground + EYE_M,
    rays: RAYS, start: START_M, range: RANGE_M,
  });
  mem.clear();   // tiles are only needed at compute time: the profile is what gets kept

  return {
    alt: out.alt, dist: out.far,
    origin: { lat, lon }, ground, at: Date.now(),
    tiles: p.count, missing: res.failed, diag: out.diag,
    v: 1,
  };
}

/* ---------------- lookups ---------------- */
/* Interpolated, because 0.5 degree steps read as a staircase against a smooth altitude track and
   a terrain rise time would jump half a degree at a time. */
function altAt(profile, azDeg){
  if (!profile || !profile.alt || !profile.alt.length) return 0;
  const n = profile.alt.length;
  const f = (((azDeg % 360) + 360) % 360) / 360 * n;
  const i = Math.floor(f), j = (i + 1) % n, t = f - i;
  return (profile.alt[i % n] * (1 - t) + profile.alt[j] * t) / 100;
}
function distAt(profile, azDeg){
  if (!profile || !profile.dist || !profile.dist.length) return null;
  const n = profile.dist.length;
  const i = Math.round((((azDeg % 360) + 360) % 360) / 360 * n) % n;
  return profile.dist[i];
}

/* ---------------- what the user tells us is in the way ----------------
   Eight compass sectors, plus an all-round value for the common case of "trees everywhere, about
   eight degrees". A sector reads as a plateau with a soft edge, because a treeline does not stop
   dead at a compass point. */
const SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function sectorAlt(obs, azDeg){
  if (!obs) return 0;
  const all = obs.all || 0;
  if (!obs.sectors) return all;
  const az = (((azDeg % 360) + 360) % 360);
  const f = az / 45;
  const i = Math.floor(f) % 8, j = (i + 1) % 8, t = f - Math.floor(f);
  const a = obs.sectors[i] == null ? all : obs.sectors[i];
  const b = obs.sectors[j] == null ? all : obs.sectors[j];
  /* Nearest sector for most of the span, blended over the last fifth, so a hard edge between "open
     to the north" and "trees to the north-east" does not read as a cliff in the AR overlay. */
  const w = t < 0.4 ? 0 : t > 0.6 ? 1 : (t - 0.4) * 5;
  return Math.max(all, a * (1 - w) + b * w);
}

/* The horizon the app should actually use: the ground, or what is standing on it, whichever is
   higher. Either layer may be missing and it still answers. */
function effectiveAt(profile, obs, azDeg){
  const ground = profile ? altAt(profile, azDeg) : 0;
  const local = sectorAlt(obs, azDeg);
  return Math.max(ground, local);
}
function horizonFn(profile, obs){
  if (!profile && !obs) return null;
  return az => effectiveAt(profile, obs, az);
}

/* ---------------- terrain rise and set ----------------
   Walk a track of samples and return every interval the object spends clear of the skyline, not
   just the first crossing. In mountains an object routinely clears a col, drops behind the next
   ridge and clears again, and returning one time would be wrong rather than merely incomplete.
   Crossing times are interpolated between samples, so a two-minute walk still lands within a few
   seconds of the truth. */
function clearIntervals(samples, hz){
  if (!samples || samples.length < 2) return [];
  const val = s => s.alt - (hz ? hz(s.az) : 0);
  const out = [];
  let open = null;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i], v = val(s);
    if (v > 0 && open == null) {
      if (i === 0) open = { from: s.t, fromEdge: 'already' };
      else {
        const p = samples[i - 1], pv = val(p);
        const f = pv === v ? 0 : pv / (pv - v);
        open = { from: new Date(p.t.getTime() + (s.t.getTime() - p.t.getTime()) * f), fromEdge: 'rise' };
      }
      open.peak = s.alt; open.peakAz = s.az; open.peakT = s.t;
    } else if (v > 0 && open) {
      if (s.alt > open.peak) { open.peak = s.alt; open.peakAz = s.az; open.peakT = s.t; }
    } else if (v <= 0 && open) {
      const p = samples[i - 1], pv = val(p);
      const f = pv === v ? 1 : pv / (pv - v);
      open.to = new Date(p.t.getTime() + (s.t.getTime() - p.t.getTime()) * f);
      open.toEdge = 'set';
      out.push(open); open = null;
    }
  }
  if (open) { open.to = samples[samples.length - 1].t; open.toEdge = 'still'; out.push(open); }
  return out;
}

/* ---------------- storage ----------------
   Base64 of the int16 buffer: 1.9 kB per site against about 5 kB as a JSON number array, on a
   localStorage budget shared with everything else the app remembers. */
function encode(profile){
  if (!profile || !profile.alt) return null;
  const b = new Uint8Array(profile.alt.buffer, profile.alt.byteOffset, profile.alt.byteLength);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return { v: 1, at: profile.at, origin: profile.origin, ground: profile.ground,
    tiles: profile.tiles, missing: profile.missing, alt: btoa(s) };
}
function decode(stored){
  if (!stored || !stored.alt) return null;
  try {
    const s = atob(stored.alt), b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return { alt: new Int16Array(b.buffer), dist: null, origin: stored.origin,
      ground: stored.ground, at: stored.at, tiles: stored.tiles, missing: stored.missing, v: 1 };
  } catch (e) { return null; }
}

/* How far the pin has moved from where the profile was cast. A ridge at 20 km barely notices 100
   metres; a treeline at 300 metres notices enormously, which is why this is metres and not a
   percentage, and why the app should offer a recompute rather than silently reusing it. */
function driftM(profile, lat, lon){
  if (!profile || !profile.origin) return null;
  const dLat = (lat - profile.origin.lat) * D2R;
  const dLon = (lon - profile.origin.lon) * D2R;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat * D2R) * Math.cos(profile.origin.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}
const DRIFT_LIMIT_M = 50;

/* A sentence describing the skyline, for the tile that reports it. Reads the profile rather than
   asserting anything: the highest point, roughly where it is, and how enclosed the site is. */
function summary(profile, obs){
  if (!profile) return null;
  const n = profile.alt.length;
  let hi = -90, hiAz = 0, sum = 0, open = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(profile.alt[i] / 100, sectorAlt(obs, i * 360 / n));
    if (a > hi) { hi = a; hiAz = i * 360 / n; }
    sum += a;
    if (a < 1) open++;
  }
  return { high: hi, highAz: hiAz, mean: sum / n, openFrac: open / n };
}

window.NoctoTerrain = {
  profileFor, plan, sizeLine, groundAt, altAt, distAt, effectiveAt, horizonFn, sectorAlt, SECTORS,
  clearIntervals, encode, decode, driftM, DRIFT_LIMIT_M, summary, ringsFor,
  RANGE_M, RAYS, TILE_BASE, R_EFF, EYE_M,
};
})();
