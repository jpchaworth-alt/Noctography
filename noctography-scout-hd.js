/* Noctography: Scout at desktop quality. The same ground as noctography-scout.js, drawn for a big screen.
   ------------------------------------------------------------------------------------------
   What changes from the phone scene:
   - Imagery runs finer than the heights. Each ring keeps its elevation zoom but carries a texture
     two zooms sharper: about 0.7 m a pixel for the first kilometre and a half, 2.8 m to 7 km, 22 m
     to 28 km. It arrives in two passes: the ring at elevation zoom first, so there is a landscape in
     seconds, then the sharp tiles nearest first, written straight into the texture as they land.
   - WebGL2, so textures can be any size and carry mipmaps, with anisotropic filtering: ground seen
     at a low angle stays crisp instead of smearing.
   - Light from the actual sky. Sun, twilight, moon and skyglow each light the slopes in their own
     colour; a dark scene loses colour the way the eye does unless True colour asks for the camera's
     version. Haze is the colour of the sky directly above each pixel, sampled from the sky itself,
     so a ridge fades into exactly the sky behind it, and towards a town into its glow.
   - Light domes on the horizon from the light pollution atlas, and a moonlit sky that brightens
     and turns blue as the moon climbs.
   Needs NoctoScout (projector, sky colour) and NoctoEngine (atlas) loaded first.
   ------------------------------------------------------------------------------------------ */
"use strict";
(function () {
if (window.NoctoScoutHD) return;

const DEM_BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const IMG_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
const TILE = 256;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const R_EARTH = 6371000, R_EFF = R_EARTH * 7 / 6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* heights: metres a pixel wanted, tiles across, vertex step; k: how many zooms sharper the imagery */
const RINGS = [
  { targetM: 3,   n: 4, step: 2, k: 2 },
  { targetM: 12,  n: 5, step: 2, k: 2 },
  { targetM: 50,  n: 5, step: 4, k: 1 },
  { targetM: 400, n: 5, step: 5, k: 0 },
];
const DEM_MAX_Z = 15, IMG_MAX_Z = 18;

/* Imagery is a URL template so a keyed source can replace the public one without touching the
   renderer. Esri's terms want the ArcGIS Location Platform endpoint with a key for anything live:
   config({ imagery: 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=KEY' }) */
/* Noctography's ArcGIS Location Platform key. It only works from the referrers set on the key
   (noctography.net and the preview), so it is safe in page code, which is how Esri intends it. */
const ESRI_KEY = 'AAPTaCgE7xR2FpQWaRuj6sI31nQ..u17QgYFLf0--49RZU2Gs_YP5g2ZqXlc9cK_9WVjwO0m4e9NIr-k_na0pMo77XVZcHe2qdAdLNov8JXLUK8i7VG--bMcSz1thRYD5CrZA5fta-_4nvXiFOuEthzTqP-Fz9i2b_av8XkUo5dIGbVIv4mfc3KZLWJIPm5z82f9dEXfcgY7COVMeCJ7SohTDq9GxBBH0naJrmGCLhP733hz7xfney7vSc_D5kmEzA73Jq0VvVgW4j04mYdFLrF8.AT1_6VGJvG6Y';
const CFG = { imagery: 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=' + ESRI_KEY, surface: true, shadows: true };
function config(o){ Object.assign(CFG, o || {}); return { ...CFG }; }

/* ---------------- trees and buildings ----------------
   A surface model is the ground with everything on it: canopy, hedges, walls, roofs. Each source
   answers for a box in Web Mercator metres on the inner ring's own pixel grid, so its heights drop
   straight into that ring. Where it has no data the bare-earth heights stay. The terrain call is a
   small box round the pin, so the eye stands on the ground rather than on a tree. */
const MERC_R = 6378137, MERC_HALF = Math.PI * MERC_R;
const mercX = (x, z) => x / Math.pow(2, z) * 2 * MERC_HALF - MERC_HALF;
const mercY = (y, z) => MERC_HALF - y / Math.pow(2, z) * 2 * MERC_HALF;
const C3857 = 'http://www.opengis.net/def/crs/EPSG/0/3857';
function wcs(base, id){
  return async (b, nx, ny) => {
    const url = base + '?request=GetCoverage&service=WCS&version=2.0.1&CoverageId=' + encodeURIComponent(id) +
      '&format=image/tiff&subsettingCrs=' + C3857 + '&outputCrs=' + C3857 +
      '&subset=X(' + b.x0.toFixed(2) + ',' + b.x1.toFixed(2) + ')&subset=Y(' + b.y0.toFixed(2) + ',' + b.y1.toFixed(2) + ')' +
      '&scalesize=i(' + nx + '),j(' + ny + ')';
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 30000);
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) { clearTimeout(tm); return null; }
    const buf = await r.arrayBuffer(); clearTimeout(tm);
    const t = readTiff(buf);
    return t && t.W === nx && t.H === ny ? t.data : null;
  };
}
const EA = 'https://environment.data.gov.uk/spatialdata/';
const SURFACES = [
  { id: 'ea', name: 'Environment Agency LIDAR', credit: 'LIDAR \u00a9 Environment Agency', res: 1,
    box: [49.85, 55.82, -6.45, 1.8],
    surface: wcs(EA + 'lidar-composite-digital-surface-model-first-return-dsm-1m/wcs', 'df4e3ec3-315e-48aa-aaaf-b5ae74d7b2bb__Lidar_Composite_Elevation_FZ_DSM_1m'),
    terrain: wcs(EA + 'lidar-composite-digital-terrain-model-dtm-1m/wcs', '13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m') },
];
/* Uncompressed float32 GeoTIFF, stripped or tiled, either byte order: what these services send. */
function readTiff(buf){
  const dv = new DataView(buf); if (buf.byteLength < 16) return null;
  const le = dv.getUint16(0) === 0x4949, g16 = o => dv.getUint16(o, le), g32 = o => dv.getUint32(o, le);
  if (g16(2) !== 42) return null;
  const ifd = g32(4), n = g16(ifd), T = {}, SZ = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12, t = g16(e), ty = g16(e + 2), c = g32(e + 4), off = (SZ[ty] || 1) * c <= 4 ? e + 8 : g32(e + 8);
    const v = []; for (let k = 0; k < Math.min(c, 100000); k++) v.push(ty === 3 ? g16(off + k * 2) : ty === 4 ? g32(off + k * 4) : 0);
    T[t] = v;
  }
  const W = T[256][0], H = T[257][0];
  if ((T[259] && T[259][0] !== 1) || (T[258] && T[258][0] !== 32) || (T[339] && T[339][0] !== 3)) return null;
  const out = new Float32Array(W * H).fill(NaN);
  const put = (off, x0, y0, w, h) => {
    for (let y = 0; y < h && y0 + y < H; y++) for (let x = 0; x < w && x0 + x < W; x++) {
      const v = dv.getFloat32(off + (y * w + x) * 4, le);
      out[(y0 + y) * W + x0 + x] = v > -1e4 && v < 1e4 ? v : NaN;
    }
  };
  if (T[322]) { const tw = T[322][0], th = T[323][0], across = Math.ceil(W / tw); T[324].forEach((o, i) => put(o, (i % across) * tw, Math.floor(i / across) * th, tw, th)); }
  else { const rps = T[278] ? T[278][0] : H; T[273].forEach((o, i) => put(o, 0, i * rps, W, Math.min(rps, H - i * rps))); }
  return { W, H, data: out };
}

function lonToX(lon, z){ return (lon + 180) / 360 * Math.pow(2, z); }
function latToY(lat, z){
  const s = Math.min(85.0511, Math.max(-85.0511, lat)) * D2R;
  return (1 - Math.log(Math.tan(s) + 1 / Math.cos(s)) / Math.PI) / 2 * Math.pow(2, z);
}
function xToLon(x, z){ return x / Math.pow(2, z) * 360 - 180; }
function yToLat(y, z){
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return R2D * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function bearingDist(lat0, lon0, lat, lon){
  const la0 = lat0 * D2R, la1 = lat * D2R, dLon = (lon - lon0) * D2R;
  const y = Math.sin(dLon) * Math.cos(la1);
  const x = Math.cos(la0) * Math.sin(la1) - Math.sin(la0) * Math.cos(la1) * Math.cos(dLon);
  const a = Math.sin((la1 - la0) / 2) ** 2 + Math.cos(la0) * Math.cos(la1) * Math.sin(dLon / 2) ** 2;
  return { br: Math.atan2(y, x), d: 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a))) };
}
function destPoint(lat, lon, azDeg, dM){
  const dr = dM / R_EARTH, br = azDeg * D2R, la = lat * D2R, lo = lon * D2R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return [la2 * R2D, lo2 * R2D];
}

/* The pin sits within half a tile of the middle of every ring, so an even count of tiles does not
   leave one side short. */
function plan(lat, lon, maxTex){
  const base = 156543.03392 * Math.cos(lat * D2R);
  const rings = RINGS.map(r => {
    const z = clamp(Math.ceil(Math.log2(base / r.targetM)), 3, DEM_MAX_Z);
    let kz = Math.min(IMG_MAX_Z, z + r.k);
    while (kz > z && r.n * TILE * Math.pow(2, kz - z) > maxTex) kz--;
    const fx = lonToX(lon, z), fy = latToY(lat, z);
    return { z, kz, f: Math.pow(2, kz - z), n: r.n, step: r.step,
      mPerPx: base / Math.pow(2, z), imgM: base / Math.pow(2, kz),
      x0: Math.round(fx - r.n / 2), y0: Math.round(fy - r.n / 2) };
  });
  return { rings };
}
function boxOf(r){
  const pad = 0.02 * r.n;
  return { w: xToLon(r.x0 + pad, r.z), e: xToLon(r.x0 + r.n - pad, r.z), n: yToLat(r.y0 + pad, r.z), s: yToLat(r.y0 + r.n - pad, r.z) };
}

async function fetchDem(z, x, y){
  const n = Math.pow(2, z);
  x = ((x % n) + n) % n;
  if (y < 0 || y >= n) return null;
  const bm = await fetchBitmap(DEM_BASE + z + '/' + x + '/' + y + '.png', 15000);
  if (!bm) return null;
  const cv = document.createElement('canvas');
  cv.width = bm.width; cv.height = bm.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bm, 0, 0);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  if (bm.close) bm.close();
  const out = new Float32Array(TILE * TILE);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const e = (px[p] * 256 + px[p + 1] + px[p + 2] / 256) - 32768;
    out[i] = e < 0 ? 0 : e;
  }
  return out;
}
/* Tiles come through the offline store when it is loaded: from the cache if this spot was saved,
   otherwise from the network and then kept. */
async function fetchBitmap(url, ms){
  const O = window.NoctoOffline;
  let buf = O ? await O.get(url) : null;
  if (!buf) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) return null; buf = await r.arrayBuffer(); }
    catch (e) { return null; } finally { clearTimeout(t); }
    if (O) O.put(url, buf);
  }
  try { return await createImageBitmap(new Blob([buf])); } catch (e) { return null; }
}
function fetchImg(z, x, y){
  const n = Math.pow(2, z);
  x = ((x % n) + n) % n;
  if (y < 0 || y >= n) return Promise.resolve(null);
  return fetchBitmap(CFG.imagery.replace('{z}', z).replace('{y}', y).replace('{x}', x), 12000);
}

async function loadRing(r, onTile){
  const W = r.n * TILE;
  const heights = new Float32Array(W * W);
  const atlas = document.createElement('canvas');
  atlas.width = W; atlas.height = W;
  const actx = atlas.getContext('2d');
  actx.fillStyle = '#20242c'; actx.fillRect(0, 0, W, W);
  const jobs = [];
  for (let ty = 0; ty < r.n; ty++) for (let tx = 0; tx < r.n; tx++) jobs.push({ tx, ty });
  const run = async () => {
    while (jobs.length) {
      const j = jobs.shift();
      const [dem, img] = await Promise.all([
        fetchDem(r.z, r.x0 + j.tx, r.y0 + j.ty).catch(() => null),
        fetchImg(r.z, r.x0 + j.tx, r.y0 + j.ty),
      ]);
      if (dem) for (let py = 0; py < TILE; py++)
        heights.set(dem.subarray(py * TILE, py * TILE + TILE), (j.ty * TILE + py) * W + j.tx * TILE);
      if (img) actx.drawImage(img, j.tx * TILE, j.ty * TILE);
      if (onTile) onTile();
    }
  };
  await Promise.all(Array.from({ length: 6 }, run));
  return { heights, atlas, W };
}

function buildMesh(r, data, lat, lon, cut){
  const W = data.W, s = r.step, H = data.heights, CAN = data.canopy, BLD = data.bld;
  const nv = Math.floor((W - 1) / s) + 1;
  const pos = new Float32Array(nv * nv * 3), uv = new Float32Array(nv * nv * 2), nrm = new Float32Array(nv * nv * 3);
  const can = CAN ? new Float32Array(nv * nv * 2) : null;
  const inside = new Uint8Array(nv * nv);
  const hAt = (px, py) => H[Math.min(W - 1, Math.max(0, py)) * W + Math.min(W - 1, Math.max(0, px))];
  for (let j = 0; j < nv; j++) {
    const py = Math.min(W - 1, j * s);
    const la = yToLat(r.y0 + (py + 0.5) / TILE, r.z);
    for (let i = 0; i < nv; i++) {
      const px = Math.min(W - 1, i * s);
      const lo = xToLon(r.x0 + (px + 0.5) / TILE, r.z);
      const bd = bearingDist(lat, lon, la, lo);
      const k = j * nv + i;
      pos[k * 3] = bd.d * Math.sin(bd.br);
      pos[k * 3 + 1] = bd.d * Math.cos(bd.br);
      pos[k * 3 + 2] = hAt(px, py) - bd.d * bd.d / (2 * R_EFF);
      uv[k * 2] = (px + 0.5) / W; uv[k * 2 + 1] = (py + 0.5) / W;
      if (can) { can[k * 2] = CAN[py * W + px]; can[k * 2 + 1] = BLD ? BLD[py * W + px] : 0; }
      const dzdx = (hAt(px + s, py) - hAt(px - s, py)) / (2 * s * r.mPerPx);
      const dzdy = (hAt(px, py - s) - hAt(px, py + s)) / (2 * s * r.mPerPx);
      const len = Math.hypot(dzdx, dzdy, 1);
      nrm[k * 3] = -dzdx / len; nrm[k * 3 + 1] = -dzdy / len; nrm[k * 3 + 2] = 1 / len;
      if (cut) inside[k] = (la > cut.s && la < cut.n && lo > cut.w && lo < cut.e) ? 1 : 0;
    }
  }
  const idx = new Uint32Array((nv - 1) * (nv - 1) * 6);
  let q = 0;
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nv - 1; i++) {
    const a = j * nv + i, b = a + 1, c = a + nv, d = c + 1;
    if (cut && inside[a] && inside[b] && inside[c] && inside[d]) continue;
    idx[q++] = a; idx[q++] = c; idx[q++] = b;
    idx[q++] = b; idx[q++] = c; idx[q++] = d;
  }
  /* Trees near the eye, as trees. The surface model can only draw a wood as a smooth blanket, which
     from the ground reads as mounds. Within 400 m each tree is its own small shape standing on the
     bare ground: a stack of three ragged cones for a conifer, a lumpy crown on a trunk otherwise.
     What matters at night is the outline against the sky, so every ring is jittered. Winding is
     outward, the same as the ground, so they cast moon and sun shadows with everything else. */
  const T = data.trees;
  if (T && T.length && can) {
    const nt = T.length / 6, SEG = 7, TAU = Math.PI * 2;
    const MV = nt * 31, TP = new Float32Array(MV * 3), TUv = new Float32Array(MV * 2), TN = new Float32Array(MV * 3), TC = new Float32Array(MV * 2), TI = new Uint32Array(nt * 50 * 3);
    let tv = 0, ti = 0; const base0 = nv * nv;
    const jit = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let t = 0; t < nt; t++) {
      const px = T[t * 6], py = T[t * 6 + 1], h = T[t * 6 + 2], con = T[t * 6 + 3] > 0.5, sd = T[t * 6 + 4], zb = T[t * 6 + 5];
      const la = yToLat(r.y0 + py / TILE, r.z), lo = xToLon(r.x0 + px / TILE, r.z), bd = bearingDist(lat, lon, la, lo);
      const X = bd.d * Math.sin(bd.br), Y = bd.d * Math.cos(bd.br), Z0 = zb - bd.d * bd.d / (2 * R_EFF);
      const u = px / W, w = py / W;
      const V = (x, y, z, nx, ny, nz) => { const l = Math.hypot(nx, ny, nz) || 1, k = tv++; TP[k * 3] = x; TP[k * 3 + 1] = y; TP[k * 3 + 2] = z; TN[k * 3] = nx / l; TN[k * 3 + 1] = ny / l; TN[k * 3 + 2] = nz / l; TUv[k * 2] = u; TUv[k * 2 + 1] = w; TC[k * 2] = 1; TC[k * 2 + 1] = 0; return base0 + k; };
      const F = (a, b, c) => { TI[ti++] = a; TI[ti++] = b; TI[ti++] = c; };
      const ring = (z, rr, rot, salt, nz, zc, rz) => { const ids = []; for (let q = 0; q < SEG; q++) { const th = rot + q * TAU / SEG, rq = rr * (0.74 + 0.5 * jit(sd * 91 + salt, q)); const cx = Math.cos(th), sy = Math.sin(th); ids.push(rz ? V(X + rq * cx, Y + rq * sy, z, cx / rr, sy / rr, (z - zc) / (rz * rz) * rr) : V(X + rq * cx, Y + rq * sy, z, cx, sy, nz)); } return ids; };
      if (con) {
        const R0 = h * 0.19 * (0.85 + 0.3 * sd);
        [[0.06, 0.55, 1.0], [0.34, 0.8, 0.7], [0.6, 1.0, 0.42]].forEach((tr, ti2) => {
          const L = ring(Z0 + h * tr[0], R0 * tr[2], sd * 6.28 + ti2 * 1.3, ti2 * 17, R0 * tr[2] / (h * (tr[1] - tr[0])));
          const A = V(X, Y, Z0 + h * tr[1] * (0.96 + 0.08 * jit(sd, ti2)), 0, 0, 1);
          for (let q = 0; q < SEG; q++) F(L[q], L[(q + 1) % SEG], A);
        });
      } else {
        const rc = Math.max(1.4, h * 0.32) * (0.85 + 0.3 * sd), zbot = h * 0.28, zc = Z0 + (zbot + h) / 2, rz = (h - zbot) / 2;
        const rt = Math.max(0.15, h * 0.028), Lb = [], Ub = [];
        for (let q = 0; q < 4; q++) { const th = sd * 3 + q * TAU / 4, cx = Math.cos(th), sy = Math.sin(th); Lb.push(V(X + rt * cx, Y + rt * sy, Z0 - 0.3, cx, sy, 0)); }
        for (let q = 0; q < 4; q++) { const th = sd * 3 + q * TAU / 4, cx = Math.cos(th), sy = Math.sin(th); Ub.push(V(X + rt * 0.8 * cx, Y + rt * 0.8 * sy, zc - rz * 0.4, cx, sy, 0)); }
        for (let q = 0; q < 4; q++) { const q1 = (q + 1) % 4; F(Lb[q], Lb[q1], Ub[q]); F(Lb[q1], Ub[q1], Ub[q]); }
        const B = V(X, Y, zc - rz, 0, 0, -1), rot = sd * 5;
        const rings = [-0.5, 0.15, 0.7].map((ph, k) => ring(zc + rz * Math.sin(ph), rc * Math.cos(ph), rot + k * 0.45, 40 + k * 13, 0, zc, rz));
        const Tp = V(X, Y, zc + rz * (0.9 + 0.12 * jit(sd, 9)), 0, 0, 1);
        for (let q = 0; q < SEG; q++) { const q1 = (q + 1) % SEG; F(B, rings[0][q1], rings[0][q]); }
        for (let k = 0; k < 2; k++) for (let q = 0; q < SEG; q++) { const q1 = (q + 1) % SEG, L = rings[k], U = rings[k + 1]; F(L[q], L[q1], U[q]); F(L[q1], U[q1], U[q]); }
        for (let q = 0; q < SEG; q++) F(rings[2][q], rings[2][(q + 1) % SEG], Tp);
      }
    }
    const cat = (a, b, n) => { const o = new a.constructor(a.length + n); o.set(a); o.set(b.subarray(0, n), a.length); return o; };
    const q2 = q;
    return { pos: cat(pos, TP, tv * 3), uv: cat(uv, TUv, tv * 2), nrm: cat(nrm, TN, tv * 3), can: cat(can, TC, tv * 2),
      idx: cat(idx.subarray(0, q2), TI, ti), count: q2 + ti, trees: nt };
  }
  return { pos, uv, nrm, can, idx: idx.subarray(0, q), count: q };
}

/* ---------------- WebGL2 ---------------- */
const VS = `#version 300 es
in vec3 aPos; in vec2 aUv; in vec3 aNrm; in vec2 aCan;
uniform mat4 uMVP; uniform mat4 uL0; uniform mat4 uL1;
out vec2 vUv; out vec3 vNrm; out float vDist; out vec4 vL0; out vec4 vL1; out vec2 vCan; out vec3 vPos;
void main(){
  vUv = aUv; vNrm = aNrm; vDist = length(aPos.xy); vCan = aCan; vPos = aPos;
  vL0 = uL0 * vec4(aPos + aNrm * 0.7, 1.0);
  vL1 = uL1 * vec4(aPos + aNrm * 9.0, 1.0);
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;
const VS_DEPTH = `#version 300 es
in vec3 aPos; uniform mat4 uMVP;
void main(){ gl_Position = uMVP * vec4(aPos, 1.0); }`;
const FS_DEPTH = `#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(1.0); }`;
const SHADOW_SIZE = 4096;
const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform sampler2D uHazeTex;
uniform vec2 uRes;
uniform vec3 uSun; uniform vec3 uMoon; uniform vec3 uSunCol; uniform vec3 uMoonCol; uniform vec3 uSkyCol;
uniform float uScot; uniform float uHazeM; uniform float uHaze; uniform float uNv; uniform float uSil;
uniform highp sampler2DShadow uSh0; uniform highp sampler2DShadow uSh1;
uniform float uShOn; uniform float uShSun; uniform vec2 uBias;
in vec2 vUv; in vec3 vNrm; in float vDist; in vec4 vL0; in vec4 vL1; in vec2 vCan; in vec3 vPos;
out vec4 frag;
/* 3 by 3 hardware-filtered taps: soft enough to lose the texel steps, sharp enough for a ridge line */
float tap(highp sampler2DShadow s, vec4 p, float bias){
  vec3 q = p.xyz / p.w * 0.5 + 0.5;
  if (q.x < 0.002 || q.y < 0.002 || q.x > 0.998 || q.y > 0.998 || q.z > 1.0) return -1.0;
  vec2 t = 1.0 / vec2(textureSize(s, 0));
  float k = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) k += texture(s, vec3(q.xy + vec2(i, j) * t, q.z - bias));
  return k / 9.0;
}
void main(){
  float sh = 1.0;
  if (uShOn > 0.5) { sh = tap(uSh0, vL0, uBias.x); if (sh < 0.0) { sh = tap(uSh1, vL1, uBias.y); if (sh < 0.0) sh = 1.0; } }
  float shS = mix(1.0, sh, uShSun), shM = mix(sh, 1.0, uShSun);
  /* the imagery is a daylight photograph: taken back to linear light and treated as the colour of
     the ground, then relit */
  vec3 alb = pow(texture(uTex, vUv).rgb, vec3(2.2)) * 1.2;
  /* canopy: a photo of treetops from above is not what the side of a wood looks like. Foliage is
     dark and a little green, and reads that way from the ground. */
  /* buildings: flat faces, so roofs and walls catch the light as planes rather than as a mound.
     Roofs keep the photograph's colour; walls, which the photograph cannot see, are a pale render. */
  float bl = smoothstep(0.0, 0.3, vCan.y);
  float cn = clamp(vCan.x, 0.0, 1.0) * (1.0 - bl);
  alb = mix(alb, vec3(dot(alb, vec3(0.3, 0.59, 0.11))) * vec3(0.55, 0.72, 0.5) * 0.55, cn);
  vec3 fn = normalize(cross(dFdx(vPos), dFdy(vPos)));
  float wall = bl * (1.0 - smoothstep(0.55, 0.8, fn.z));
  alb = mix(alb, vec3(0.34, 0.32, 0.29), wall);
  vec3 n = normalize(mix(normalize(vNrm), fn, bl));
  float hemi = 0.55 + 0.45 * n.z;
  vec3 L = uSkyCol * hemi + uSunCol * max(dot(n, uSun), 0.0) * shS + uMoonCol * max(dot(n, uMoon), 0.0) * shM;
  vec3 c = alb * L * (1.0 - uSil);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, l * vec3(0.8, 0.92, 1.2), uScot);
  vec3 hz = pow(texture(uHazeTex, vec2(gl_FragCoord.x / uRes.x, 0.5)).rgb, vec3(2.2));
  float f = (1.0 - exp(-vDist / uHazeM)) * uHaze;
  c = mix(c, hz, f);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  if (uNv > 0.5) { float k = dot(c, vec3(0.3, 0.59, 0.11)); c = vec3(k * 1.6, k * 0.22, k * 0.08); }
  frag = vec4(c, 1.0);
}`;

function makeGL(canvas){
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const a = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUv'), nrm: gl.getAttribLocation(prog, 'aNrm'), can: gl.getAttribLocation(prog, 'aCan') };
  const u = {};
  ['uMVP', 'uTex', 'uHazeTex', 'uHaze', 'uRes', 'uSun', 'uMoon', 'uSunCol', 'uMoonCol', 'uSkyCol', 'uScot', 'uHazeM', 'uHaze', 'uNv', 'uSil',
    'uL0', 'uL1', 'uSh0', 'uSh1', 'uShOn', 'uShSun', 'uBias']
    .forEach(k => u[k] = gl.getUniformLocation(prog, k));
  const dprog = gl.createProgram();
  gl.attachShader(dprog, sh(gl.VERTEX_SHADER, VS_DEPTH)); gl.attachShader(dprog, sh(gl.FRAGMENT_SHADER, FS_DEPTH));
  gl.bindAttribLocation(dprog, 0, 'aPos');
  gl.linkProgram(dprog);
  if (!gl.getProgramParameter(dprog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(dprog));
  const shadow = { prog: dprog, uMVP: gl.getUniformLocation(dprog, 'uMVP'), aPos: gl.getAttribLocation(dprog, 'aPos'), maps: [] };
  for (let i = 0; i < 2; i++) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    const col = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, col);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.R8, SHADOW_SIZE, SHADOW_SIZE);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, col);
    shadow.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    shadow.maps.push({ tex: t, fb, mvp: new Float32Array(16) });
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxAniso = aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;
  const hazeTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, hazeTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 128, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { gl, prog, a, u, aniso, maxAniso, hazeTex, shadow, maxTex: Math.min(8192, gl.getParameter(gl.MAX_TEXTURE_SIZE)) };
}
/* The ring's texture at its sharp size from the start, filled from the coarse atlas scaled up,
   so the sharp tiles can drop into place one by one. */
function makeTexture(G, r, atlas){
  const gl = G.gl, S = r.n * TILE * r.f, levels = Math.floor(Math.log2(S)) + 1;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, S, S);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (G.aniso) gl.texParameterf(gl.TEXTURE_2D, G.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, G.maxAniso));
  const ts = TILE * r.f, sc = document.createElement('canvas');
  sc.width = ts; sc.height = ts;
  const sx = sc.getContext('2d');
  sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
  for (let ty = 0; ty < r.n; ty++) for (let tx = 0; tx < r.n; tx++) {
    sx.drawImage(atlas, tx * TILE, ty * TILE, TILE, TILE, 0, 0, ts, ts);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, tx * ts, ty * ts, gl.RGBA, gl.UNSIGNED_BYTE, sc);
  }
  gl.generateMipmap(gl.TEXTURE_2D);
  return { tex, size: S };
}
function upload(G, mesh){
  const gl = G.gl;
  const buf = (data, target) => { const b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
  return { pos: buf(mesh.pos), uv: buf(mesh.uv), nrm: buf(mesh.nrm), can: mesh.can ? buf(mesh.can) : null, idx: buf(mesh.idx, gl.ELEMENT_ARRAY_BUFFER), count: mesh.count };
}

function perspective(hfovDeg, vfovDeg, near, far){
  const fx = 1 / Math.tan(hfovDeg / 2 * D2R), fy = 1 / Math.tan(vfovDeg / 2 * D2R), nf = 1 / (near - far);
  return new Float32Array([fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function ortho(l, r, b, t, n, f){
  return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
}
function cross(a, b){ return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function lookAt(eye, az, alt){
  const f = [Math.sin(az * D2R) * Math.cos(alt * D2R), Math.cos(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R)];
  let s = cross(f, [0, 0, 1]); const sl = Math.hypot(s[0], s[1], s[2]) || 1; s = s.map(v => v / sl);
  const u = cross(s, f);
  return new Float32Array([s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1]);
}
function mul(a, b){
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}
function dirOf(az, alt){ return [Math.sin(az * D2R) * Math.cos(alt * D2R), Math.cos(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R)]; }
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add3 = (...v) => v.reduce((s, x) => [s[0] + x[0], s[1] + x[1], s[2] + x[2]], [0, 0, 0]);
const k3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/* Light on the ground, in linear light, for the sun where it is. gain is the exposure: it lifts the
   night terms, the way a long exposure does, and leaves daylight alone. */
function lightFor(L){
  const sa = L.sunAlt, g = L.gain == null ? 1 : L.gain, mode = L.mode || 'lit';
  const day = ss(-4, 8, sa), nightness = 1 - day;
  const direct = ss(-1.5, 6, sa);
  const sunCol = k3(lerp3([1.0, 0.42, 0.16], [1.0, 0.93, 0.84], ss(0, 25, sa)), 1.5 * direct);
  const tw = ss(-18, -1, sa) * nightness, civ = ss(-7, -1, sa) * nightness;
  const twK = 0.6 + 0.4 * g;
  const moon = (L.moonAlt > 0 ? Math.min(1, L.moonAlt / 10) : 0) * Math.pow(L.moonFrac || 0, 1.6) * nightness;
  const lp = Math.min(3, L.lpArt || 0) * (1 - tw);
  let sky = add3(
    k3([0.26, 0.32, 0.44], day),
    k3([0.07, 0.09, 0.17], Math.pow(tw, 1.4) * twK),
    k3([0.07, 0.045, 0.05], civ * twK),
    k3([0.016, 0.018, 0.026], g * nightness),
    k3([0.03, 0.02, 0.011], lp * g * nightness));
  let moonCol = k3([0.5, 0.52, 0.58], moon * g * 1.1);
  let scot = (1 - ss(-14, -4, sa)) * (1 - 0.5 * moon) * 0.6;
  if (mode === 'true') { const k = 1 + 0.8 * nightness; sky = k3(sky, k); moonCol = k3([0.62, 0.58, 0.52], moon * g * 1.1 * k); scot = 0; }
  return { sunCol, sky, moonCol, scot, sil: mode === 'sil' ? 1 : 0 };
}

class Scene {
  constructor(canvas){
    this.canvas = canvas;
    try { this.G = makeGL(canvas); } catch (e) { this.G = null; this.error = e.message; if (window.console) console.warn('Scout HD:', e.message); }
    this.rings = [];
    this.ground = 0;
    this.lat = null; this.lon = null;
    this.token = null;
    this.detail = { done: 0, total: 0 };
    this.version = 0;
    this.surfaceInfo = null;
  }
  get ok(){ return !!this.G; }
  free(list){
    const gl = this.G && this.G.gl;
    if (gl) list.forEach(x => { if (x && x.gpu) { gl.deleteTexture(x.tex.tex); [x.gpu.pos, x.gpu.uv, x.gpu.nrm, x.gpu.idx, x.gpu.can].forEach(b => b && gl.deleteBuffer(b)); } });
  }
  clear(){ this.free(this.rings); this.rings = []; }
  /* o: { onProgress(done, total), onRing(i), onDetail(done, total) }. Resolves when the coarse ground
     is up; the sharp imagery carries on arriving after that. */
  /* A first load fills in ring by ring. A move from one spot to another keeps the old ground on
     screen until the new one is complete, then swaps, so a jump never passes through a blank. */
  async load(lat, lon, o){
    o = o || {};
    if (!this.G) { this.lat = lat; this.lon = lon; return null; }
    const keep = this.rings.some(Boolean);
    const token = this.token = {};
    if (window.NoctoOffline) window.NoctoOffline.begin(lat.toFixed(4) + ',' + lon.toFixed(4), o.name);
    if (!keep) { this.clear(); this.lat = lat; this.lon = lon; }
    const fresh = keep ? [] : this.rings;
    const p = plan(lat, lon, this.G.maxTex);
    if (!keep) this.plan = p;
    let ground = 0;
    let done = 0;
    const total = p.rings.reduce((s, r) => s + r.n * r.n, 0);
    const boxes = p.rings.map(boxOf);
    await Promise.all(p.rings.map(async (r, i) => {
      const data = await loadRing(r, () => { done++; if (o.onProgress && this.token === token) o.onProgress(done, total); });
      if (this.token !== token) return;
      if (i === 0) {
        const W = data.W;
        const fx = (lonToX(lon, r.z) - r.x0) * TILE, fy = (latToY(lat, r.z) - r.y0) * TILE;
        const gi = clamp(Math.floor(fx), 0, W - 2), gj = clamp(Math.floor(fy), 0, W - 2);
        const h = (x, y) => data.heights[y * W + x] || 0;
        ground = Math.max(h(gi, gj), h(gi + 1, gj), h(gi, gj + 1), h(gi + 1, gj + 1));
        if (!keep) this.ground = ground;
      }
      const mesh = buildMesh(r, data, lat, lon, i > 0 ? boxes[i - 1] : null);
      const tex = makeTexture(this.G, r, data.atlas);
      data.atlas = null;
      fresh[i] = { r, data, gpu: upload(this.G, mesh), tex, box: boxes[i], dirty: false, mipAt: 0 };
      if (this.token !== token && keep) { this.free([fresh[i]]); fresh[i] = null; return; }
      if (o.onRing && !keep) o.onRing(i);
    }));
    if (this.token !== token) { if (keep) this.free(fresh); return null; }
    if (keep) { this.clear(); this.rings = fresh; this.lat = lat; this.lon = lon; this.ground = ground; this.plan = p; if (o.onRing) o.onRing(0); }
    this.version++;
    this.surfaceInfo = null;
    this.sharpen(token, boxes, o.onDetail);
    this.addSurface(token, o.onSurface);
    return { ground: this.ground };
  }
  /* The sharp pass. Tiles an inner ring already covers are skipped, since nothing of them is drawn;
     the rest go nearest first, whichever ring they belong to. */
  async sharpen(token, boxes, onDetail){
    const jobs = [];
    this.rings.forEach((x, i) => {
      const r = x.r; if (r.f <= 1) return;
      const px = (lonToX(this.lon, r.kz) - r.x0 * r.f), py = (latToY(this.lat, r.kz) - r.y0 * r.f);
      const inner = i > 0 ? boxes[i - 1] : null;
      for (let ty = 0; ty < r.n * r.f; ty++) for (let tx = 0; tx < r.n * r.f; tx++) {
        const gx = r.x0 * r.f + tx, gy = r.y0 * r.f + ty;
        if (inner) {
          const w = xToLon(gx, r.kz), e = xToLon(gx + 1, r.kz), n = yToLat(gy, r.kz), s = yToLat(gy + 1, r.kz);
          if (w > inner.w && e < inner.e && n < inner.n && s > inner.s) continue;
        }
        jobs.push({ i, tx, ty, gx, gy, d: Math.hypot(tx + 0.5 - px, ty + 0.5 - py) * TILE * r.imgM });
      }
    });
    jobs.sort((a, b) => a.d - b.d);
    const total = jobs.length;
    let done = 0;
    this.detail = { done, total };
    if (onDetail) onDetail(done, total);
    const gl = this.G.gl;
    const run = async () => {
      while (jobs.length && this.token === token) {
        const j = jobs.shift(), x = this.rings[j.i];
        const img = await fetchImg(x.r.kz, j.gx, j.gy);
        if (this.token !== token) return;
        if (img) {
          gl.bindTexture(gl.TEXTURE_2D, x.tex.tex);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, j.tx * TILE, j.ty * TILE, gl.RGBA, gl.UNSIGNED_BYTE, img);
          x.dirty = true;
        }
        done++;
        this.detail = { done, total };
        if (onDetail) onDetail(done, total);
      }
    };
    await Promise.all(Array.from({ length: 8 }, run));
  }
  /* Trees and buildings for the inner ring, from the first source that covers the pin. The ring is
     rebuilt a vertex a pixel (about 2.8 m in Britain) so a hedge or a tree line reads on the skyline. */
  async addSurface(token, onSurface, again){
    const x = this.rings[0];
    if (!CFG.surface || !x || this.lat == null) return;
    /* the global ground as loaded, kept so a second pass (trees arriving late) starts from it */
    if (!x.data.base) x.data.base = Float32Array.from(x.data.heights);
    const lat = this.lat, lon = this.lon;
    const NS = window.NoctoSurfaces;
    const legacy = SURFACES.find(p => lat >= p.box[0] && lat <= p.box[1] && lon >= p.box[2] && lon <= p.box[3]);
    const say = info => { this.surfaceInfo = info; if (onSurface && this.token === token) onSurface(info); };
    const guess = NS ? NS.coverage(lat, lon) : legacy && legacy.name;
    say({ state: 'loading', name: guess || 'trees and buildings' });
    const r = x.r, W = x.data.W;
    const box = { x0: mercX(r.x0, r.z), x1: mercX(r.x0 + r.n, r.z), y0: mercY(r.y0 + r.n, r.z), y1: mercY(r.y0, r.z) };
    const ci = Math.round((lonToX(lon, r.z) - r.x0) * TILE), cj = Math.round((latToY(lat, r.z) - r.y0) * TILE);
    let surf = null, bare = null, kind = null, src = legacy;
    if (NS) {
      const lonOf = new Float64Array(W), latOf = new Float64Array(W);
      for (let i = 0; i < W; i++) { lonOf[i] = xToLon(r.x0 + (i + 0.5) / TILE, r.z); latOf[i] = yToLat(r.y0 + (i + 0.5) / TILE, r.z); }
      const ctx = { W, box, lat, lon, lonOf, latOf, m: r.mPerPx, mMerc: (box.x1 - box.x0) / W, H: Float32Array.from(x.data.base), patient: !!again,
        geo: { n: yToLat(r.y0, r.z), s: yToLat(r.y0 + r.n, r.z), w: xToLon(r.x0, r.z), e: xToLon(r.x0 + r.n, r.z) } };
      let res = null;
      const O = window.NoctoOffline, ck = 'https://offline.noctography.net/surface4/' + r.z + '/' + r.x0 + '/' + r.y0;
      const packed = O && !again ? await O.get(ck) : null;
      if (packed) {
        try {
          const len = new Uint32Array(packed, 0, 1)[0], meta = JSON.parse(new TextDecoder().decode(new Uint8Array(packed, 4, len)));
          const off = 4 + len + ((4 - (4 + len) % 4) % 4), N = W * W;
          res = { name: meta.name, credit: meta.credit, terrainOnly: meta.terrainOnly,
            surface: meta.s ? new Float32Array(packed.slice(off, off + N * 4)) : null,
            terrain: meta.t ? new Float32Array(packed.slice(off + (meta.s ? N * 4 : 0), off + (meta.s ? N * 8 : N * 4))) : null };
          const ko = off + (meta.s ? N * 4 : 0) + (meta.t ? N * 4 : 0);
          res.kind = meta.k ? new Uint8Array(packed.slice(ko, ko + N)) : null;
          /* a fallback kept where a national survey should have answered is only trusted for three
             days: the survey may have been down, not absent */
          if (meta.soft && (!meta.at || Date.now() - meta.at > 3 * 86400000)) res = null;
        } catch (e) { res = null; }
      }
      if (!res) {
        try { res = await NS.fetchFor(ctx); } catch (e) { res = null; }
        if (res && O && !res.pending && !res.degraded) {
          const soft = !!(NS.coverage && NS.coverage(ctx.lat, ctx.lon) && !String(res.name).startsWith(NS.coverage(ctx.lat, ctx.lon)));
          const meta = new TextEncoder().encode(JSON.stringify({ name: res.name, credit: res.credit, terrainOnly: res.terrainOnly, s: !!res.surface, t: !!res.terrain, k: !!res.kind, soft, at: Date.now() }));
          const pad = (4 - (4 + meta.length) % 4) % 4, N = W * W;
          const out = new Uint8Array(4 + meta.length + pad + (res.surface ? N * 4 : 0) + (res.terrain ? N * 4 : 0) + (res.kind ? N : 0));
          new Uint32Array(out.buffer, 0, 1)[0] = meta.length; out.set(meta, 4);
          let o = 4 + meta.length + pad;
          if (res.surface) { out.set(new Uint8Array(res.surface.buffer, res.surface.byteOffset, N * 4), o); o += N * 4; }
          if (res.terrain) { out.set(new Uint8Array(res.terrain.buffer, res.terrain.byteOffset, N * 4), o); o += N * 4; }
          if (res.kind) out.set(res.kind, o);
          O.put(ck, out.buffer);
        }
      }
      if (this.token !== token || this.rings[0] !== x) return;
      if (!res) { say({ state: 'none', name: guess, failed: !!guess }); return; }
      surf = res.surface || (res.terrain ? Float32Array.from(res.terrain) : null); bare = res.terrain; kind = res.kind || null;
      src = { name: res.name, credit: res.credit, terrainOnly: res.terrainOnly };
      if (res.pending) res.pending.then(ok => { if (ok && this.token === token && this.rings[0] === x) this.addSurface(token, onSurface, true); });
    } else {
      if (!legacy) { say({ state: 'none' }); return; }
      const valid = d => { if (!d) return 0; let k = 0; for (let i = 0; i < d.length; i += 7) if (d[i] === d[i]) k++; return k / Math.ceil(d.length / 7); };
      try { [surf, bare] = await Promise.all([legacy.surface(box, W, W), legacy.terrain ? legacy.terrain(box, W, W).catch(() => null) : null]); } catch (e) { surf = null; }
      if (valid(surf) < 0.6 && this.token === token) {
        await new Promise(q => setTimeout(q, 1200));
        try { const again = await legacy.surface(box, W, W); if (valid(again) > valid(surf)) surf = again; } catch (e) {}
      }
    }
    if (this.token !== token || this.rings[0] !== x) return;
    if (!surf) { say({ state: 'none', name: src && src.name, failed: true }); return; }
    const H = x.data.heights;
    H.set(x.data.base);
    /* National heights are above sea level; the global terrain north of about 60 degrees is partly
       above the ellipsoid, 20 to 30 m higher. The rings round this one are global, so the detailed
       patch is moved to match them, or its edge stands as a wall. The shift is the median gap
       between the two, so hills and valleys inside keep their true shape. */
    {
      const B = x.data.base, ref = bare || surf, g = [];
      if (B && ref) for (let i = 0; i < ref.length; i += 53) { const v = ref[i], b = B[i]; if (v === v && v !== 0 && b === b) g.push(b - v); }
      if (g.length > 50) {
        g.sort((p, q) => p - q);
        const off = g[g.length >> 1];
        if (Math.abs(off) > 2 && Math.abs(off) < 60) {
          for (const a of [surf, bare]) if (a) for (let i = 0; i < a.length; i++) if (a[i] === a[i] && a[i] !== 0) a[i] += off;
          this.datumShift = off;
        } else this.datumShift = 0;
      }
    }
    /* Outside its survey the service answers 0 m rather than nothing, and a surface can only sit on
       the ground or up to a tall tree or building above it. Anything else is not a surface: the
       bare-earth height stays. */
    for (let i = 0; i < surf.length; i++) {
      const v = surf[i];
      if (v !== v) continue;
      if (v === 0 || v < H[i] - 120 || v > H[i] + 460) surf[i] = NaN;
    }
    /* a 3 by 3 median takes out lone spikes (poles, pylons, birds in the scan) and keeps anything
       wider than a pixel, which is every tree crown and building */
    const med = new Float32Array(surf.length).fill(NaN), win = new Float32Array(9);
    for (let j = 1; j < W - 1; j++) for (let i = 1; i < W - 1; i++) {
      let k = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const v = surf[(j + dj) * W + i + di]; if (v === v) win[k++] = v; }
      if (k < 5) continue;
      const a = win.subarray(0, k).sort(); med[j * W + i] = a[k >> 1];
    }
    /* building outlines stay sharp: the median would round every corner */
    if (kind) for (let i = 0; i < med.length; i++) if (kind[i] === 2 && surf[i] === surf[i]) med[i] = surf[i];
    /* Right beside the eye a 2.8 m grid cannot draw a tree, only a shard, so the surface fades to
       bare ground inside about 100 m: the view is the one from a clearing, which is where a tripod
       goes anyway. */
    const m = r.mPerPx, bareAt = (i, j) => {
      if (!bare || i < 0 || j < 0 || i >= W || j >= W) return NaN;
      const v = bare[j * W + i];
      /* the coarse global terrain can be 50 m out on an Alpine slope, so only gross errors are refused */
      return v === v && v !== 0 && v > H[j * W + i] - 120 && v < H[j * W + i] + 120 ? v : NaN;
    };
    const canopy = new Float32Array(H.length), bldW = new Float32Array(H.length), treeH = new Float32Array(H.length), bareK = new Float32Array(H.length);
    let got = 0;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, v = med[k];
      if (v !== v) continue;
      got++;
      const b0 = bareAt(i, j), isB = !!kind && kind[k] === 2 && (b0 !== b0 || v - b0 > 1.5);
      if (isB) bldW[k] = 1;
      else if (b0 === b0) canopy[k] = ss(1.5, 5, v - b0);
      const d = Math.hypot(i - ci, j - cj) * m;
      const tall = !isB && b0 === b0 && v - b0 > 2.5;
      if (tall) { treeH[k] = v - b0; bareK[k] = b0; }
      /* woods near the eye come down to the ground: the trees are drawn as trees instead */
      if (tall && d < 400) H[k] = b0 + (v - b0) * ss(330, 400, d);
      /* a house keeps its shape much closer than a tree does: its walls are what the grid can draw */
      else if (d < 110) {
        const b = bareAt(i, j), base = b === b ? b : H[k];
        H[k] = base + (v - base) * (isB ? ss(8, 25, d) : ss(35, 110, d));
      } else H[k] = v;
    }
    if (got < H.length * 0.02) { say({ state: 'none', name: src.name }); return; }
    /* the eye stands on the highest point of the finished ground within two pixels (about 5 m). On a
       40 degree slope the ground rises more than eye height across one pixel, and an eye below the
       surface sees straight through its underside into the sky. */
    {
      let g = -1e9;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const i = ci + dx, j = cj + dy; if (i < 0 || j < 0 || i >= W || j >= W) continue;
        const v = H[j * W + i]; if (v === v && v > g) g = v;
      }
      if (g > -1e8) this.ground = g;
    }
    /* the last 40 pixels of the patch ease into the global terrain, so what little step is left after
       the shift becomes a slope rather than a wall */
    {
      const B = x.data.base, E = 40;
      if (B) for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const e = Math.min(i, j, W - 1 - i, W - 1 - j); if (e >= E) continue;
        const k = j * W + i, b = B[k]; if (b !== b) continue;
        const t = ss(0, E, e); H[k] = b + (H[k] - b) * t; treeH[k] *= t;
      }
    }
    /* beyond the trees drawn one by one, a wood is still a raised blanket; its edge would be a sheer
       wall with the photograph smeared down it. Softening the canopy height over about 15 m turns
       the edge into a slope, which is how a wood's edge reads at a distance anyway. */
    {
      const R = 2, tmp = new Float32Array(H.length), sm = new Float32Array(H.length), n = 2 * R + 1;
      for (let j = 0; j < W; j++) { let s = 0; for (let i = -R; i <= R; i++) s += treeH[j * W + clamp(i, 0, W - 1)]; for (let i = 0; i < W; i++) { tmp[j * W + i] = s / n; s += treeH[j * W + Math.min(W - 1, i + R + 1)] - treeH[j * W + Math.max(0, i - R)]; } }
      for (let i = 0; i < W; i++) { let s = 0; for (let j = -R; j <= R; j++) s += tmp[clamp(j, 0, W - 1) * W + i]; for (let j = 0; j < W; j++) { sm[j * W + i] = s / n; s += tmp[Math.min(W - 1, j + R + 1) * W + i] - tmp[Math.max(0, j - R) * W + i]; } }
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i; if (bldW[k] > 0) continue;
        const dd = Math.hypot(i - ci, j - cj) * m; if (dd < 330) continue;
        const b = bareAt(i, j); if (b !== b) continue;
        if (sm[k] > 0.3 || treeH[k] > 0) { const t = ss(330, 400, dd); H[k] = b + sm[k] * t; canopy[k] = ss(0.5, 4, sm[k]); }
      }
    }
    x.data.canopy = canopy; x.data.bld = kind ? bldW : null;
    /* one tree for every few square metres of wood, spaced by height, none within 12 m of the eye.
       Conifers become more likely to the north and higher up; the data does not say which is which. */
    {
      const rnd = (k, s) => { let v = (k * 374761393 + s * 668265263) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
      const pA = m * m, pc = clamp((lat - 46) / 12, 0.2, 0.9) + (this.ground > 600 ? 0.25 : 0);
      const per = k => { const s = clamp(0.3 * treeH[k], 3.5, 9); return pA / (s * s); };
      const near = (i, j) => { const dd = Math.hypot(i - ci, j - cj) * m; return dd >= 12 && dd <= 400; };
      let est = 0;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (treeH[k] > 3 && near(i, j)) est += per(k); }
      const scale = Math.min(1, 16000 / Math.max(1, est)), out = [];
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i; if (!(treeH[k] > 3) || !near(i, j)) continue;
        const n = per(k) * scale, c = Math.floor(n) + (rnd(k, 1) < n - Math.floor(n) ? 1 : 0);
        for (let t = 0; t < c; t++) {
          const o = 2 + t * 5;
          out.push(i + rnd(k, o), j + rnd(k, o + 1), clamp(treeH[k] * (0.75 + 0.35 * rnd(k, o + 2)), 2.5, 60), rnd(k, o + 3) < pc ? 1 : 0, rnd(k, o + 4), bareK[k]);
        }
      }
      x.data.trees = out.length ? Float32Array.from(out) : null;
    }
    const mesh = buildMesh({ ...r, step: 1 }, x.data, lat, lon, null);
    const gl = this.G.gl, old = x.gpu;
    x.gpu = upload(this.G, mesh);
    [old.pos, old.uv, old.nrm, old.idx, old.can].forEach(b => b && gl.deleteBuffer(b));
    this.version++;
    this.treeCount = mesh.trees || 0;
    say({ state: 'on', name: src.name, credit: src.credit, terrainOnly: !!src.terrainOnly, share: got / H.length, trees: mesh.trees || 0, m: r.mPerPx, km: r.n * TILE * r.mPerPx / 1000 });
  }
  /* The light that throws shadows: the sun while it is lighting the ground, otherwise the moon. */
  shadowLight(light){
    if (!CFG.shadows || light.shadows === false) return null;
    if (ss(-1.5, 6, light.sunAlt) > 0.01) return { sun: 1, az: light.sunAz, alt: Math.max(light.sunAlt, 0.5) };
    if (light.moonAlt > 0 && (light.moonFrac || 0) > 0.02) return { sun: 0, az: light.moonAz, alt: light.moonAlt };
    return null;
  }
  /* Two maps looking down the light: 1.6 km either side of the eye at about 0.8 m a texel, and 24 km
     at about 12 m. Redrawn only when the light has moved or the ground has changed. */
  shadowPass(sl){
    const G = this.G, gl = G.gl, S = G.shadow;
    if (!S || !S.ok) return false;
    const key = this.version + '|' + sl.az.toFixed(2) + '|' + sl.alt.toFixed(2);
    if (S.key === key) return true;
    const alt = Math.min(sl.alt, 88), Ld = dirOf(sl.az, alt), D = 200000;
    const g = this.ground;
    const V = lookAt([Ld[0] * D, Ld[1] * D, g + Ld[2] * D], sl.az + 180, -alt);
    gl.useProgram(S.prog);
    for (let k = 0; k < 8; k++) if (k !== S.aPos) gl.disableVertexAttribArray(k);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2.0, 4.0);
    gl.colorMask(false, false, false, false);
    [1600, 24000].forEach((half, c) => {
      let l = 1e9, r = -1e9, b = 1e9, t = -1e9;
      for (const cx of [-half, half]) for (const cy of [-half, half]) for (const cz of [g - 900, g + 1500]) {
        const X = V[0] * cx + V[4] * cy + V[8] * cz + V[12], Y = V[1] * cx + V[5] * cy + V[9] * cz + V[13];
        l = Math.min(l, X); r = Math.max(r, X); b = Math.min(b, Y); t = Math.max(t, Y);
      }
      const m = S.maps[c];
      m.mvp = mul(ortho(l, r, b, t, D - 160000, D + 160000), V);
      m.bias = (c ? 6 : 0.35) / 320000;
      gl.bindFramebuffer(gl.FRAMEBUFFER, m.fb);
      gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(S.uMVP, false, m.mvp);
      for (const x of this.rings) {
        if (!x || !x.gpu) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, x.gpu.pos); gl.enableVertexAttribArray(S.aPos); gl.vertexAttribPointer(S.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, x.gpu.idx);
        gl.drawElements(gl.TRIANGLES, x.gpu.count, gl.UNSIGNED_INT, 0);
      }
    });
    gl.colorMask(true, true, true, true);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.key = key;
    return true;
  }
  heightAt(lat, lon){
    for (const x of this.rings) {
      if (!x) continue;
      const r = x.r, W = x.data.W;
      const fx = (lonToX(lon, r.z) - r.x0) * TILE, fy = (latToY(lat, r.z) - r.y0) * TILE;
      if (fx < 0 || fy < 0 || fx >= W || fy >= W) continue;
      return x.data.heights[Math.floor(fy) * W + Math.floor(fx)];
    }
    return null;
  }
  /* view: { az, alt, hfov, vfov, eyeM }; light: { sunAz, sunAlt, moonAz, moonAlt, moonFrac, gain,
     mode, lpArt, hazeKm, haze, hazeRow (128 RGBA), nv } */
  render(view, light){
    const G = this.G; if (!G) return;
    const gl = G.gl, cv = this.canvas;
    const sl = this.rings.some(Boolean) ? this.shadowLight(light) : null;
    const shOn = sl ? this.shadowPass(sl) : false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.rings.some(Boolean)) return;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.useProgram(G.prog);
    gl.activeTexture(gl.TEXTURE0);
    const eye = [0, 0, this.ground + view.eyeM];
    const VIEW = lookAt(eye, view.az, view.alt);
    const Lc = lightFor(light);
    gl.uniform3fv(G.u.uSun, dirOf(light.sunAz, Math.max(light.sunAlt, 0.5)));
    gl.uniform3fv(G.u.uMoon, dirOf(light.moonAz, Math.max(light.moonAlt, 0)));
    const SM = G.shadow && G.shadow.maps;
    gl.uniform1f(G.u.uShOn, shOn ? 1 : 0);
    gl.uniform1f(G.u.uShSun, sl && sl.sun ? 1 : 0);
    if (SM) {
      gl.uniformMatrix4fv(G.u.uL0, false, SM[0].mvp); gl.uniformMatrix4fv(G.u.uL1, false, SM[1].mvp);
      gl.uniform2f(G.u.uBias, SM[0].bias || 0, SM[1].bias || 0);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, SM[0].tex); gl.uniform1i(G.u.uSh0, 2);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, SM[1].tex); gl.uniform1i(G.u.uSh1, 3);
    }
    gl.uniform3fv(G.u.uSunCol, Lc.sunCol);
    gl.uniform3fv(G.u.uMoonCol, Lc.moonCol);
    gl.uniform3fv(G.u.uSkyCol, Lc.sky);
    gl.uniform1f(G.u.uScot, Lc.scot);
    gl.uniform1f(G.u.uSil, Lc.sil);
    gl.uniform1f(G.u.uHazeM, (light.hazeKm || 60) * 1000);
    gl.uniform1f(G.u.uHaze, light.haze == null ? 0.9 : light.haze);
    gl.uniform1f(G.u.uNv, light.nv ? 1 : 0);
    gl.uniform2f(G.u.uRes, cv.width, cv.height);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, G.hazeTex);
    if (light.hazeRow) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, 1, gl.RGBA, gl.UNSIGNED_BYTE, light.hazeRow);
    gl.uniform1i(G.u.uHazeTex, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(G.u.uTex, 0);
    const now = performance.now();
    /* Two depth ranges, far then near, so the ground at your feet is not clipped away by a near plane
       set wide for the sake of the distant ridges. Near geometry always wins, as it should. */
    gl.enable(gl.POLYGON_OFFSET_FILL);
    const PASSES = [[1400, 700000], [0.2, 1500]];
    for (let pass = 0; pass < 2; pass++) {
    if (pass) gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(G.u.uMVP, false, mul(perspective(view.hfov, view.vfov, PASSES[pass][0], PASSES[pass][1]), VIEW));
    for (let i = 0; i < this.rings.length; i++) {
      const x = this.rings[i]; if (!x || !x.gpu) continue;
      gl.polygonOffset(i * 2, i * 2);
      gl.bindTexture(gl.TEXTURE_2D, x.tex.tex);
      if (x.dirty && now - x.mipAt > 300 && pass === 0) { gl.generateMipmap(gl.TEXTURE_2D); x.dirty = false; x.mipAt = now; }
      const g = x.gpu;
      gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.enableVertexAttribArray(G.a.pos); gl.vertexAttribPointer(G.a.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.uv); gl.enableVertexAttribArray(G.a.uv); gl.vertexAttribPointer(G.a.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.nrm); gl.enableVertexAttribArray(G.a.nrm); gl.vertexAttribPointer(G.a.nrm, 3, gl.FLOAT, false, 0, 0);
      if (G.a.can >= 0) {
        if (g.can) { gl.bindBuffer(gl.ARRAY_BUFFER, g.can); gl.enableVertexAttribArray(G.a.can); gl.vertexAttribPointer(G.a.can, 2, gl.FLOAT, false, 0, 0); }
        else { gl.disableVertexAttribArray(G.a.can); gl.vertexAttrib2f(G.a.can, 0, 0); }
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
      gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0);
    }
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }
  /* true while the sharp tiles are still landing: the caller keeps repainting so the mipmaps catch up */
  get sharpening(){ return this.detail.total > 0 && (this.detail.done < this.detail.total || this.rings.some(x => x && x.dirty)); }
  resolution(){
    const p = this.plan; if (!p) return [];
    return p.rings.slice(0, 3).map((r, i) => ({ m: r.imgM, km: r.n * TILE * r.mPerPx / 2000 }));
  }
}

/* ---------------- light domes ----------------
   Where the light on the horizon comes from, bearing by bearing: the atlas's artificial brightness
   sampled out to 200 km, each sample weighted by the area it stands for and Walker's d^-2.5 fall-off,
   which on log-spaced samples comes to d^-0.5. A near town makes a tall dome, a far city a low one.
   The overall strength comes from the pin's own artificial brightness, so a dark site's domes are
   faint however many towns sit on its horizon. */
function domeProfile(lat, lon){
  const E = window.NoctoEngine; if (!E || !E.atlasSky) return null;
  const artOf = (la, lo) => { const s = E.atlasSky(la, lo); return s && isFinite(s.sqm) ? Math.max(0, Math.pow(10, 0.4 * (22 - s.sqm)) - 1) : 0; };
  const N = 180, J = 40, S = new Float32Array(N), Hh = new Float32Array(N);
  const ds = Array.from({ length: J }, (_, j) => 3 * Math.pow(200 / 3, j / (J - 1)));
  const A = new Float32Array(N * J);
  for (let i = 0; i < N; i++) for (let j = 0; j < J; j++) { const p = destPoint(lat, lon, i * 2, ds[j] * 1000); A[i * J + j] = artOf(p[0], p[1]); }
  /* only towns make domes: the region's own background, the lower quarter of every sample, comes off first */
  const sorted = Array.from(A).sort((a, b) => a - b), bg = sorted[Math.floor(sorted.length * 0.25)];
  for (let i = 0; i < N; i++) {
    let sum = 0, hw = 0;
    for (let j = 0; j < J; j++) {
      const w = Math.max(0, A[i * J + j] - bg) * Math.pow(ds[j], -0.5);
      sum += w; hw += w * Math.atan(3 / ds[j]) * R2D;
    }
    S[i] = sum; Hh[i] = sum > 0 ? clamp(hw / sum, 2, 14) : 5;
  }
  let mean = 0; for (let i = 0; i < N; i++) mean += S[i] / N;
  if (!(mean > 0)) return null;
  const rel = new Float32Array(N);
  for (let i = 0; i < N; i++) rel[i] = S[i] / mean;
  return { rel, h: Hh, art: artOf(lat, lon), N };
}
/* The moonlit sky and the domes, on a low grid scaled up and added over whatever sky is there. */
const extraCanvases = new Map();
function skyExtras(ctx, W, H, view, sky, o){
  const S = window.NoctoScout; if (!S) return;
  o = o || {};
  const gw = 96, gh = Math.max(8, Math.round(96 * H / W)), key = gw + 'x' + gh;
  let cv = extraCanvases.get(key);
  if (!cv) { cv = document.createElement('canvas'); cv.width = gw; cv.height = gh; extraCanvases.set(key, cv); }
  const g = o.gain == null ? 1 : o.gain, sa = sky.sun.alt;
  const day = clamp((sa + 3) / 9, 0, 1), night = clamp((-sa - 3) / 12, 0, 1);
  const mUp = clamp(sky.moon.alt / 8, 0, 1) * Math.pow(sky.moon.frac, 1.5) * (1 - day);
  const dm = o.domes, domeK = dm ? dm.art * night * g : 0;
  if (mUp < 0.004 && domeK < 0.0005) return;
  const pr = S.projector(view.alt, view.az, view.hfov, view.vfov, gw, gh);
  const md = dirOf(sky.moon.az, sky.moon.alt);
  const cx = cv.getContext('2d'), id = cx.createImageData(gw, gh), px = id.data;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const d = pr.unproject(i + 0.5, j + 0.5), alt = d.alt, az = d.az, a0 = Math.max(alt, 0);
    let r = 0, gg = 0, b = 0;
    if (mUp >= 0.004) {
      const th = Math.acos(clamp(dot(dirOf(az, alt), md), -1, 1)) * R2D;
      const m = mUp * g * (0.45 + 1.4 * Math.exp(-th / 14) + 0.5 * Math.exp(-a0 / 12));
      r += 0.13 * m; gg += 0.21 * m; b += 0.4 * m;
    }
    if (domeK >= 0.0005) {
      const f = (((az % 360) + 360) % 360) / 2, i0 = Math.floor(f) % dm.N, i1 = (i0 + 1) % dm.N, t = f - Math.floor(f);
      const rel = dm.rel[i0] + (dm.rel[i1] - dm.rel[i0]) * t, h = dm.h[i0] + (dm.h[i1] - dm.h[i0]) * t;
      const x = domeK * rel * (0.25 + 3.5 * Math.exp(-a0 / h)) * 0.07;
      const v = (1 - Math.exp(-x)) * 0.75;
      r += v; gg += v * 0.62; b += v * 0.34;
    }
    const k = (j * gw + i) * 4;
    px[k] = Math.min(255, r * 255); px[k + 1] = Math.min(255, gg * 255); px[k + 2] = Math.min(255, b * 255); px[k + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cv, 0, 0, W, H);
  ctx.restore();
}
/* The haze colour for each column of the screen: the sky one degree above the horizon, without the
   stars, with the moon's wash and the domes. */
let hazeCv = null, hazeRows = null, hazeKey = '';
const HAZE_W = 128, HAZE_H = 72;
function hazeRow(view, sky, o){
  const S = window.NoctoScout; if (!S) return null;
  if (!hazeCv) { hazeCv = document.createElement('canvas'); hazeCv.width = HAZE_W; hazeCv.height = HAZE_H; }
  const cx = hazeCv.getContext('2d', { willReadFrequently: true });
  const g = o && o.gain != null ? o.gain : 1;
  S.skyBackground(cx, HAZE_W, HAZE_H, view.alt, view.az, view.hfov, view.vfov, sky.sun.az, sky.sun.alt, g);
  skyExtras(cx, HAZE_W, HAZE_H, view, sky, o);
  const key = [view.alt.toFixed(2), view.hfov.toFixed(2), view.vfov.toFixed(2)].join('|');
  if (key !== hazeKey) {
    hazeKey = key;
    const pr = S.projector(view.alt, view.az, view.hfov, view.vfov, HAZE_W, HAZE_H);
    hazeRows = new Int16Array(HAZE_W);
    for (let i = 0; i < HAZE_W; i++) {
      let best = 0, bd = 1e9;
      for (let j = 0; j < HAZE_H; j++) { const d = Math.abs(pr.unproject(i + 0.5, j + 0.5).alt - 1); if (d < bd) { bd = d; best = j; } }
      hazeRows[i] = best;
    }
  }
  const px = cx.getImageData(0, 0, HAZE_W, HAZE_H).data, out = new Uint8Array(HAZE_W * 4);
  for (let i = 0; i < HAZE_W; i++) {
    const k = (hazeRows[i] * HAZE_W + i) * 4;
    out[i * 4] = px[k]; out[i * 4 + 1] = px[k + 1]; out[i * 4 + 2] = px[k + 2]; out[i * 4 + 3] = 255;
  }
  return out;
}

window.NoctoScoutHD = { Scene, plan, lightFor, domeProfile, skyExtras, hazeRow, config, SURFACES };
})();
