/* Noctography surfaces: trees, buildings and fine terrain for Scout HD, from every open source that
   can be read from a web page, plus a proxy route for the ones that cannot.

   Scout HD hands over the inner ring as a Web Mercator pixel grid (ctx). Each source answers with
   heights on that same grid:
     surface  ground plus everything on it (canopy, roofs), metres
     terrain  bare ground, metres
   Either may be missing. A source is picked by the first coverage box that holds the pin; global
   overlays (tree height, OSM buildings) then fill in wherever the national source had nothing.

   Config (NoctoSurfaces.config):
     proxy     base URL of the Noctography worker, for sources that refuse browser requests
     tokens    { dk: '...' } for Dataforsyningen (free account)
*/
(function(){
if (window.NoctoSurfaces) return;

const CFG = { proxy: 'https://noctography-terrain.jpchaworth.workers.dev', tokens: { dk: '251aec5fc0af6b1a4dfc455a93535553', fi: '65ae9793-25d9-4b89-8944-2605e4945b0f' } };
const D2R = Math.PI / 180, R2D = 180 / Math.PI, MR = 6378137;
const C3857 = 'http://www.opengis.net/def/crs/EPSG/0/3857';

/* ---------------- GeoTIFF ---------------- */
let GTp = null;
function GT(){ return GTp || (GTp = import('https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm')); }
/* Every answer is kept in the browser's cache for the offline store (see offline in the HD file);
   a cached answer is used first, so a saved location opens with no signal. */
const CACHE = 'noctography-scout-v1';
async function fetchBuf(url, ms){
  const O = window.NoctoOffline;
  if (O) { const hit = await O.get(url); if (hit) return hit; }
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms || 30000);
  try {
    const r = await fetch(url, { signal: ac.signal }); if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (O) O.put(url, buf);
    return buf;
  }
  catch (e) { return null; } finally { clearTimeout(t); }
}
/* WCS answers are sometimes a multipart body with the GML description first: find the TIFF in it */
function tiffStart(buf){
  const u = new Uint8Array(buf);
  for (let i = 0; i < Math.min(u.length - 4, 65536); i++) {
    if ((u[i] === 73 && u[i + 1] === 73 && u[i + 2] === 42 && u[i + 3] === 0) || (u[i] === 77 && u[i + 1] === 77 && u[i + 2] === 0 && u[i + 3] === 42)) return i;
  }
  return -1;
}
async function decodeTiff(buf){
  if (!buf) return null;
  const at = tiffStart(buf); if (at < 0) return null;
  const G = await GT();
  const tif = await G.fromArrayBuffer(at ? buf.slice(at) : buf);
  const img = await tif.getImage();
  const r = await img.readRasters({ interleave: false });
  return { W: img.getWidth(), H: img.getHeight(), data: r[0], nodata: img.getGDALNoData() };
}
function clean(t, lo, hi){
  if (!t) return null;
  const out = new Float32Array(t.W * t.H), nd = t.nodata;
  for (let i = 0; i < out.length; i++) {
    const v = t.data[i];
    out[i] = (v === nd || !(v > (lo == null ? -500 : lo) && v < (hi == null ? 9000 : hi))) ? NaN : v;
  }
  return { W: t.W, H: t.H, data: out };
}

/* ---------------- projections ---------------- */
/* Swiss LV95, swisstopo's approximate formulas: about a metre, which is under a pixel here */
function lv95(lat, lon){
  const p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
  return [2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l,
          1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p];
}
/* Transverse Mercator on GRS80 (Snyder), for NZTM and UTM grids */
function tm(lon0, k0, FE, FN){
  const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const M = ph => a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * ph - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * ph)
    + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * ph) - (35 * e2 ** 3 / 3072) * Math.sin(6 * ph));
  return (lat, lon) => {
    const ph = lat * D2R, N = a / Math.sqrt(1 - e2 * Math.sin(ph) ** 2), T = Math.tan(ph) ** 2, C = ep2 * Math.cos(ph) ** 2;
    const A = (lon - lon0) * D2R * Math.cos(ph);
    const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120);
    const y = k0 * (M(ph) + N * Math.tan(ph) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
    return [FE + x, FN + y];
  };
}
const nztm = tm(173, 0.9996, 1600000, 10000000);
const utm32 = tm(9, 0.9996, 500000, 0);
const sweref = tm(15, 0.9996, 500000, 0);

/* British National Grid: WGS84 to OSGB36 by the OS 7-parameter Helmert (about 5 m, two pixels
   here), then Transverse Mercator on Airy 1830 */
function osgb(lat, lon){
  const a1 = 6378137, b1 = 6356752.3141, e21 = 1 - b1 * b1 / (a1 * a1);
  const ph = lat * D2R, la = lon * D2R, nu = a1 / Math.sqrt(1 - e21 * Math.sin(ph) ** 2);
  const x = nu * Math.cos(ph) * Math.cos(la), y = nu * Math.cos(ph) * Math.sin(la), z = nu * (1 - e21) * Math.sin(ph);
  const tx = -446.448, ty = 125.157, tz = -542.06, sc = 20.4894e-6, rx = -0.1502 / 3600 * D2R, ry = -0.247 / 3600 * D2R, rz = -0.8421 / 3600 * D2R;
  const x2 = tx + (1 + sc) * x - rz * y + ry * z, y2 = ty + rz * x + (1 + sc) * y - rx * z, z2 = tz - ry * x + rx * y + (1 + sc) * z;
  const a = 6377563.396, b = 6356256.909, e2 = 1 - b * b / (a * a), p = Math.hypot(x2, y2);
  let phi = Math.atan2(z2, p * (1 - e2));
  for (let i = 0; i < 6; i++) { const v = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2); phi = Math.atan2(z2 + e2 * v * Math.sin(phi), p); }
  const lam = Math.atan2(y2, x2);
  const F0 = 0.9996012717, ph0 = 49 * D2R, la0 = -2 * D2R, N0 = -100000, E0 = 400000, n = (a - b) / (a + b);
  const sp = Math.sin(phi), cp = Math.cos(phi), tp = Math.tan(phi);
  const v = a * F0 / Math.sqrt(1 - e2 * sp * sp), rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sp * sp, 1.5), eta2 = v / rho - 1;
  const dp = phi - ph0, sp2 = phi + ph0;
  const M = b * F0 * ((1 + n + 5 / 4 * n * n + 5 / 4 * n ** 3) * dp - (3 * n + 3 * n * n + 21 / 8 * n ** 3) * Math.sin(dp) * Math.cos(sp2)
    + (15 / 8 * n * n + 15 / 8 * n ** 3) * Math.sin(2 * dp) * Math.cos(2 * sp2) - 35 / 24 * n ** 3 * Math.sin(3 * dp) * Math.cos(3 * sp2));
  const I = M + N0, II = v / 2 * sp * cp, III = v / 24 * sp * cp ** 3 * (5 - tp * tp + 9 * eta2), IIIA = v / 720 * sp * cp ** 5 * (61 - 58 * tp * tp + tp ** 4);
  const IV = v * cp, V = v / 6 * cp ** 3 * (v / rho - tp * tp), VI = v / 120 * cp ** 5 * (5 - 18 * tp * tp + tp ** 4 + 14 * eta2 - 58 * tp * tp * eta2);
  const dl = lam - la0;
  return [E0 + IV * dl + V * dl ** 3 + VI * dl ** 5, I + II * dl * dl + III * dl ** 4 + IIIA * dl ** 6];
}
/* Canada Atlas Lambert (EPSG:3979): Lambert conformal conic on GRS80, parallels 49 and 77 */
const lcc3979 = (() => {
  const a = 6378137, f = 1 / 298.257222101, e = Math.sqrt(f * (2 - f));
  const p1 = 49 * D2R, p2 = 77 * D2R, p0 = 49 * D2R, l0 = -95 * D2R;
  const m = p => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) ** 2);
  const t = p => Math.tan(Math.PI / 4 - p / 2) / Math.pow((1 - e * Math.sin(p)) / (1 + e * Math.sin(p)), e / 2);
  const n = (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2))), F = m(p1) / (n * Math.pow(t(p1), n)), r0 = a * F * Math.pow(t(p0), n);
  return (lat, lon) => { const r = a * F * Math.pow(t(lat * D2R), n), th = n * (lon * D2R - l0); return [r * Math.sin(th), r0 - r * Math.cos(th)]; };
})();

/* ---------------- sampling ---------------- */
/* Fill the ring grid from rasters on another grid. Each raster: { W, H, data, px(lat, lon) -> [fx, fy] } */
function resample(ctx, rasters){
  const W = ctx.W, out = new Float32Array(W * W).fill(NaN);
  for (let j = 0; j < W; j++) {
    const lat = ctx.latOf[j];
    for (let i = 0; i < W; i++) {
      const lon = ctx.lonOf[i];
      for (const r of rasters) {
        const p = r.px(lat, lon), fx = p[0] - 0.5, fy = p[1] - 0.5;
        if (fx < 0 || fy < 0 || fx > r.W - 1 || fy > r.H - 1) continue;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(r.W - 1, x0 + 1), y1 = Math.min(r.H - 1, y0 + 1), u = fx - x0, v = fy - y0;
        const q = [[r.data[y0 * r.W + x0], (1 - u) * (1 - v)], [r.data[y0 * r.W + x1], u * (1 - v)], [r.data[y1 * r.W + x0], (1 - u) * v], [r.data[y1 * r.W + x1], u * v]];
        let s = 0, w = 0;
        for (const [val, k] of q) if (val === val) { s += val * k; w += k; }
        if (w > 0.25) { out[j * W + i] = s / w; break; }
      }
    }
  }
  return out;
}
/* exact zeros are how several services say "outside my survey", so they don't count as data */
function share(a){ if (!a) return 0; let k = 0; for (let i = 0; i < a.length; i += 11) if (a[i] === a[i] && a[i] !== 0) k++; return k / Math.ceil(a.length / 11); }
/* a national answer that disagrees with the global ground by more than 150 m on average is not
   this place: a coverage box that overreaches, or a service answering for somewhere else */
function agrees(a, H){
  if (!a || !H) return true;
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 97) { const v = a[i], g = H[i]; if (v === v && v !== 0 && g === g) { s += Math.abs(v - g); n++; } }
  return !n || s / n < 150;
}
const within = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

/* ---------------- source kinds ---------------- */
/* WCS 2.0 that reprojects to Web Mercator itself: the answer lands on the ring grid as it is */
function wcs3857(base, id, ax, wrap){
  ax = ax || ['X', 'Y'];
  return async ctx => {
    const b = ctx.box;
    const url = (wrap || (u => u))(base + (base.includes('?') ? '&' : '?') + 'service=WCS&request=GetCoverage&version=2.0.1&CoverageId=' + encodeURIComponent(id) +
      '&format=image/tiff&subsettingCrs=' + C3857 + '&outputCrs=' + C3857 +
      '&subset=' + ax[0] + '(' + b.x0.toFixed(2) + ',' + b.x1.toFixed(2) + ')&subset=' + ax[1] + '(' + b.y0.toFixed(2) + ',' + b.y1.toFixed(2) + ')' +
      '&scalesize=' + ax[0] + '(' + ctx.W + '),' + ax[1] + '(' + ctx.W + ')');
    const t = clean(await decodeTiff(await fetchBuf(url)));
    if (!t) return null;
    if (t.W === ctx.W && t.H === ctx.W) return t.data;
    /* some services (Finland) ignore the size asked for and answer on their own grid over the same box */
    const mx = lo => MR * lo * D2R, my = la => MR * Math.log(Math.tan(Math.PI / 4 + la * D2R / 2));
    return resample(ctx, [{ W: t.W, H: t.H, data: t.data, px: (la, lo) => [(mx(lo) - b.x0) / (b.x1 - b.x0) * t.W, (b.y1 - my(la)) / (b.y1 - b.y0) * t.H] }]);
  };
}
/* WCS 2.0 on a latitude and longitude grid (ETRS89 or WGS84), resampled here */
function wcsLatLon(base, id, ax, degPx){
  return async ctx => {
    const b = ctx.geo, pad = 0.0005;
    const s = b.s - pad, n = b.n + pad, w = b.w - pad, e = b.e + pad;
    const nx = Math.min(1600, Math.ceil((e - w) / degPx.lon)), ny = Math.min(1600, Math.ceil((n - s) / degPx.lat));
    const url = base + (base.includes('?') ? '&' : '?') + 'service=WCS&request=GetCoverage&version=2.0.1&CoverageId=' + encodeURIComponent(id) +
      '&format=image/tiff&subset=' + ax.lat + '(' + s.toFixed(6) + ',' + n.toFixed(6) + ')&subset=' + ax.lon + '(' + w.toFixed(6) + ',' + e.toFixed(6) + ')' +
      (ax.scale ? '&scalesize=' + ax.lat + '(' + ny + '),' + ax.lon + '(' + nx + ')' : '');
    const t = clean(await decodeTiff(await fetchBuf(url)));
    if (!t) return null;
    return resample(ctx, [{ W: t.W, H: t.H, data: t.data, px: (la, lo) => [(lo - w) / (e - w) * t.W, (n - la) / (n - s) * t.H] }]);
  };
}
/* ArcGIS ImageServer exportImage in Web Mercator, straight onto the ring grid */
function arcgis3857(base, extra){
  return async ctx => {
    const b = ctx.box;
    const url = base + '/exportImage?bbox=' + [b.x0, b.y0, b.x1, b.y1].map(v => v.toFixed(2)).join(',') + '&bboxSR=3857&imageSR=3857&size=' + ctx.W + ',' + ctx.W +
      '&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image' + (extra || '');
    const t = clean(await decodeTiff(await fetchBuf(url, 40000)));
    return t && t.W === ctx.W ? t.data : null;
  };
}
/* Cloud-optimised GeoTIFF tiles on a projected grid: read only the window the ring needs, at about
   the ring's own resolution, from each tile that touches it */
async function readCogWindows(ctx, hrefs, proj){
  const G = await GT(), rasters = [];
  const c = ctx.geo, corners = [[c.n, c.w], [c.n, c.e], [c.s, c.w], [c.s, c.e], [(c.n + c.s) / 2, c.w], [(c.n + c.s) / 2, c.e]].map(p => proj(p[0], p[1]));
  const E0 = Math.min(...corners.map(p => p[0])) - 20, E1 = Math.max(...corners.map(p => p[0])) + 20;
  const N0 = Math.min(...corners.map(p => p[1])) - 20, N1 = Math.max(...corners.map(p => p[1])) + 20;
  await Promise.all(hrefs.map(async href => {
    try {
      const tif = await G.fromUrl(href, { allowFullFile: false });
      const img = await tif.getImage();
      const [bx0, by0, bx1, by1] = img.getBoundingBox(), iw = img.getWidth(), ih = img.getHeight();
      const rx = (bx1 - bx0) / iw, ry = (by1 - by0) / ih;
      const wx0 = Math.max(0, Math.floor((E0 - bx0) / rx)), wx1 = Math.min(iw, Math.ceil((E1 - bx0) / rx));
      const wy0 = Math.max(0, Math.floor((by1 - N1) / ry)), wy1 = Math.min(ih, Math.ceil((by1 - N0) / ry));
      if (wx1 <= wx0 || wy1 <= wy0) return;
      const k = Math.max(1, ctx.m / rx), ow = Math.max(2, Math.round((wx1 - wx0) / k)), oh = Math.max(2, Math.round((wy1 - wy0) / k));
      const r = await img.readRasters({ window: [wx0, wy0, wx1, wy1], width: ow, height: oh, interleave: false, resampleMethod: 'bilinear' });
      const t = clean({ W: ow, H: oh, data: r[0], nodata: img.getGDALNoData() }, -120);
      const ex0 = bx0 + wx0 * rx, ny1 = by1 - wy0 * ry, sx = (wx1 - wx0) * rx / ow, sy = (wy1 - wy0) * ry / oh;
      rasters.push({ W: ow, H: oh, data: t.data, px: (la, lo) => { const p = proj(la, lo); return [(p[0] - ex0) / sx, (ny1 - p[1]) / sy]; } });
    } catch (e) {}
  }));
  if (!rasters.length) return null;
  /* project once per pixel, not once per tile */
  const cache = new Map();
  rasters.forEach(r => { const f = r.px; r.px = (la, lo) => f(la, lo); });
  return resample(ctx, rasters);
}

/* Sweden: Lantmäteriet's STAC catalogue is open to the page; the 2.5 km 1 m tiles it points to need
   the Geotorget login, which the worker adds. Bare ground only (Markhöjdmodell). */
function seStac(){
  return async ctx => {
    if (!CFG.proxy) return null;
    const c = ctx.geo;
    const j = await fetch('https://api.lantmateriet.se/stac-hojd/v1/search?limit=40&bbox=' + [c.w, c.s, c.e, c.n].map(v => v.toFixed(5)).join(','))
      .then(r => r.ok ? r.json() : null).catch(() => null);
    const hrefs = (j && j.features || []).filter(f => /^mhm-/.test(f.collection || ''))
      .map(f => f.assets && f.assets.data && f.assets.data.href).filter(Boolean)
      .map(h => CFG.proxy + '/fetch?url=' + encodeURIComponent(h));
    return hrefs.length ? readCogWindows(ctx, hrefs.slice(0, 24), sweref) : null;
  };
}
/* Switzerland: swisstopo STAC, 1 km tiles, newest survey per tile */
function swissStac(collection, pick){
  return async ctx => {
    const c = ctx.geo;
    const j = await fetch('https://data.geo.admin.ch/api/stac/v0.9/collections/' + collection + '/items?limit=100&bbox=' + [c.w, c.s, c.e, c.n].map(v => v.toFixed(5)).join(','))
      .then(r => r.ok ? r.json() : null).catch(() => null);
    if (!j || !j.features || !j.features.length) return null;
    const newest = new Map();
    j.features.forEach(f => {
      const tile = f.id.replace(/^.*_(\d{4}-\d{4})$/, '$1'), year = +(f.id.match(/_(\d{4})_/) || [0, 0])[1];
      const a = Object.values(f.assets).find(x => pick.test(x.href));
      if (!a) return;
      const cur = newest.get(tile);
      if (!cur || year > cur.year) newest.set(tile, { year, href: a.href });
    });
    return readCogWindows(ctx, [...newest.values()].map(v => v.href), lv95);
  };
}

/* New Zealand: LINZ elevation on S3. Tiles follow the Topo50 1:10k grid, so the tile names come from
   the NZTM position; the survey is the newest in the pin's region that holds them. */
const NZ_BASE = 'https://nz-elevation.s3.ap-southeast-2.amazonaws.com/';
const NZ_ROWS = 'AS AT AU AV AW AX AY AZ BA BB BC BD BE BF BG BH BJ BK BL BM BN BP BQ BR BS BT BU BV BW BX BY BZ CA CB CC CD CE CF CG CH CJ CK'.split(' ');
function nzTiles(ctx){
  const c = ctx.geo, pts = [[c.n, c.w], [c.n, c.e], [c.s, c.w], [c.s, c.e], [(c.n + c.s) / 2, (c.w + c.e) / 2]].map(p => nztm(p[0], p[1]));
  const names = new Set();
  const E0 = Math.min(...pts.map(p => p[0])), E1 = Math.max(...pts.map(p => p[0])), N0 = Math.min(...pts.map(p => p[1])), N1 = Math.max(...pts.map(p => p[1]));
  for (let E = E0; E <= E1 + 4799; E += 4800) for (let N = N0; N <= N1 + 7199; N += 7200) {
    const e = Math.min(E, E1), n = Math.min(N, N1);
    const col = Math.floor((e - 988000) / 24000), row = Math.floor((6234000 - n) / 36000);
    if (row < 0 || row >= NZ_ROWS.length) continue;
    const sc = Math.floor((e - (988000 + col * 24000)) / 4800) + 1, sr = Math.floor(((6234000 - row * 36000) - n) / 7200) + 1;
    names.add(NZ_ROWS[row] + String(col).padStart(2, '0') + '_10000_' + String(sr).padStart(2, '0') + String(sc).padStart(2, '0'));
  }
  return [...names];
}
let nzCatalog = null;
function nzCollections(){
  return nzCatalog || (nzCatalog = fetch(NZ_BASE + 'catalog.json').then(r => r.json()).then(j => j.links.filter(l => l.rel === 'child').map(l => l.href.replace(/^\.\//, ''))).catch(() => []));
}
const NZ_REGIONS = [
  ['northland', -36.4, -34.3, 172.5, 174.9], ['auckland', -37.3, -36.1, 174.2, 175.6], ['waikato', -39.4, -36.8, 174.5, 176.5],
  ['bay-of-plenty', -39.1, -37.3, 175.8, 178.6], ['gisborne', -39.1, -37.5, 177.0, 178.7], ['hawkes-bay', -40.5, -38.4, 176.0, 178.1],
  ['taranaki', -39.9, -38.7, 173.6, 175.1], ['manawatu-whanganui', -40.8, -38.4, 174.8, 176.9], ['wellington', -41.7, -40.5, 174.6, 176.5],
  ['tasman', -42.4, -40.4, 171.9, 173.4], ['nelson', -41.4, -41.0, 173.1, 173.6], ['marlborough', -42.6, -40.8, 172.6, 174.5],
  ['west-coast', -44.2, -40.9, 168.1, 172.6], ['canterbury', -45.0, -41.9, 169.5, 174.1], ['otago', -46.7, -44.1, 168.2, 171.3],
  ['southland', -47.4, -44.3, 166.3, 169.4]];
function nzSource(kind){
  return async ctx => {
    const regions = NZ_REGIONS.filter(r => ctx.lat >= r[1] && ctx.lat <= r[2] && ctx.lon >= r[3] && ctx.lon <= r[4]).map(r => r[0]);
    if (!regions.length) return null;
    const all = await nzCollections();
    const cands = all.filter(p => regions.some(r => p.startsWith(r + '/')) && p.includes('/' + kind + '_1m/'))
      .sort((a, b) => (b.match(/(\d{4})(?:-\d{4})?\/[^/]*_1m/) || [0, 0])[1] - (a.match(/(\d{4})(?:-\d{4})?\/[^/]*_1m/) || [0, 0])[1]);
    const tiles = nzTiles(ctx), hrefs = [];
    for (const col of cands) {
      const dir = NZ_BASE + col.replace(/collection\.json$/, '');
      const found = await Promise.all(tiles.map(t => fetch(dir + t + '.tiff', { method: 'HEAD' }).then(r => r.ok ? dir + t + '.tiff' : null).catch(() => null)));
      found.forEach(h => { if (h) hrefs.push(h); });
      if (hrefs.length >= tiles.length) break;
      if (hrefs.length && cands.indexOf(col) > 3) break;
    }
    return hrefs.length ? readCogWindows(ctx, hrefs, nztm) : null;
  };
}

/* France: IGN Géoplateforme WMS-R answers raw 32-bit heights (BIL) in Web Mercator. One request
   is capped at 2048 px, so a 1024 ring grid is a single call. */
function ignBil(layer){
  return async ctx => {
    const b = ctx.box, W = ctx.W;
    const url = 'https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=' + layer + '&STYLES=&CRS=EPSG:3857&BBOX=' +
      [b.x0, b.y0, b.x1, b.y1].map(v => v.toFixed(2)).join(',') + '&WIDTH=' + W + '&HEIGHT=' + W + '&FORMAT=image/x-bil;bits=32';
    const buf = await fetchBuf(url, 40000);
    if (!buf || buf.byteLength !== W * W * 4) return null;
    const f = new Float32Array(buf), out = new Float32Array(W * W);
    for (let i = 0; i < out.length; i++) { const v = f[i]; out[i] = v > -500 && v < 9000 ? v : NaN; }
    return out;
  };
}
/* Canada: NRCan HRDEM 1 m mosaic, one huge Cloud Optimised GeoTIFF per block, found by STAC search */
function hrdem(kind){
  return async ctx => {
    const c = ctx.geo;
    const j = await fetch('https://datacube.services.geo.ca/stac/api/search?collections=hrdem-mosaic-1m&limit=6&bbox=' + [c.w, c.s, c.e, c.n].map(v => v.toFixed(5)).join(','))
      .then(r => r.ok ? r.json() : null).catch(() => null);
    const hrefs = (j && j.features || []).map(f => f.assets && f.assets[kind] && f.assets[kind].href).filter(Boolean);
    return hrefs.length ? readCogWindows(ctx, hrefs, lcc3979) : null;
  };
}
/* Scotland: Scottish Remote Sensing Portal, open S3. Each survey phase names its tiles its own way
   (10 km, 5 km quarters, 1 km), so the bucket is listed by 10 km square and every file whose name
   starts with a square the ring touches is read, newest phase first. */
const SRSP = 'https://srsp-open-data.s3.eu-west-2.amazonaws.com/';
const SRSP_PHASES = ['national-lidar-programme', 'phase-6', 'phase-5', 'phase-4', 'phase-3', 'phase-2', 'phase-1', 'outer-hebrides', 'orkney-islands-council-23', 'hes'];
function osgbSquare(E, N){
  const L = 'ABCDEFGHJKLMNOPQRSTUVWXYZ', e100 = Math.floor(E / 100000), n100 = Math.floor(N / 100000);
  const l1 = (19 - n100) - (19 - n100) % 5 + Math.floor((e100 + 10) / 5), l2 = (19 - n100) * 5 % 25 + e100 % 5;
  return L[l1] + L[l2];
}
function srsp(kind){
  return async ctx => {
    const c = ctx.geo, pts = [[c.n, c.w], [c.n, c.e], [c.s, c.w], [c.s, c.e]].map(p => osgb(p[0], p[1]));
    const E0 = Math.min(...pts.map(p => p[0])), E1 = Math.max(...pts.map(p => p[0])), N0 = Math.min(...pts.map(p => p[1])), N1 = Math.max(...pts.map(p => p[1]));
    if (E0 < 0 || N0 < 500000) return null;
    const sq = new Set();
    for (let E = Math.floor(E0 / 10000) * 10000; E <= E1; E += 10000) for (let N = Math.floor(N0 / 10000) * 10000; N <= N1; N += 10000)
      sq.add(osgbSquare(E, N) + Math.floor(E % 100000 / 10000) + Math.floor(N % 100000 / 10000));
    /* only tiles that actually touch the ring: 1 km and 5 km names say where they are */
    const touches = key => {
      const m = key.match(/\/([A-Z]{2})(\d+)(NE|NW|SE|SW)?_/); if (!m || m[2].length % 2) return false;
      const L = 'ABCDEFGHJKLMNOPQRSTUVWXYZ', l1 = L.indexOf(m[1][0]), l2 = L.indexOf(m[1][1]);
      const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5), n100 = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);
      const h = m[2].length / 2, size = Math.pow(10, 5 - h);
      let e = e100 * 100000 + (+m[2].slice(0, h)) * size, n = n100 * 100000 + (+m[2].slice(h)) * size, s2 = size;
      if (m[3]) { s2 = size / 2; if (m[3][1] === 'E') e += s2; if (m[3][0] === 'N') n += s2; }
      return e < E1 && e + s2 > E0 && n < N1 && n + s2 > N0;
    };
    for (const ph of SRSP_PHASES) {
      const keys = [];
      await Promise.all([...sq].map(async q => {
        const t = await fetch(SRSP + '?list-type=2&prefix=' + encodeURIComponent('lidar/' + ph + '/' + kind + '/27700/gridded/' + q)).then(r => r.ok ? r.text() : '').catch(() => '');
        [...t.matchAll(/<Key>([^<]+\.tif)<\/Key>/g)].forEach(m => { if (touches(m[1])) keys.push(SRSP + m[1]); });
      }));
      if (keys.length) { const r = await readCogWindows(ctx, keys.slice(0, 16), osgb); if (share(r) > 0.3) return r; }
    }
    return null;
  };
}

/* ---------------- global overlays ---------------- */
/* Tree height from Meta and WRI (about 1 m, near global). The bucket refuses browser requests, so it
   goes through the worker. Quadkey tiles at level 9, Web Mercator. */
function quadkey(tx, ty, z){ let q = ''; for (let i = z; i > 0; i--) { let d = 0, m = 1 << (i - 1); if (tx & m) d++; if (ty & m) d += 2; q += d; } return q; }
async function metaCanopy(ctx){
  if (!CFG.proxy) return null;
  const z = 9, n = Math.pow(2, z), G = await GT(), rasters = [];
  const c = ctx.geo, tx0 = Math.floor((c.w + 180) / 360 * n), tx1 = Math.floor((c.e + 180) / 360 * n);
  const tyOf = la => Math.floor((1 - Math.log(Math.tan(la * D2R) + 1 / Math.cos(la * D2R)) / Math.PI) / 2 * n);
  const ty0 = tyOf(c.n), ty1 = tyOf(c.s);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    const href = CFG.proxy.replace(/\/$/, '') + '/canopy/' + quadkey(tx, ty, z) + '.tif';
    try {
      /* bigger reads mean far fewer round trips through the worker to the bucket */
      const tif = await G.fromUrl(href, { allowFullFile: false, blockSize: CFG.canopyBlock || 4194304 });
      const img = await tif.getImage();
      const [bx0, by0, bx1, by1] = img.getBoundingBox(), iw = img.getWidth(), ih = img.getHeight();
      const rx = (bx1 - bx0) / iw, ry = (by1 - by0) / ih, b = ctx.box;
      const wx0 = Math.max(0, Math.floor((b.x0 - bx0) / rx)), wx1 = Math.min(iw, Math.ceil((b.x1 - bx0) / rx));
      const wy0 = Math.max(0, Math.floor((by1 - b.y1) / ry)), wy1 = Math.min(ih, Math.ceil((by1 - b.y0) / ry));
      if (wx1 <= wx0 || wy1 <= wy0) continue;
      const k = Math.max(1, ctx.mMerc / rx), ow = Math.max(2, Math.round((wx1 - wx0) / k)), oh = Math.max(2, Math.round((wy1 - wy0) / k));
      const rr = await img.readRasters({ window: [wx0, wy0, wx1, wy1], width: ow, height: oh, interleave: false });
      const t = clean({ W: ow, H: oh, data: rr[0], nodata: img.getGDALNoData() }, -1, 120);
      const ex0 = bx0 + wx0 * rx, ny1 = by1 - wy0 * ry, sx = (wx1 - wx0) * rx / ow, sy = (wy1 - wy0) * ry / oh;
      rasters.push({ W: ow, H: oh, data: t.data, px: (la, lo) => [(MR * lo * D2R - ex0) / sx, (ny1 - MR * Math.log(Math.tan(Math.PI / 4 + la * D2R / 2))) / sy] });
    } catch (e) {}
  }
  return rasters.length ? resample(ctx, rasters) : null;
}
/* Buildings from OpenStreetMap by way of OpenFreeMap's open vector tiles (no key, answers web pages).
   Each footprint comes with render_height: the tagged height, or floors at 3 m, or a default. */
let ofmP = null;
function ofm(){
  return ofmP || (ofmP = Promise.all([
    fetch('https://tiles.openfreemap.org/planet').then(r => r.json()),
    import('https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@2.0.3/+esm'),
    import('https://cdn.jsdelivr.net/npm/pbf@4.0.1/+esm'),
  ]).then(([tj, VT, P]) => ({ url: tj.tiles[0], VT, Pbf: P.default || P.Pbf || P })).catch(e => { ofmP = null; throw e; }));
}
async function ofmBuildings(ctx){
  const { url, VT, Pbf } = await ofm();
  const z = 14, n = 1 << z, c = ctx.geo, W = ctx.W, out = new Float32Array(W * W).fill(NaN);
  const txOf = lo => Math.floor((lo + 180) / 360 * n), tyOf = la => { const s = Math.sin(la * D2R); return Math.floor((1 - Math.log((1 + s) / (1 - s)) / (2 * Math.PI)) / 2 * n); };
  const PX = lon => (lon - ctx.lonOf[0]) / (ctx.lonOf[W - 1] - ctx.lonOf[0]) * (W - 1);
  const yOfLat = la => { let lo = 0, hi = W - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ctx.latOf[m] > la) lo = m; else hi = m; } return lo + (ctx.latOf[lo] - la) / (ctx.latOf[lo] - ctx.latOf[hi] || 1); };
  let count = 0;
  const jobs = [];
  for (let tx = txOf(c.w); tx <= txOf(c.e); tx++) for (let ty = tyOf(c.n); ty <= tyOf(c.s); ty++) jobs.push([tx, ty]);
  await Promise.all(jobs.map(async ([tx, ty]) => {
    const buf = await fetchBuf(url.replace('{z}', z).replace('{x}', tx).replace('{y}', ty), 30000);
    if (!buf) return;
    let L;
    try { L = new VT.VectorTile(new Pbf(new Uint8Array(buf))).layers.building; } catch (e) { return; }
    if (!L) return;
    const ext = L.extent;
    for (let k = 0; k < L.length; k++) {
      const f = L.feature(k), h = +f.properties.render_height || 7;
      if (!(h > 0.5)) continue;
      const rings = f.loadGeometry().map(r => r.map(p => {
        const lon = (tx + p.x / ext) / n * 360 - 180, yy = Math.PI - 2 * Math.PI * (ty + p.y / ext) / n;
        return [PX(lon), yOfLat(R2D * Math.atan(Math.sinh(yy)))];
      }));
      fillRings(out, W, rings, h); count++;
    }
  }));
  return count ? { heights: out, count } : null;
}
/* scanline fill, even-odd across all rings together so courtyards stay open */
function fillRings(out, W, rings, h){
  let ymin = 1e9, ymax = -1e9;
  rings.forEach(r => r.forEach(p => { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }));
  const y0 = Math.max(0, Math.floor(ymin)), y1 = Math.min(W - 1, Math.ceil(ymax));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5, xs = [];
    rings.forEach(pts => { for (let k = 0, m = pts.length - 1; k < pts.length; m = k++) { const a = pts[m], b = pts[k]; if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } });
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) { const i = y * W + x; out[i] = out[i] === out[i] ? Math.max(out[i], h) : h; }
    }
  }
}
async function buildings(ctx){
  const a = await ofmBuildings(ctx).catch(() => null);
  return a || osmBuildings(ctx).catch(() => null);
}
/* Fallback: the Overpass API, direct then through the worker */
async function osmBuildings(ctx){
  const c = ctx.geo, q = '[out:json][timeout:25];(way[building](' + [c.s, c.w, c.n, c.e].map(v => v.toFixed(5)).join(',') + ');rel[building](' + [c.s, c.w, c.n, c.e].map(v => v.toFixed(5)).join(',') + '););out geom tags;';
  const urls = ['https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q)];
  if (CFG.proxy) urls.push(CFG.proxy.replace(/\/$/, '') + '/overpass?data=' + encodeURIComponent(q));
  let j = null;
  for (const u of urls) {
    const buf = await fetchBuf(u, 35000);
    if (buf) { try { j = JSON.parse(new TextDecoder().decode(buf)); break; } catch (e) {} }
  }
  if (!j || !j.elements || !j.elements.length) return null;
  const W = ctx.W, out = new Float32Array(W * W).fill(NaN);
  const PX = lon => (lon - ctx.lonOf[0]) / (ctx.lonOf[W - 1] - ctx.lonOf[0]) * (W - 1);
  const yOfLat = la => { let lo = 0, hi = W - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ctx.latOf[m] > la) lo = m; else hi = m; } return lo + (ctx.latOf[lo] - la) / (ctx.latOf[lo] - ctx.latOf[hi] || 1); };
  let count = 0;
  const heightOf = t => {
    const h = parseFloat((t.height || '').replace(',', '.'));
    if (h > 1 && h < 400) return h;
    const lv = parseFloat(t['building:levels']);
    if (lv > 0 && lv < 120) return lv * 3 + (t['roof:levels'] ? 1.5 : 1);
    return { church: 16, cathedral: 30, castle: 18, industrial: 9, warehouse: 9, retail: 7, commercial: 12, apartments: 15, garage: 3, shed: 3, hut: 3 }[t.building] || 7;
  };
  const fill = (ring, h) => {
    const pts = ring.map(p => [PX(p.lon), yOfLat(p.lat)]);
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1])))), y1 = Math.min(W - 1, Math.ceil(Math.max(...pts.map(p => p[1]))));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let k = 0, m = pts.length - 1; k < pts.length; m = k++) {
        const a = pts[m], b = pts[k];
        if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
        for (let x = xa; x <= xb; x++) { const i = y * W + x; out[i] = out[i] === out[i] ? Math.max(out[i], h) : h; }
      }
    }
  };
  j.elements.forEach(el => {
    const h = heightOf(el.tags || {});
    if (el.type === 'way' && el.geometry && el.geometry.length > 2) { fill(el.geometry, h); count++; }
    else if (el.type === 'relation' && el.members) el.members.filter(m => m.role === 'outer' && m.geometry && m.geometry.length > 2).forEach(m => { fill(m.geometry, h); count++; });
  });
  return count ? { heights: out, count } : null;
}

/* Services that refuse browser requests go through the worker's /fetch route */
function viaProxy(kind){
  return async ctx => {
    if (!CFG.proxy) return null;
    const realFetch = fetchBuf;
    return kind(ctx, url => realFetch(CFG.proxy.replace(/\/$/, '') + '/fetch?url=' + encodeURIComponent(url), 40000));
  };
}
/* WCS 1.0 on ArcGIS servers, which reproject to Web Mercator when asked; 2.0 there refuses it */
function wcs1Via(base, id){
  return viaProxy(async (ctx, get) => {
    const b = ctx.box;
    const url = base + '?service=WCS&request=GetCoverage&version=1.0.0&coverage=' + encodeURIComponent(id) + '&crs=EPSG:3857&bbox=' +
      [b.x0, b.y0, b.x1, b.y1].map(v => v.toFixed(2)).join(',') + '&width=' + ctx.W + '&height=' + ctx.W + '&format=GeoTIFF';
    const t = clean(await decodeTiff(await get(url)));
    return t && t.W === ctx.W && t.H === ctx.W ? t.data : null;
  });
}
function wcs3857Via(base, id, ax){
  return viaProxy(async (ctx, get) => {
    const b = ctx.box;
    const url = base + '?service=WCS&request=GetCoverage&version=2.0.1&CoverageId=' + encodeURIComponent(id) +
      '&format=image/tiff&subsettingCrs=' + C3857 + '&outputCrs=' + C3857 +
      '&subset=' + ax[0] + '(' + b.x0.toFixed(2) + ',' + b.x1.toFixed(2) + ')&subset=' + ax[1] + '(' + b.y0.toFixed(2) + ',' + b.y1.toFixed(2) + ')' +
      '&scalesize=' + ax[0] + '(' + ctx.W + '),' + ax[1] + '(' + ctx.W + ')';
    const t = clean(await decodeTiff(await get(url)));
    return t && t.W === ctx.W && t.H === ctx.W ? t.data : null;
  });
}

/* Denmark answers only on its own grid (ETRS89 UTM 32), so ask on that grid and resample */
async function dkWcs(ctx, coverage){
  const c = ctx.geo, pts = [[c.n, c.w], [c.n, c.e], [c.s, c.w], [c.s, c.e]].map(p => utm32(p[0], p[1]));
  const E0 = Math.floor(Math.min(...pts.map(p => p[0])) - 10), E1 = Math.ceil(Math.max(...pts.map(p => p[0])) + 10);
  const N0 = Math.floor(Math.min(...pts.map(p => p[1])) - 10), N1 = Math.ceil(Math.max(...pts.map(p => p[1])) + 10);
  const k = Math.max(0.4, ctx.m), w = Math.min(2048, Math.round((E1 - E0) / k)), h = Math.min(2048, Math.round((N1 - N0) / k));
  const t = clean(await decodeTiff(await fetchBuf('https://api.dataforsyningen.dk/dhm_wcs_DAF?service=WCS&request=GetCoverage&version=1.0.0&coverage=' + coverage +
    '&crs=EPSG:25832&bbox=' + [E0, N0, E1, N1].join(',') + '&width=' + w + '&height=' + h + '&format=GTiff&token=' + encodeURIComponent(CFG.tokens.dk), 40000)), -20);
  if (!t) return null;
  return resample(ctx, [{ W: t.W, H: t.H, data: t.data, px: (la, lo) => { const p = utm32(la, lo); return [(p[0] - E0) / (E1 - E0) * t.W, (N1 - p[1]) / (N1 - N0) * t.H]; } }]);
}

/* ---------------- the sources ---------------- */
const EA = 'https://environment.data.gov.uk/spatialdata/';
/* the page first, then the worker: the Environment Agency's coverage answers sometimes come back
   without the headers a web page needs, while the same request from the worker works */
function direct(base, id, ax){
  const a = wcs3857(base, id, ax), b = wcs3857(base, id, ax, u => CFG.proxy + '/fetch?url=' + encodeURIComponent(u));
  return async ctx => {
    let r = null, err = null;
    try { r = await a(ctx); } catch (e) { err = e; }
    if (share(r) > 0.05) return r;
    if (CFG.proxy) { try { const q = await b(ctx); if (share(q) > 0.05) return q; r = r || q; } catch (e) { err = e; } }
    if (err) throw err;
    return r;
  };
}
const SOURCES = [
  { id: 'ea', name: 'Environment Agency LIDAR', credit: 'LIDAR \u00a9 Environment Agency', box: [49.85, 55.82, -6.45, 1.8],
    surface: direct(EA + 'lidar-composite-digital-surface-model-first-return-dsm-1m/wcs', 'df4e3ec3-315e-48aa-aaaf-b5ae74d7b2bb__Lidar_Composite_Elevation_FZ_DSM_1m'),
    terrain: direct(EA + 'lidar-composite-digital-terrain-model-dtm-1m/wcs', '13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m') },
  { id: 'sc', name: 'Scottish LiDAR', credit: 'LiDAR \u00a9 Scottish Government, OGL', box: [54.6, 60.9, -8.7, -0.7],
    surface: srsp('dsm'), terrain: srsp('dtm') },
  { id: 'fr', name: 'IGN France', credit: 'RGE ALTI, LiDAR HD \u00a9 IGN, Licence Ouverte', box: [41.3, 51.1, -5.2, 9.6],
    surface: ignBil('ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES.MNS'), terrain: ignBil('ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES') },
  { id: 'ca', name: 'NRCan HRDEM (Canada)', credit: 'HRDEM \u00a9 Natural Resources Canada, OGL-Canada', box: [41.6, 83.2, -141.1, -52.5],
    surface: hrdem('dsm'), terrain: hrdem('dtm') },
  { id: 'nl', name: 'AHN (Netherlands)', credit: 'AHN \u00a9 Rijkswaterstaat, CC0', box: [50.7, 53.7, 3.2, 7.3],
    surface: wcs3857('https://service.pdok.nl/rws/ahn/wcs/v1_0', 'dsm_05m', ['x', 'y']),
    terrain: wcs3857('https://service.pdok.nl/rws/ahn/wcs/v1_0', 'dtm_05m', ['x', 'y']) },
  { id: 'nrw', name: 'Geobasis NRW', credit: 'DOM/DGM \u00a9 Geobasis NRW, dl-de/zero-2-0', box: [50.3, 52.6, 5.8, 9.5],
    surface: wcs3857('https://www.wcs.nrw.de/geobasis/wcs_nw_dom', 'nw_dom', ['x', 'y']),
    terrain: wcs3857('https://www.wcs.nrw.de/geobasis/wcs_nw_dgm', 'nw_dgm', ['x', 'y']) },
  { id: 'be', name: 'Digitaal Vlaanderen', credit: 'DHMV \u00a9 Digitaal Vlaanderen', box: [50.67, 51.51, 2.54, 5.92],
    surface: wcsLatLon('https://geo.api.vlaanderen.be/el-dsm/wcs', 'EL.GridCoverage.DSM', { lat: 'y', lon: 'x', scale: true }, { lat: 0.000009, lon: 0.000014 }),
    terrain: wcsLatLon('https://geo.api.vlaanderen.be/el-dtm/wcs', 'EL.GridCoverage.DTM', { lat: 'y', lon: 'x', scale: true }, { lat: 0.000009, lon: 0.000014 }) },
  { id: 'ch', name: 'swisstopo', credit: 'swissSURFACE3D, swissALTI3D \u00a9 swisstopo', box: [45.8, 47.85, 5.9, 10.55],
    surface: swissStac('ch.swisstopo.swisssurface3d-raster', /_0\.5_2056_5728\.tif$/),
    terrain: swissStac('ch.swisstopo.swissalti3d', /_2_2056_5728\.tif$/) },
  { id: 'dk', name: 'Dataforsyningen (Denmark)', credit: 'DHM \u00a9 Klimadatastyrelsen', box: [54.5, 57.8, 8.0, 15.2], needs: 'dk',
    surface: ctx => dkWcs(ctx, 'dhm_overflade'), terrain: ctx => dkWcs(ctx, 'dhm_terraen') },
  { id: 'es', name: 'IGN Espa\u00f1a MDT', credit: 'MDT \u00a9 Instituto Geogr\u00e1fico Nacional', box: [35.85, 43.9, -9.4, 4.4], terrainOnly: true,
    terrain: wcsLatLon('https://servicios.idee.es/wcs-inspire/mdt', 'Elevacion4258_5', { lat: 'Lat', lon: 'Long' }, { lat: 0.000045, lon: 0.000045 }) },
  { id: 'es-can', name: 'IGN Espa\u00f1a MDT (Canarias)', credit: 'MDT \u00a9 Instituto Geogr\u00e1fico Nacional', box: [27.6, 29.5, -18.2, -13.3], terrainOnly: true,
    terrain: wcsLatLon('https://servicios.idee.es/wcs-inspire/mdt', 'Elevacion4258_5', { lat: 'Lat', lon: 'Long' }, { lat: 0.000045, lon: 0.000045 }) },
  { id: 'nz', name: 'LINZ (New Zealand)', credit: 'Elevation \u00a9 Toit\u016b Te Whenua LINZ, CC BY 4.0', box: [-47.5, -34.0, 166.0, 179.0],
    surface: nzSource('dsm'), terrain: nzSource('dem') },
  /* Sweden before Norway: their boxes overlap, and the Swedish catalogue says no in a fraction of a second */
  { id: 'se', name: 'Lantm\u00e4teriet (Sweden)', credit: 'Markh\u00f6jdmodell \u00a9 Lantm\u00e4teriet, CC BY 4.0', box: [55.3, 69.1, 10.9, 24.2], proxy: true, terrainOnly: true,
    terrain: seStac() },
  /* through the worker; the services answer, but not to web pages. Not yet tested end to end. */
  { id: 'no', name: 'Kartverket (Norway)', credit: 'H\u00f8ydedata \u00a9 Kartverket, CC BY 4.0', box: [57.9, 71.3, 4.5, 31.2], proxy: true,
    surface: wcs1Via('https://wcs.geonorge.no/skwms1/wcs.hoyde-dom-nhm-25833', 'nhm_dom_topo_25833'),
    terrain: wcs1Via('https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833', 'nhm_dtm_topo_25833') },
  { id: 'es-mds', name: 'IGN Espa\u00f1a MDS', credit: 'MDS \u00a9 Instituto Geogr\u00e1fico Nacional', box: [35.85, 43.9, -9.4, 4.4], proxy: true,
    surface: viaProxy(async (ctx, get) => { const b = ctx.geo, p = 0.0005; const t = clean(await decodeTiff(await get('https://servicios.idee.es/wcs-inspire/mds?service=WCS&request=GetCoverage&version=2.0.1&CoverageId=Elevacion4258_5&format=image/tiff&subset=Lat(' + (b.s - p) + ',' + (b.n + p) + ')&subset=Long(' + (b.w - p) + ',' + (b.e + p) + ')')));
      if (!t) return null; return resample(ctx, [{ W: t.W, H: t.H, data: t.data, px: (la, lo) => [(lo - b.w + p) / (b.e - b.w + 2 * p) * t.W, (b.n + p - la) / (b.n - b.s + 2 * p) * t.H] }]); }) },
  /* keyed: switched on by NoctoSurfaces.config({ tokens }). The Australian services answered from the
     browser asking for a token, so they should work once one is set; not yet tested with a key. */
  { id: 'nsw', name: 'NSW Spatial Services', credit: 'Elevation \u00a9 Spatial Services NSW, CC BY 4.0', box: [-37.6, -28.1, 140.9, 153.7], needs: 'nsw', terrainOnly: true,
    terrain: ctx => arcgis3857('https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Elevation_Model/ImageServer', '&token=' + encodeURIComponent(CFG.tokens.nsw))(ctx) },
  { id: 'qld', name: 'Queensland Spatial', credit: 'Elevation \u00a9 State of Queensland, CC BY 4.0', box: [-29.2, -9.0, 137.9, 153.6], needs: 'qld', terrainOnly: true,
    terrain: ctx => arcgis3857('https://spatial.information.qld.gov.au/arcgis/rest/services/Elevation/QldDem/ImageServer', '&token=' + encodeURIComponent(CFG.tokens.qld))(ctx) },
  { id: 'fi', name: 'Maanmittauslaitos (Finland)', credit: 'Korkeusmalli \u00a9 Maanmittauslaitos, CC BY 4.0', box: [59.7, 70.1, 19.0, 31.6], needs: 'fi', terrainOnly: true,
    terrain: ctx => wcs3857('https://avoin-karttakuva.maanmittauslaitos.fi/ortokuvat-ja-korkeusmallit/wcs/v2?api-key=' + encodeURIComponent(CFG.tokens.fi), 'korkeusmalli_2m', ['E', 'N'])(ctx) },
  { id: 'es-mds-can', name: 'IGN Espa\u00f1a MDS', credit: 'MDS \u00a9 Instituto Geogr\u00e1fico Nacional', box: [27.6, 29.5, -18.2, -13.3], proxy: true,
    surface: viaProxy(async (ctx, get) => { const b = ctx.geo, p = 0.0005; const t = clean(await decodeTiff(await get('https://servicios.idee.es/wcs-inspire/mds?service=WCS&request=GetCoverage&version=2.0.1&CoverageId=Elevacion4258_5&format=image/tiff&subset=Lat(' + (b.s - p) + ',' + (b.n + p) + ')&subset=Long(' + (b.w - p) + ',' + (b.e + p) + ')')));
      if (!t) return null; return resample(ctx, [{ W: t.W, H: t.H, data: t.data, px: (la, lo) => [(lo - b.w + p) / (b.e - b.w + 2 * p) * t.W, (b.n + p - la) / (b.n - b.s + 2 * p) * t.H] }]); }) },
  { id: 'us', name: 'USGS 3DEP', credit: '3DEP \u00a9 USGS', box: [18.0, 72.0, -180.0, -64.0], terrainOnly: true,
    terrain: arcgis3857('https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer') },
];

/* The whole answer for one ring: national surface and terrain where there is one, then trees and
   buildings from the global sources over whatever is left bare. */
async function fetchFor(ctx){
  /* coverage boxes are rough and overlap at borders, so every source whose box holds the pin is
     tried in turn until one has data here */
  const cands = SOURCES.filter(s => ctx.lat >= s.box[0] && ctx.lat <= s.box[1] && ctx.lon >= s.box[2] && ctx.lon <= s.box[3] && (!s.needs || CFG.tokens[s.needs]) && (!s.proxy || CFG.proxy));
  const credits = [], names = [];
  let surface = null, terrain = null, pending = null, kind = null, degraded = false;
  for (const src of cands) {
    /* a source that errors (rather than answering "nothing here") is having a bad day: the result
       is marked so it is not kept offline, and the next visit asks again */
    const [a, b] = await Promise.all([src.surface ? src.surface(ctx).catch(() => { degraded = true; return null; }) : null, src.terrain ? src.terrain(ctx).catch(() => { degraded = true; return null; }) : null]);
    if (share(a) > 0.05 && agrees(a, ctx.H)) surface = a;
    if (share(b) > 0.05 && agrees(b, ctx.H)) terrain = b;
    if (surface || terrain) { credits.push(src.credit); names.push(src.name); break; }
  }
  /* national surface covers most of the ring: done. Otherwise lay trees and buildings on the ground */
  if (share(surface) < 0.6) {
    const base = terrain || ctx.H;
    /* neither may hold the view up for long: the ground is already on screen */
    const canP = metaCanopy(ctx).catch(() => null);
    const [can, bld] = await Promise.all([within(canP, ctx.patient ? 30000 : 12000), within(buildings(ctx), 20000)]);
    /* tree height still on its way: say so, and let the caller come back for it */
    if (!can && !ctx.patient) pending = canP.then(v => !!v);
    if (can || bld) {
      const out = surface ? Float32Array.from(surface) : new Float32Array(ctx.W * ctx.W).fill(NaN);
      /* what each raised pixel is, so trees and houses can be drawn as themselves: 1 tree, 2 building */
      kind = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) {
        if (bld && bld.heights[i] === bld.heights[i]) kind[i] = 2;
        if (out[i] === out[i]) continue;
        const g = base[i]; if (!(g === g)) continue;
        let v = g;
        if (can && can[i] === can[i] && can[i] > 1) { v = Math.max(v, g + can[i]); kind[i] = 1; }
        if (bld && bld.heights[i] === bld.heights[i]) { v = Math.max(v, g + bld.heights[i]); kind[i] = 2; }
        out[i] = v;
      }
      surface = out;
      if (can) { credits.push('Canopy height \u00a9 Meta and WRI'); names.push('Meta tree height'); }
      if (bld) { credits.push('Buildings \u00a9 OpenStreetMap contributors'); names.push(bld.count + ' OpenStreetMap buildings'); }
      if (!terrain) terrain = Float32Array.from(base);
    }
  }
  /* a national surface model has roofs in it but does not say which bumps they are: OpenStreetMap
     outlines mark them, so they are drawn as buildings rather than woods */
  if (surface && !kind) {
    const bld = await within(buildings(ctx).catch(() => null), 8000);
    if (bld) {
      kind = new Uint8Array(surface.length);
      for (let i = 0; i < kind.length; i++) if (bld.heights[i] === bld.heights[i]) kind[i] = 2;
      credits.push('Building outlines \u00a9 OpenStreetMap contributors');
    }
  }
  if (!surface && !terrain) return null;
  if (surface || terrain) degraded = degraded && !names.some(n => cands.some(c => c.name === n));
  return { surface, terrain, kind, name: names.join(' + '), credit: credits.join(' \u00b7 '), terrainOnly: !surface, pending, degraded };
}

function config(o){ if (o) { if (o.tokens) Object.assign(CFG.tokens, o.tokens); if (o.proxy != null) CFG.proxy = o.proxy; if (o.canopyBlock) CFG.canopyBlock = o.canopyBlock; } return { ...CFG }; }
function coverage(lat, lon){ const s = SOURCES.find(s => lat >= s.box[0] && lat <= s.box[1] && lon >= s.box[2] && lon <= s.box[3] && (!s.needs || CFG.tokens[s.needs])); return s ? s.name : null; }

window.NoctoSurfaces = { metaCanopy, buildings, SOURCES, fetchFor, config, coverage, lv95, nztm, nzTiles, osgb, osgbSquare, lcc3979 };
})();
