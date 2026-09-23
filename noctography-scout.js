/* Noctography: scouting. The ground as a picture, the sky's own colour, the catalogue, and the night as a strip you drag.
   ------------------------------------------------------------------------------------------
   The skyline module (noctography-terrain.js) turns elevation data into a line: altitude by
   azimuth. This module turns the same data into a landscape you can recognise: a textured
   heightfield, viewed from eye height at the pin, through the same gnomonic lens model the
   framing view and Sky AR already use. The sky is drawn on a 2D canvas underneath; the ground
   is drawn in WebGL on top, so anything behind a ridge is hidden by the ridge itself.

   Data: AWS Terrain Tiles (Terrarium PNG, no key) for height, Esri World Imagery (already the
   Satellite layer on Place) for texture. Three rings at three zooms, because angular detail
   matters near you and coverage matters far away: about 9 km at ~12 m, 60 km at ~50 m, and
   480 km at ~400 m. Each ring is one mesh with one texture atlas. Outer rings skip the ground
   the inner ring already covers.

   Coordinates are a local frame at the pin: x east, y north, z up, metres. Every vertex is
   placed by its true bearing and great-circle distance from the pin, so directions are exact
   from where the camera stands, which is the only place it ever stands. Heights carry the
   curvature drop d²/2R_eff, the same dodge the skyline cast uses, so a far ridge sits where the
   skyline says it does.
   ------------------------------------------------------------------------------------------ */
"use strict";
(function () {
if (window.NoctoScout) return;

const DEM_BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const IMG_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';
const TILE = 256;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const R_EARTH = 6371000, R_EFF = R_EARTH * 7 / 6;

/* rings: metres per pixel target, tiles across, vertex step in pixels */
const RINGS = [
  { targetM: 12,  n: 3, step: 2 },
  { targetM: 50,  n: 5, step: 4 },
  { targetM: 400, n: 5, step: 5 },
];
const MAX_Z = 14;

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
function ringsFor(lat){
  const base = 156543.03392 * Math.cos(lat * D2R);
  return RINGS.map(r => {
    const z = Math.max(3, Math.min(MAX_Z, Math.ceil(Math.log2(base / r.targetM))));
    return { z, n: r.n, step: r.step, mPerPx: base / Math.pow(2, z) };
  });
}
/* bearing and distance from the pin, for placing a vertex */
function bearingDist(lat0, lon0, lat, lon){
  const la0 = lat0 * D2R, la1 = lat * D2R, dLon = (lon - lon0) * D2R;
  const y = Math.sin(dLon) * Math.cos(la1);
  const x = Math.cos(la0) * Math.sin(la1) - Math.sin(la0) * Math.cos(la1) * Math.cos(dLon);
  const br = Math.atan2(y, x);
  const a = Math.sin((la1 - la0) / 2) ** 2 + Math.cos(la0) * Math.cos(la1) * Math.sin(dLon / 2) ** 2;
  const d = 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
  return { br, d };
}

/* ---------------- what one place costs ---------------- */
function plan(lat, lon){
  const rings = ringsFor(lat).map(r => {
    const cx = Math.floor(lonToX(lon, r.z)), cy = Math.floor(latToY(lat, r.z));
    const h = Math.floor(r.n / 2);
    return Object.assign({}, r, { x0: cx - h, y0: cy - h, tiles: r.n * r.n });
  });
  const tiles = rings.reduce((s, r) => s + r.tiles, 0);
  return { rings, tiles, requests: tiles * 2, bytes: tiles * 95000 };
}
function sizeLine(lat, lon){
  const p = plan(lat, lon);
  const mb = p.bytes / 1048576;
  return { tiles: p.tiles, line: 'About ' + mb.toFixed(1) + ' MB of ground and imagery, ' + p.tiles + ' tiles of each.' };
}

/* ---------------- fetch ---------------- */
async function fetchDem(z, x, y){
  const n = Math.pow(2, z);
  x = ((x % n) + n) % n;
  if (y < 0 || y >= n) return null;
  const r = await fetch(DEM_BASE + z + '/' + x + '/' + y + '.png');
  if (!r.ok) return null;
  const bm = await createImageBitmap(await r.blob());
  const cv = document.createElement('canvas');
  cv.width = bm.width; cv.height = bm.height;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bm, 0, 0);
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  if (bm.close) bm.close();
  const out = new Float32Array(TILE * TILE);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const e = (px[p] * 256 + px[p + 1] + px[p + 2] / 256) - 32768;
    out[i] = e < 0 ? 0 : e;   // the sea surface makes the horizon, not the sea bed
  }
  return out;
}
function fetchImg(z, x, y){
  return new Promise(res => {
    const n = Math.pow(2, z);
    x = ((x % n) + n) % n;
    if (y < 0 || y >= n) return res(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = IMG_BASE + z + '/' + y + '/' + x;
  });
}

/* ---------------- a ring: heights, texture atlas, mesh ---------------- */
async function loadRing(r, lat, lon, onTile){
  const W = r.n * TILE;
  const heights = new Float32Array(W * W);
  const atlas = document.createElement('canvas');
  atlas.width = W; atlas.height = W;
  const actx = atlas.getContext('2d');
  actx.fillStyle = '#20242c'; actx.fillRect(0, 0, W, W);
  const jobs = [];
  for (let ty = 0; ty < r.n; ty++) for (let tx = 0; tx < r.n; tx++) jobs.push({ tx, ty });
  let failed = 0;
  const LANES = 6;
  const run = async () => {
    while (jobs.length) {
      const j = jobs.shift();
      const [dem, img] = await Promise.all([
        fetchDem(r.z, r.x0 + j.tx, r.y0 + j.ty).catch(() => null),
        fetchImg(r.z, r.x0 + j.tx, r.y0 + j.ty),
      ]);
      if (dem) {
        for (let py = 0; py < TILE; py++)
          heights.set(dem.subarray(py * TILE, py * TILE + TILE), (j.ty * TILE + py) * W + j.tx * TILE);
      } else failed++;
      if (img) actx.drawImage(img, j.tx * TILE, j.ty * TILE);
      if (onTile) onTile();
    }
  };
  await Promise.all(Array.from({ length: LANES }, run));
  return { heights, atlas, W, failed };
}

/* Vertices at every `step` pixels. Position from bearing and distance; height with the curvature
   drop; normal from the height gradient in the pixel grid, which is good enough for moonlight. */
function buildMesh(r, data, lat, lon, cut){
  const W = data.W, s = r.step, H = data.heights;
  const nv = Math.floor((W - 1) / s) + 1;
  const pos = new Float32Array(nv * nv * 3);
  const uv = new Float32Array(nv * nv * 2);
  const nrm = new Float32Array(nv * nv * 3);
  const inside = new Uint8Array(nv * nv);
  const hAt = (px, py) => H[Math.min(W - 1, Math.max(0, py)) * W + Math.min(W - 1, Math.max(0, px))];
  for (let j = 0; j < nv; j++) {
    const py = Math.min(W - 1, j * s);
    const la = yToLat(r.y0 + (py + 0.5) / TILE, r.z);
    for (let i = 0; i < nv; i++) {
      const px = Math.min(W - 1, i * s);
      const lo = xToLon(r.x0 + (px + 0.5) / TILE, r.z);
      const bd = bearingDist(lat, lon, la, lo);
      const h = hAt(px, py) - bd.d * bd.d / (2 * R_EFF);
      const k = j * nv + i;
      pos[k * 3] = bd.d * Math.sin(bd.br);
      pos[k * 3 + 1] = bd.d * Math.cos(bd.br);
      pos[k * 3 + 2] = h;
      uv[k * 2] = (px + 0.5) / W;
      uv[k * 2 + 1] = (py + 0.5) / W;
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
  return { pos, uv, nrm, idx: idx.subarray(0, q), count: q };
}
/* the lat/lon box a ring covers, shrunk a little so the seam is a sliver of overlap, not a gap */
function boxOf(r){
  const W = r.n;
  const pad = 0.02 * W;
  return {
    w: xToLon(r.x0 + pad, r.z), e: xToLon(r.x0 + W - pad, r.z),
    n: yToLat(r.y0 + pad, r.z), s: yToLat(r.y0 + W - pad, r.z),
  };
}

/* ---------------- WebGL ---------------- */
const VS = `
attribute vec3 aPos; attribute vec2 aUv; attribute vec3 aNrm;
uniform mat4 uMVP;
varying vec2 vUv; varying vec3 vNrm; varying float vDist;
void main(){
  vUv = aUv; vNrm = aNrm; vDist = length(aPos.xy);
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;
const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform vec3 uSun; uniform vec3 uMoon; uniform float uSunAlt; uniform float uMoonLight;
uniform float uGain; uniform float uHazeM; uniform float uHaze; uniform float uNv; uniform float uTrue;
varying vec2 vUv; varying vec3 vNrm; varying float vDist;
void main(){
  vec3 col = texture2D(uTex, vUv).rgb;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 n = normalize(vNrm);
  /* daylight: the imagery as it is, lit by the sun */
  float day = smoothstep(-6.0, 4.0, uSunAlt);
  vec3 dayCol = col * (0.45 + 0.55 * max(dot(n, uSun), 0.0));
  /* night: desaturated, cool, lit by skyglow and whatever moon there is */
  vec3 base = mix(vec3(luma), col, 0.35) * vec3(0.62, 0.68, 0.82);
  /* a long exposure lifts the ground well above what the eye sees: skyglow alone shows the shape */
  float amb = 0.32;
  float moon = max(dot(n, uMoon), 0.0) * uMoonLight * 1.3;
  vec3 nightCol = base * (amb + moon) * uGain;
  /* true colour: what minutes of exposure actually record, the ground's own colour at full
     saturation, lifted by the gain, rather than what a dark-adapted eye sees */
  nightCol = mix(nightCol, col * (0.5 + moon) * uGain * 1.15, uTrue);
  /* twilight sits between, warmer and dimmer than day */
  vec3 twi = col * vec3(0.55, 0.5, 0.55) * (0.2 + 0.3 * max(dot(n, uSun), 0.0));
  twi = mix(twi, col * (0.45 + 0.4 * max(dot(n, uSun), 0.0)) * max(uGain, 0.8), uTrue);
  float tw = smoothstep(-12.0, -2.0, uSunAlt) * (1.0 - day);
  vec3 c = mix(nightCol, twi, tw);
  c = mix(c, dayCol, day);
  /* distance haze towards the colour of the sky at the horizon */
  vec3 hazeNight = vec3(0.045, 0.05, 0.075) * (0.6 + 0.4 * uGain);
  vec3 hazeDay = vec3(0.62, 0.7, 0.84);
  vec3 hazeCol = mix(mix(hazeNight, vec3(0.25, 0.2, 0.3), tw), hazeDay, day);
  float f = (1.0 - exp(-vDist / uHazeM)) * uHaze * mix(1.0, 0.6, uTrue);
  c = mix(c, hazeCol, f);
  if (uNv > 0.5) { float l = dot(c, vec3(0.3, 0.59, 0.11)); c = vec3(l * 1.6, l * 0.22, l * 0.08); }
  gl_FragColor = vec4(c, 1.0);
}`;

function makeGL(canvas){
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  if (!gl.getExtension('OES_element_index_uint')) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const a = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUv'), nrm: gl.getAttribLocation(prog, 'aNrm') };
  const u = {};
  ['uMVP', 'uTex', 'uSun', 'uMoon', 'uSunAlt', 'uMoonLight', 'uGain', 'uHazeM', 'uHaze', 'uNv', 'uTrue'].forEach(k => u[k] = gl.getUniformLocation(prog, k));
  return { gl, prog, a, u, rings: [] };
}
function upload(G, mesh, atlas){
  const gl = G.gl;
  const buf = (data, target) => { const b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return { pos: buf(mesh.pos), uv: buf(mesh.uv), nrm: buf(mesh.nrm), idx: buf(mesh.idx, gl.ELEMENT_ARRAY_BUFFER), count: mesh.count, tex };
}

/* column-major 4x4 helpers, just enough for one camera */
function perspective(hfovDeg, vfovDeg, near, far){
  const fx = 1 / Math.tan(hfovDeg / 2 * D2R), fy = 1 / Math.tan(vfovDeg / 2 * D2R);
  const nf = 1 / (near - far);
  return new Float32Array([fx, 0, 0, 0, 0, fy, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(eye, az, alt){
  const f = [Math.sin(az * D2R) * Math.cos(alt * D2R), Math.cos(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R)];
  const up0 = [0, 0, 1];
  let s = cross(f, up0); const sl = Math.hypot(s[0], s[1], s[2]) || 1; s = s.map(v => v / sl);
  const u = cross(s, f);
  return new Float32Array([
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
  ]);
}
function cross(a, b){ return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function mul(a, b){
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function dirOf(az, alt){ return [Math.sin(az * D2R) * Math.cos(alt * D2R), Math.cos(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R)]; }

/* ---------------- the scene ---------------- */
class Scene {
  constructor(canvas){
    this.canvas = canvas;
    this.G = makeGL(canvas);
    this.rings = [];       // { r, data, gpu, box }
    this.ground = 0;
    this.lat = null; this.lon = null;
    this.loading = null;
  }
  get ok(){ return !!this.G; }
  clear(){
    const gl = this.G && this.G.gl;
    if (gl) this.rings.forEach(x => { if (x.gpu) { gl.deleteTexture(x.gpu.tex); [x.gpu.pos, x.gpu.uv, x.gpu.nrm, x.gpu.idx].forEach(b => gl.deleteBuffer(b)); } });
    this.rings = [];
  }
  /* Load a place. Rings arrive in the order they finish, and each one renders as soon as it lands:
     the near ground first, usually, then the far. onProgress(done, total); onRing() after each. */
  async load(lat, lon, onProgress, onRing){
    this.clear();
    this.lat = lat; this.lon = lon;
    const p = plan(lat, lon);
    const token = this.loading = {};
    let done = 0;
    const total = p.tiles;
    const inner = p.rings[0];
    const boxes = p.rings.map(boxOf);
    await Promise.all(p.rings.map(async (r, i) => {
      const data = await loadRing(r, lat, lon, () => { done++; if (onProgress) onProgress(done, total); });
      if (this.loading !== token) return;
      if (i === 0) {
        const W = data.W;
        const fx = (lonToX(lon, r.z) - r.x0) * TILE, fy = (latToY(lat, r.z) - r.y0) * TILE;
        const gi = Math.min(W - 1, Math.floor(fx)), gj = Math.min(W - 1, Math.floor(fy));
        this.ground = data.heights[gj * W + gi] || 0;
      }
      const mesh = buildMesh(r, data, lat, lon, i > 0 ? boxes[i - 1] : null);
      const gpu = this.G ? upload(this.G, mesh, data.atlas) : null;
      this.rings[i] = { r, data, gpu, box: boxes[i] };
      if (onRing) onRing(i);
    }));
    return { ground: this.ground, tiles: total };
  }
  /* height of the model at a lat/lon, from the finest ring that holds it */
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
  /* the skyline altitude along one bearing, cast through the loaded heights: what the ridge in
     the middle of the frame actually is, and how far off */
  skylineAt(az, eyeM){
    if (this.lat == null || !this.rings.some(Boolean)) return null;
    const h0 = this.ground + eyeM;
    let best = -90, bestD = 0;
    const dest = (d) => {
      const dr = d / R_EARTH, br = az * D2R, la = this.lat * D2R, lo = this.lon * D2R;
      const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(br));
      const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
      return [la2 * R2D, lo2 * R2D];
    };
    for (let d = 40; d < 240000; d += d < 5000 ? 15 : d < 30000 ? 60 : 300) {
      const p = dest(d);
      const h = this.heightAt(p[0], p[1]);
      if (h == null) continue;
      const a = Math.atan2(h - h0 - d * d / (2 * R_EFF), d) * R2D;
      if (a > best) { best = a; bestD = d; }
    }
    return { alt: best, distM: bestD };
  }
  /* Draw. view: { az, alt, hfov, vfov, eyeM }; light: { sunAz, sunAlt, moonAz, moonAlt, moonFrac, gain, hazeKm, haze, nv, trueCol } */
  render(view, light){
    const G = this.G; if (!G) return;
    const gl = G.gl, cv = this.canvas;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.rings.some(Boolean)) return;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.useProgram(G.prog);
    const eye = [0, 0, this.ground + view.eyeM];
    const mvp = mul(perspective(view.hfov, view.vfov, 2, 700000), lookAt(eye, view.az, view.alt));
    gl.uniformMatrix4fv(G.u.uMVP, false, mvp);
    gl.uniform3fv(G.u.uSun, dirOf(light.sunAz, Math.max(light.sunAlt, 2)));
    gl.uniform3fv(G.u.uMoon, dirOf(light.moonAz, Math.max(light.moonAlt, 0)));
    gl.uniform1f(G.u.uSunAlt, light.sunAlt);
    const moonUp = light.moonAlt > 0 ? Math.min(1, light.moonAlt / 10) : 0;
    gl.uniform1f(G.u.uMoonLight, moonUp * Math.pow(light.moonFrac, 1.6) * 0.9);
    gl.uniform1f(G.u.uGain, light.gain);
    gl.uniform1f(G.u.uHazeM, (light.hazeKm || 60) * 1000);
    gl.uniform1f(G.u.uHaze, light.haze == null ? 0.85 : light.haze);
    gl.uniform1f(G.u.uNv, light.nv ? 1 : 0);
    gl.uniform1f(G.u.uTrue, light.trueCol ? 1 : 0);
    gl.uniform1i(G.u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    /* inner ring wins the seam: outer rings are pushed back a touch in depth */
    gl.enable(gl.POLYGON_OFFSET_FILL);
    for (let i = 0; i < this.rings.length; i++) {
      const x = this.rings[i]; if (!x || !x.gpu) continue;
      gl.polygonOffset(i * 2, i * 2);
      const g = x.gpu;
      gl.bindTexture(gl.TEXTURE_2D, g.tex);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.pos); gl.enableVertexAttribArray(G.a.pos); gl.vertexAttribPointer(G.a.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.uv); gl.enableVertexAttribArray(G.a.uv); gl.vertexAttribPointer(G.a.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.nrm); gl.enableVertexAttribArray(G.a.nrm); gl.vertexAttribPointer(G.a.nrm, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
      gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }
}

/* ---------------- the sky, on a 2D canvas ----------------
   Gnomonic about the aim, the same projection the framing view uses, so the WebGL ground and the
   canvas sky agree to the pixel. Stars and the galactic band from NoctoPlan; sun and moon from
   NoctoEngine. The Milky Way is the app's own panorama in galactic coordinates, warped through
   the projection cell by cell. */
const NGP_RA = 192.86, NGP_DEC = 27.13, L_NCP = 122.93;
function galToEq(l, b){
  const P = window.NoctoPlan;
  if (P && P.galToEq) return P.galToEq(l, b);
  const lr = (l - L_NCP) * D2R, br = b * D2R, dn = NGP_DEC * D2R;
  const dec = Math.asin(Math.sin(br) * Math.sin(dn) + Math.cos(br) * Math.cos(dn) * Math.cos(lr));
  const y = Math.cos(br) * Math.sin(lr), x = Math.sin(br) * Math.cos(dn) - Math.cos(br) * Math.sin(dn) * Math.cos(lr);
  return { ra: ((NGP_RA + Math.atan2(y, x) * R2D) % 360 + 360) % 360, dec: dec * R2D };
}
let bandImg = null, bandLifted = null, bandLoading = false;
function loadBand(src, onReady){
  if (bandLifted) return bandLifted;
  if (bandLoading) return null;
  bandLoading = true;
  const img = new Image();
  img.onload = () => {
    try {
      const w = Math.min(4096, img.naturalWidth), h = Math.round(w / 2);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, w, h);
      /* Black point first, then the lift. The panorama's sky is not one level of dark: JPEG blocks
         and the mosaic's seams sit a few counts above zero, and a bare gamma lift multiplies that
         into mottling. Everything under the cut becomes one black, the arms still come up. */
      const B0 = 7;   // soft toe: quadratic below 2 x B0, so the noise floor goes and the arms stay
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        const x = i < 2 * B0 ? i * i / (4 * B0) : i - B0;
        lut[i] = Math.min(1, Math.pow(x / (255 - B0), 0.52) * 1.06) * 255;
      }
      const strip = Math.max(1, Math.floor(2097152 / w));
      for (let y = 0; y < h; y += strip) {
        const d = cx.getImageData(0, y, w, Math.min(strip, h - y)), p = d.data;
        for (let i = 0; i < p.length; i += 4) { p[i] = lut[p[i]]; p[i + 1] = lut[p[i + 1]]; p[i + 2] = lut[p[i + 2]]; }
        cx.putImageData(d, 0, y);
      }
      bandLifted = cv;
    } catch (e) { bandLifted = img; }
    bandImg = img;
    if (onReady) onReady();
  };
  img.src = src;
  return null;
}

function projector(aimAlt, aimAz, across, down, W, H){
  const sa = Math.sin(aimAlt * D2R), ca = Math.cos(aimAlt * D2R);
  const kx = (W / 2) / Math.tan(across / 2 * D2R), ky = (H / 2) / Math.tan(down / 2 * D2R);
  const fn = (alt, az) => {
    const s = Math.sin(alt * D2R), c = Math.cos(alt * D2R), dz = (az - aimAz) * D2R;
    const cosc = sa * s + ca * c * Math.cos(dz);
    if (cosc <= 0.05) return null;
    return { x: W / 2 + (c * Math.sin(dz)) / cosc * kx, y: H / 2 - (ca * s - sa * c * Math.cos(dz)) / cosc * ky };
  };
  fn.kx = kx; fn.ky = ky;
  /* which direction sits under a pixel, for the drag and the readout */
  fn.unproject = (x, y) => {
    const X = (x - W / 2) / kx, Y = -(y - H / 2) / ky;
    const rho = Math.hypot(X, Y), c = Math.atan(rho);
    if (rho < 1e-9) return { alt: aimAlt, az: aimAz };
    const alt = Math.asin(Math.cos(c) * sa + (Y * Math.sin(c) * ca) / rho) * R2D;
    const az = aimAz + Math.atan2(X * Math.sin(c), rho * ca * Math.cos(c) - Y * sa * Math.sin(c)) * R2D;
    return { alt, az: ((az % 360) + 360) % 360 };
  };
  return fn;
}

/* affine texture-mapped triangle */
function drawTri(ctx, img, s0, s1, s2, d0, d1, d2){
  const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
  if (Math.abs(den) < 1e-9) return;
  const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
  const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
  const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
  const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
  const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
  ctx.save();
  ctx.beginPath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/* Sky colour for one direction. alt and the bearing offset from the sun both matter: twilight is
   a glow at the sun's azimuth, golden at the horizon and blue above, with the pink belt of Venus
   opposite in civil twilight. Night is a near-uniform dark with a little skyglow at the horizon. */
function skyColour(alt, dAz, sunAlt, gain){
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const t = clamp((alt + 5) / 70, 0, 1);
  const cosD = Math.cos(dAz * D2R);
  const toward = 0.5 + 0.5 * cosD, away = 1 - toward;
  const day = clamp((sunAlt + 3) / 9, 0, 1);
  const tw = clamp((sunAlt + 18) / 18, 0, 1) * (1 - day);   // 0 at astronomical dark, 1 at sunset
  const civ = clamp((sunAlt + 7) / 7, 0, 1) * (1 - day);     // civil twilight only
  /* night */
  let r = 8 + 12 * (1 - t) * gain, g = 9 + 13 * (1 - t) * gain, b = 14 + 20 * (1 - t) * gain;
  /* twilight: a horizon glow whose reach grows as the sun climbs towards the horizon */
  const reach = 6 + 26 * tw;
  const h = Math.exp(-Math.max(alt, 0) / reach);
  const gold = Math.pow(toward, 2.2) * h * tw * tw * civ;
  const blue = h * tw * (0.35 + 0.65 * toward);
  const violet = Math.exp(-Math.max(alt, 0) / (reach * 1.8)) * tw * (0.2 + 0.4 * toward);
  const belt = Math.exp(-Math.abs(alt - 4) / 5) * Math.pow(away, 3) * civ * (1 - Math.pow(civ, 4));
  r += 250 * gold + 40 * blue + 60 * violet + 150 * belt;
  g += 140 * gold + 70 * blue + 40 * violet + 70 * belt;
  b += 40 * gold + 170 * blue + 120 * violet + 110 * belt;
  /* day: blue overhead, pale at the horizon, brighter towards the sun */
  if (day > 0) {
    const dr = 120 + 100 * (1 - t) + 30 * toward * h, dg = 160 + 60 * (1 - t) + 20 * toward * h, db = 225 + 25 * (1 - t);
    r = r * (1 - day) + dr * day; g = g * (1 - day) + dg * day; b = b * (1 - day) + db * day;
  }
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

/* ---------------- the star map: catalogue stars, constellation lines, boundaries, names ----------------
   Open data (d3-celestial's files, derived from HYG and the IAU), fetched once from a CDN. Longitude
   in those files is right ascension in degrees wrapped to -180..180. */
const SKY_BASE = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data/';
const SKY = { stars: null, lines: null, bounds: null, names: null, loading: false, failed: false };
function ra(lon){ return lon < 0 ? lon + 360 : lon; }
function lineSets(fc){
  const out = [];
  (fc.features || []).forEach(f => {
    const g = f.geometry; if (!g) return;
    const push = ring => out.push(ring.map(c => [ra(c[0]), c[1]]));
    if (g.type === 'LineString') push(g.coordinates);
    else if (g.type === 'MultiLineString' || g.type === 'Polygon') g.coordinates.forEach(push);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(push));
  });
  return out;
}
async function loadSkyData(onReady){
  if (SKY.loading || SKY.stars) return;
  SKY.loading = true;
  const get = async n => { const r = await fetch(SKY_BASE + n); if (!r.ok) throw new Error(n); return r.json(); };
  try {
    const [st, li, bo, na] = await Promise.all([get('stars.6.json'), get('constellations.lines.json'), get('constellations.bounds.json'), get('constellations.json')]);
    SKY.stars = (st.features || []).map(f => ({ ra: ra(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1], mag: Number(f.properties.mag), bv: f.properties.bv === '' || f.properties.bv == null ? null : Number(f.properties.bv) })).filter(s => isFinite(s.mag));
    SKY.lines = lineSets(li);
    SKY.bounds = lineSets(bo);
    SKY.names = (na.features || []).map(f => ({ ra: ra(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1], name: f.properties.name || f.properties.desig || f.id }));
  } catch (e) { SKY.failed = true; }
  SKY.loading = false;
  if (onReady) onReady();
}
function drawStarMap(ctx, pr, lat, lst, W, H, o){
  const E = window.NoctoEngine; if (!E || !SKY.stars) return;
  const dpr = o.dpr || 1, dark = o.dark == null ? 1 : o.dark, nv = !!o.nv;
  const proj = (r, d) => { const c = E.eq2horiz(r, d, lat, lst); if (c.alt < -8) return null; const p = pr(c.alt, c.az); return (p && p.f != null && p.f <= 0.05) ? null : p; };
  const kx = pr.kx != null ? pr.kx : (W / 2) / Math.tan((pr.hfovDeg || 60) / 2 * D2R);
  const big = Math.max(W, H);
  const strokeSets = (sets, style, width, dash) => {
    ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    sets.forEach(ring => {
      let prev = null;
      for (let i = 0; i < ring.length; i++) {
        const p = proj(ring[i][0], ring[i][1]);
        if (p && prev && Math.hypot(p.x - prev.x, p.y - prev.y) < big) ctx.lineTo(p.x, p.y);
        else if (p) ctx.moveTo(p.x, p.y);
        prev = p;
      }
    });
    ctx.stroke(); ctx.restore();
  };
  if (o.bounds) strokeSets(SKY.bounds, nv ? 'rgba(255,59,24,.22)' : 'rgba(240,236,228,.16)', dpr, [4 * dpr, 5 * dpr]);
  if (o.lines) strokeSets(SKY.lines, nv ? 'rgba(255,59,24,.5)' : 'rgba(214,179,104,.42)', dpr);
  if (o.stars && dark > 0) {
    ctx.save(); ctx.fillStyle = nv ? '#FF3B18' : '#EDEAE2';
    const scale = Math.min(2.2, Math.max(0.6, kx / (W / 2) / 1.2));
    const lim = 6.2 - (1 - Math.min(1, o.gain || 1)) * 1.5;   // a short exposure loses the faint ones
    for (let i = 0; i < SKY.stars.length; i++) {
      const s = SKY.stars[i]; if (s.mag > lim || s.mag < 1.6) continue;   // the bright ones are already drawn
      const p = proj(s.ra, s.dec); if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
      const r = Math.max(0.5 * dpr, (6.5 - s.mag) * 0.32 * scale * dpr);
      ctx.globalAlpha = dark * Math.max(0.18, Math.min(0.9, (6.6 - s.mag) / 5));
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }
  if (o.names) {
    ctx.save();
    ctx.font = '500 ' + (11 * dpr) + 'px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = nv ? 'rgba(255,59,24,.6)' : 'rgba(173,167,155,.75)';
    SKY.names.forEach(n => {
      const p = proj(n.ra, n.dec); if (!p || p.x < 20 || p.x > W - 20 || p.y < 10 || p.y > H - 30) return;
      ctx.fillText(n.name.toUpperCase().split('').join(String.fromCharCode(8202)), p.x, p.y);
    });
    ctx.restore();
  }
}

function drawSky(ctx, W, H, view, when, lat, lon, opts){
  const E = window.NoctoEngine, P = window.NoctoPlan;
  const o = opts || {};
  const pr = projector(view.alt, view.az, view.hfov, view.vfov, W, H);
  const jd = E.jdFrom(when), lst = E.lstOf(jd, lon);
  const sky = P.skyAt(when, lat, lon);
  const sunAlt = sky.sun.alt;
  const gain = o.gain == null ? 1 : o.gain;
  const nv = !!o.nv;
  skyBackground(ctx, W, H, view.alt, view.az, view.hfov, view.vfov, sky.sun.az, sunAlt, gain, { nv });
  const dark = Math.max(0, Math.min(1, (-sunAlt - 6) / 8));   // stars from -6, all in by -14
  if (dark > 0) {
    /* the band */
    const band = bandLifted;
    const bandGain = Math.max(0, Math.min(1, gain * 0.95)) * dark;
    if (band && bandGain > 0.02) {
      const nx = o.coarse ? 36 : 72, ny = o.coarse ? 18 : 36;
      const SW = band.width, SH = band.height;
      const grid = new Array((nx + 1) * (ny + 1));
      for (let j = 0; j <= ny; j++) {
        const b = (j / ny) * 180 - 90;
        for (let i = 0; i <= nx; i++) {
          let l = (0.5 - i / nx) * 360; l = ((l % 360) + 360) % 360;
          const g = galToEq(l, b), c = E.eq2horiz(g.ra, g.dec, lat, lst);
          const p = c.alt < -10 ? null : pr(c.alt, c.az);
          grid[j * (nx + 1) + i] = p ? [p.x, p.y] : null;
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = bandGain;
      if (nv) ctx.filter = 'grayscale(1) sepia(1) saturate(6) hue-rotate(-32deg) brightness(0.9)';
      const cw = SW / nx, ch = SH / ny, m = 60;
      const onScreen = p => p[0] > -m && p[0] < W + m && p[1] > -m && p[1] < H + m;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const p00 = grid[j * (nx + 1) + i], p10 = grid[j * (nx + 1) + i + 1];
        const p01 = grid[(j + 1) * (nx + 1) + i], p11 = grid[(j + 1) * (nx + 1) + i + 1];
        if (!p00 || !p10 || !p01 || !p11) continue;
        if (!(onScreen(p00) || onScreen(p10) || onScreen(p01) || onScreen(p11))) continue;
        const span = Math.max(Math.hypot(p10[0] - p00[0], p10[1] - p00[1]), Math.hypot(p01[0] - p00[0], p01[1] - p00[1]));
        if (span > Math.max(W, H) * 1.5) continue;   // a cell wrapped through the pole
        const s00 = [i * cw, j * ch], s10 = [(i + 1) * cw, j * ch], s01 = [i * cw, (j + 1) * ch], s11 = [(i + 1) * cw, (j + 1) * ch];
        drawTri(ctx, band, s00, s10, s01, p00, p10, p01);
        drawTri(ctx, band, s10, s11, s01, p10, p11, p01);
      }
      ctx.restore();
    }
    /* stars */
    const ink = nv ? '#FF3B18' : '#EDEAE2';
    sky.stars.forEach(s => {
      if (s.alt < -1) return;
      const p = pr(s.alt, s.az); if (!p || p.x < -8 || p.x > W + 8 || p.y < -8 || p.y > H + 8) return;
      const scale = o.starScale != null ? o.starScale : Math.min(2.2, Math.max(0.6, pr.kx / (W / 2) / 1.2));   // tighter lens, bigger stars
      const r = Math.max(1, (3.4 - s.mag) * 0.9 * scale * Math.max(0.6, gain));
      ctx.globalAlpha = dark * Math.max(0.3, Math.min(1, 1.1 - s.mag / 3));
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  /* the catalogue layers sit over the band and under the sun and moon */
  if (o.map && (o.map.stars || o.map.lines || o.map.bounds || o.map.names))
    drawStarMap(ctx, pr, lat, lst, W, H, Object.assign({ dark, gain, nv, dpr: o.dpr }, o.map));
  /* the moon, at its real size, with its phase */
  if (sky.moon.alt > -1) {
    const p = pr(sky.moon.alt, sky.moon.az);
    if (p) {
      const r = Math.max(2.5, pr.kx * Math.tan(0.26 * D2R));
      const frac = sky.moon.frac;
      ctx.save();
      ctx.fillStyle = nv ? '#FF3B18' : '#DDE0E8';
      ctx.shadowColor = nv ? 'rgba(255,59,24,.5)' : 'rgba(220,224,235,.55)'; ctx.shadowBlur = r * 1.5 * Math.max(0.5, gain);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
      ctx.shadowBlur = 0;
      /* the dark side: the terminator is an ellipse of semi-axis |k|r; the lit limb faces the sun */
      const dx = Math.sign(((sky.sun.az - sky.moon.az + 540) % 360) - 180) || 1;
      const k = Math.abs(2 * frac - 1) * r + 0.001;
      const rx = dx > 0 ? p.x - r : p.x;   // the half of the disc away from the sun
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = nv ? 'rgba(20,3,1,.94)' : 'rgba(10,11,16,.94)';
      ctx.beginPath(); ctx.rect(rx, p.y - r - 1, r + 1, 2 * r + 2); ctx.clip();
      ctx.beginPath(); ctx.rect(rx, p.y - r - 1, r + 1, 2 * r + 2);
      ctx.ellipse(p.x, p.y, k, r, 0, 0, 6.2832);
      ctx.fill(frac < 0.5 ? 'nonzero' : 'evenodd');
      if (frac < 0.5) {
        /* a crescent: the dark side is the whole anti-sun half plus the ellipse on the sun side */
        ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = nv ? 'rgba(20,3,1,.94)' : 'rgba(10,11,16,.94)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, k, r, 0, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
  }
  /* the sun */
  if (sunAlt > -1) {
    const p = pr(sunAlt, sky.sun.az);
    if (p) {
      const r = Math.max(3, pr.kx * Math.tan(0.27 * D2R));
      ctx.save(); ctx.fillStyle = '#FFF4DC'; ctx.shadowColor = 'rgba(255,240,200,.9)'; ctx.shadowBlur = r * 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill(); ctx.restore();
    }
  }
  return { pr, sky, dark };
}

/* ---------------- the sky's own colour, as a background ----------------
   For a gnomonic view about (aimAlt, aimAz) with fields across and down: a small grid of directions
   coloured for the sun where it is, scaled up smooth. Drawn with alpha so it can sit over a camera. */
function skyBackground(ctx, W, H, aimAlt, aimAz, across, down, sunAz, sunAlt, gain, opts){
  const o = opts || {};
  const pr = projector(aimAlt, aimAz, across, down, W, H);
  const gw = 64, gh = Math.max(8, Math.round(64 * H / W));
  if (!skyBackground._bg) skyBackground._bg = document.createElement('canvas');
  const bg = skyBackground._bg; if (bg.width !== gw || bg.height !== gh) { bg.width = gw; bg.height = gh; }
  const bctx = bg.getContext('2d');
  const id = bctx.createImageData(gw, gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const d = pr.unproject((i + 0.5) / gw * W, (j + 0.5) / gh * H);
    const c = skyColour(d.alt, d.az - sunAz, sunAlt, gain);
    const k = (j * gw + i) * 4;
    if (o.nv) { id.data[k] = Math.round(c[0] * 0.9); id.data[k + 1] = 0; id.data[k + 2] = 0; }
    else { id.data[k] = c[0]; id.data[k + 1] = c[1]; id.data[k + 2] = c[2]; }
    id.data[k + 3] = 255;
  }
  bctx.putImageData(id, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(bg, 0, 0, W, H); ctx.restore();
}

/* ---------------- the night as a strip ----------------
   Noon to noon in minutes. The moments worth planning around: sunset and sunrise, full dark and
   the first light, moonrise and moonset, and the core clearing or dropping behind the skyline. */
function nightEvents(baseMs, lat, lon, hzFn){
  const P = window.NoctoPlan; if (!P) return [];
  const out = []; let prev = null;
  const hz = az => hzFn ? (hzFn(az) || 0) : 0;
  for (let m = 0; m <= 1440; m += 4) {
    const s = P.skyAt(new Date(baseMs + m * 60000), lat, lon);
    const core = s.elements.find(e => e.id === 'core');
    const cur = { m, sun: s.sun.alt, moon: s.moon.alt, core: core ? core.alt - hz(core.az) : -99, moonFrac: s.moon.frac };
    if (prev) {
      const x = (a, b, lvl) => (a - lvl) * (b - lvl) < 0 ? prev.m + (m - prev.m) * (lvl - a) / (b - a) : null;
      let c;
      if ((c = x(prev.sun, cur.sun, -0.833)) != null) out.push({ m: c, label: cur.sun < prev.sun ? 'Sunset' : 'Sunrise', kind: 'sun' });
      if ((c = x(prev.sun, cur.sun, -18)) != null) out.push({ m: c, label: cur.sun < prev.sun ? 'Fully dark' : 'Dawn begins', kind: 'dark' });
      if ((c = x(prev.moon, cur.moon, 0.125)) != null && cur.moonFrac > 0.03) out.push({ m: c, label: cur.moon > prev.moon ? 'Moonrise' : 'Moonset', kind: 'moon' });
      if ((c = x(prev.core, cur.core, 0)) != null && cur.sun < -6) out.push({ m: c, label: cur.core > prev.core ? 'Core clears ground' : 'Core sets', kind: 'core' });
    }
    prev = cur;
  }
  return out.sort((a, b) => a.m - b.m);
}
const STRIP_PPM = 1.1;   // css pixels per minute
/* The strip's background is the sky's brightness through the day, which costs a sky sample per
   few minutes. Built once per day and place into an off-screen canvas and blitted from there, so
   the per-frame cost is a copy, and the AR loop can afford to repaint it while the clock runs. */
const stripCache = { key: null, cv: null };
function stripBackground(baseMs, lat, lon, dpr){
  const P = window.NoctoPlan; if (!P) return null;
  const key = [baseMs, lat.toFixed(3), lon.toFixed(3), dpr.toFixed(2)].join('|');
  if (stripCache.key === key) return stripCache.cv;
  const ppm = STRIP_PPM * dpr, step = 12;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(1440 * ppm) + 2; cv.height = 8;
  const cx = cv.getContext('2d');
  for (let m = 0; m <= 1440; m += step) {
    const s = P.skyAt(new Date(baseMs + m * 60000), lat, lon);
    const c = skyColour(20, 180, s.sun.alt, 1);
    cx.fillStyle = 'rgb(' + c.map(v => Math.round(v * 0.45)).join(',') + ')';
    cx.fillRect(m * ppm, 0, step * ppm + 1, 8);
  }
  stripCache.key = key; stripCache.cv = cv;
  return cv;
}
/* Paint the strip. o: { minutes, baseMs, lat, lon, events, nv, accent, ink, liveMinutes } */
function paintStrip(cv, o){
  if (!cv) return;
  const host = cv.parentElement || cv;
  const box = host.getBoundingClientRect(); if (!box.width) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(box.width * dpr), H = Math.round(box.height * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d');
  const ppm = STRIP_PPM * dpr;
  const nv = !!o.nv;
  const accent = nv ? '#FF3B18' : (o.accent || '#D6B368');
  const inkA = a => nv ? 'rgba(255,59,24,' + a + ')' : 'rgba(240,236,228,' + a + ')';
  const xOf = m => W / 2 + (m - o.minutes) * ppm;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = nv ? '#0B0301' : 'rgb(6,6,7)'; ctx.fillRect(0, 0, W, H);
  const bg = stripBackground(o.baseMs, o.lat, o.lon, dpr);
  if (bg) {
    if (nv) { ctx.save(); ctx.filter = 'grayscale(1) sepia(1) saturate(6) hue-rotate(-32deg) brightness(.7)'; }
    ctx.drawImage(bg, 0, 0, bg.width, 8, xOf(0), 0, bg.width, H);
    if (nv) ctx.restore();
  }
  /* now: under the labels */
  ctx.fillStyle = accent; ctx.fillRect(W / 2 - dpr, 0, 2 * dpr, H);
  /* the real clock, when the strip is showing some other moment */
  if (o.liveMinutes != null && Math.abs(o.liveMinutes - o.minutes) > 1) {
    const lx = xOf(o.liveMinutes);
    if (lx > 0 && lx < W) { ctx.fillStyle = inkA(0.5); ctx.fillRect(lx - 0.5 * dpr, 0, dpr, H); }
  }
  ctx.font = (11 * dpr) + 'px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let m = 0; m <= 1440; m += 30) {
    const x = xOf(m); if (x < -20 || x > W + 20) continue;
    const hour = m % 60 === 0;
    ctx.fillStyle = inkA(hour ? 0.55 : 0.22);
    ctx.fillRect(x - 0.5 * dpr, 0, dpr, (hour ? 10 : 5) * dpr);
    if (hour) {
      const label = String((12 + m / 60) % 24).padStart(2, '0') + ':00';
      if (Math.abs(x - W / 2) < 20 * dpr) { ctx.fillStyle = nv ? 'rgba(11,3,1,.85)' : 'rgba(6,6,7,.85)'; ctx.fillRect(x - 17 * dpr, 12 * dpr, 34 * dpr, 13 * dpr); ctx.fillStyle = inkA(0.55); }
      ctx.fillText(label, x, 13 * dpr);
    }
  }
  ctx.textBaseline = 'bottom'; ctx.font = '500 ' + (10.5 * dpr) + 'px Barlow, sans-serif';
  const placed = [];
  (o.events || []).forEach(ev => {
    const x = xOf(ev.m); if (x < -40 || x > W + 40) return;
    ctx.fillStyle = nv ? '#FF3B18' : ev.kind === 'moon' ? '#C9CBD2' : ev.kind === 'core' ? accent : 'rgba(240,236,228,.7)';
    ctx.beginPath(); ctx.arc(x, H - 9 * dpr, 3 * dpr, 0, 6.2832); ctx.fill();
    const text = ev.label.toUpperCase(), w = ctx.measureText(text).width + 6 * dpr;
    if (placed.some(p => Math.abs(p.x - x) < (w + p.w) / 2)) return;
    placed.push({ x, w });
    ctx.fillText(text, Math.max(w / 2, Math.min(W - w / 2, x)), H - 15 * dpr);
  });
}
/* Pointer handling for a strip, attached imperatively so the frame view and Sky AR share it.
   h: { get() -> minutes, set(minutes, live), commit(minutes), events() -> list }. Drag anywhere,
   flick to coast, tap a mark to jump. Returns a detach function. */
function stripGestures(el, h){
  let s = null, coast = 0;
  const clampM = m => Math.max(0, Math.min(1439, m));
  const down = e => {
    el.setPointerCapture(e.pointerId);
    if (coast) { clearTimeout(coast); coast = 0; }
    s = { x: e.clientX, m: h.get(), moved: false, vx: 0, lastX: e.clientX, lastT: performance.now() };
  };
  const move = e => {
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 3) s.moved = true;
    const now = performance.now();
    if (now - s.lastT > 8) { s.vx = 0.7 * s.vx + 0.3 * (e.clientX - s.lastX) / Math.max(1, now - s.lastT); s.lastX = e.clientX; s.lastT = now; }
    h.set(clampM(s.m - dx / STRIP_PPM), true);
  };
  const up = e => {
    if (!s) return;
    const st = s; s = null;
    if (!st.moved) {
      const box = el.getBoundingClientRect(), px = e.clientX - box.left, W = box.width, cur = h.get();
      let best = null;
      (h.events ? h.events() : []).forEach(ev => { const x = W / 2 + (ev.m - cur) * STRIP_PPM; const d = Math.abs(x - px); if (d < 16 && (!best || d < best.d)) best = { d, m: ev.m }; });
      h.commit(best ? best.m : cur); return;
    }
    let v = st.vx;
    const tick = () => {
      v *= 0.93;
      const m = clampM(h.get() - v * 16 / STRIP_PPM);
      if (Math.abs(v) < 0.02 || m <= 0 || m >= 1439) { coast = 0; h.commit(m); return; }
      h.set(m, true);
      coast = setTimeout(tick, 16);
    };
    if (Math.abs(v) > 0.05) coast = setTimeout(tick, 16); else h.commit(h.get());
  };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); if (coast) clearTimeout(coast); };
}

/* ---------------- the panorama strip ----------------
   The whole horizon as one equirectangular picture: az 0 to 360 across, the zenith down to a little
   below the horizon. Made from the same renderer as everything else, in two tiers of slices twenty
   degrees wide (one level, one tilted up), each output pixel a direction projected back into its
   slice's camera, so the strip is exact rather than a mosaic of flat frames. */
const PANO_TOP = 90, PANO_BOT = -12;
function panoTick(){ return new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); }); }
async function panoStrip(scene, out, o){
  if (!scene || !scene.ok) return false;
  /* thirty-degree slices, twelve to a tier: a third fewer renders and read-backs than twenty,
     which is most of the cost on a phone, and still well inside where gnomonic stays sharp */
  const PPD = o.ppd || 5, k = PPD * R2D, half = 15, N = 12, SW = 30;
  const OW = 360 * PPD, OH = (PANO_TOP - PANO_BOT) * PPD;
  if (out.width !== OW || out.height !== OH) { out.width = OW; out.height = OH; }
  const gcv = scene.canvas;
  const sky = o._sky || (o._sky = document.createElement('canvas'));
  const tmp = o._tmp || (o._tmp = document.createElement('canvas'));
  const sctx = sky.getContext('2d'), tctx = tmp.getContext('2d', { willReadFrequently: true });
  const img = new ImageData(OW, OH), od = img.data;
  const sinA = new Float64Array(OH), cosA = new Float64Array(OH);
  for (let y = 0; y < OH; y++) { const a = (PANO_TOP - (y + 0.5) / PPD) * D2R; sinA[y] = Math.sin(a); cosA[y] = Math.cos(a); }
  const sw = Math.ceil(2 * Math.tan((half + 0.8) * D2R) * k);
  const tiers = [{ e: 0, lo: PANO_BOT, hi: 40, vh: 42 }, { e: 64, lo: 40, hi: PANO_TOP, vh: 30 }];
  const octx = out.getContext('2d');
  for (const T of tiers) {
    const sh = Math.ceil(2 * Math.tan(T.vh * D2R) / Math.cos((half + 0.8) * D2R) * k);
    const hfov = 2 * Math.atan(sw / 2 / k) * R2D, vfov = 2 * Math.atan(sh / 2 / k) * R2D;
    const se = Math.sin(T.e * D2R), ce = Math.cos(T.e * D2R);
    const y0 = Math.max(0, Math.floor((PANO_TOP - T.hi) * PPD)), y1 = Math.min(OH, Math.ceil((PANO_TOP - T.lo) * PPD));
    /* start where you are looking and work outwards, so the part you are composing on arrives first */
    const i0 = Math.floor((((o.startAz || 0) % 360) + 360) % 360 / SW);
    for (let j = 0; j < N; j++) {
      const i = (i0 + (j % 2 ? -(j + 1) / 2 : j / 2) + N) % N;
      if (o.cancelled && o.cancelled()) return false;
      /* sized every slice: the scene's canvas is shared with the live view, which may have
         resized it in between */
      [gcv, sky, tmp].forEach(c => { if (c.width !== sw || c.height !== sh) { c.width = sw; c.height = sh; } });
      const view = { az: i * SW + half, alt: T.e, hfov, vfov, eyeM: o.eyeM || 1.6 };
      const r = drawSky(sctx, sw, sh, view, o.when, o.lat, o.lon, { gain: o.gain, nv: !!o.nv, coarse: false, dpr: 1, map: o.map, starScale: 0.75 });
      if (o.afterSky) o.afterSky(sctx, sw, sh, r.pr, r.sky);
      scene.render(view, { sunAz: r.sky.sun.az, sunAlt: r.sky.sun.alt, moonAz: r.sky.moon.az, moonAlt: r.sky.moon.alt,
        moonFrac: r.sky.moon.frac, gain: o.gain, hazeKm: 60, haze: 0.85, nv: !!o.nv, trueCol: !!o.trueCol });
      tctx.clearRect(0, 0, sw, sh); tctx.drawImage(sky, 0, 0); tctx.drawImage(gcv, 0, 0);
      const src = tctx.getImageData(0, 0, sw, sh).data;
      for (let x = 0; x < SW * PPD; x++) {
        const d = ((x + 0.5) / PPD - half) * D2R, sd = Math.sin(d), cd = Math.cos(d), ox = i * SW * PPD + x;
        for (let y = y0; y < y1; y++) {
          const dx = sd * cosA[y], dy = cd * cosA[y], dz = sinA[y];
          const fz = dy * ce + dz * se; if (fz <= 0.01) continue;
          const sx = Math.min(sw - 1, Math.max(0, Math.round(sw / 2 + dx / fz * k - 0.5)));
          const sy = Math.min(sh - 1, Math.max(0, Math.round(sh / 2 - (dz * ce - dy * se) / fz * k - 0.5)));
          const si = (sy * sw + sx) * 4, oi = (y * OW + ox) * 4;
          od[oi] = src[si]; od[oi + 1] = src[si + 1]; od[oi + 2] = src[si + 2]; od[oi + 3] = 255;
        }
      }
      /* each slice goes up as soon as it is done: the strip fills in rather than sitting black */
      octx.putImageData(img, 0, 0, i * SW * PPD, y0, SW * PPD, y1 - y0);
      if (o.onTier) o.onTier();
      await panoTick();
    }
  }
  return true;
}
/* The frame grid for a box { az, w, lo, hi } in degrees: rows by tilt, and in each row as many
   frames as the box needs at that tilt, because a frame tilted up covers more azimuth than one
   held level. lens: { across, down } in degrees; ov as a fraction. */
function panoGrid(box, lens, ov){
  const h = box.hi - box.lo, stepV = lens.down * (1 - ov);
  const nr = h <= lens.down ? 1 : Math.ceil((h - lens.down) / stepV - 1e-6) + 1;
  const covV = lens.down + (nr - 1) * stepV, t0 = box.lo + lens.down / 2 - (covV - h) / 2;
  const rows = [];
  for (let r = 0; r < nr; r++) {
    const t = t0 + r * stepV;
    const span = Math.min(360, 2 * Math.atan(Math.tan(lens.across / 2 * D2R) / Math.cos(Math.min(84, Math.abs(t)) * D2R)) * R2D);
    let step = span * (1 - ov), n, a0;
    if (box.w >= 359) { n = Math.max(1, Math.ceil(360 / step - 1e-6)); step = 360 / n; a0 = box.az; }
    else {
      n = box.w <= span ? 1 : Math.ceil((box.w - span) / step - 1e-6) + 1;
      a0 = box.az + span / 2 - (span + (n - 1) * step - box.w) / 2;
    }
    rows.push({ t, span, step, n, az: Array.from({ length: n }, (_, i) => a0 + i * step) });
  }
  return { rows, stepV, total: rows.reduce((s, r) => s + r.n, 0) };
}
/* one frame's outline on the strip, as [az, alt] pairs unwrapped about its own centre */
function panoFootprint(az, t, lens){
  const a = az * D2R, e = t * D2R;
  const f = [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
  const s = [Math.cos(a), -Math.sin(a), 0], u = [-Math.sin(a) * Math.sin(e), -Math.cos(a) * Math.sin(e), Math.cos(e)];
  const tx = Math.tan(lens.across / 2 * D2R), ty = Math.tan(lens.down / 2 * D2R), N = 8, pts = [];
  const push = (x, y) => {
    const d = [f[0] + x * s[0] + y * u[0], f[1] + x * s[1] + y * u[1], f[2] + x * s[2] + y * u[2]];
    const l = Math.hypot(d[0], d[1], d[2]);
    const rel = ((Math.atan2(d[0], d[1]) * R2D - az) % 360 + 540) % 360 - 180;
    pts.push([az + rel, Math.asin(d[2] / l) * R2D]);
  };
  for (let i = 0; i <= N; i++) push(-tx + 2 * tx * i / N, ty);
  for (let i = 1; i <= N; i++) push(tx, ty - 2 * ty * i / N);
  for (let i = 1; i <= N; i++) push(tx - 2 * tx * i / N, -ty);
  for (let i = 1; i < N; i++) push(-tx, -ty + 2 * ty * i / N);
  return pts;
}
/* The plane of the Milky Way at a moment: points along it, the core, the peak, and the box that
   holds the arch. It is a great circle, so above the horizon it always spans 180 degrees of
   azimuth; what changes through the night is where, and how high it stands. */
function panoArch(when, lat, lon){
  const E = window.NoctoEngine; if (!E) return null;
  const lst = E.lstOf(E.jdFrom(when), lon);
  const at = l => { const g = galToEq(l, 0); return E.eq2horiz(g.ra, g.dec, lat, lst); };
  const line = [];
  let peak = { alt: -90, az: 0 }, rise = null;
  for (let l = 0; l < 360; l += 2) {
    const p = at(l), q = at(l + 2);
    line.push(p);
    if (p.alt > peak.alt) peak = p;
    if (p.alt <= 0 && q.alt > 0) rise = q;
  }
  const core = at(0);
  let a0 = rise ? rise.az : peak.az - 90;
  if (((peak.az - a0 + 540) % 360) - 180 < 0) a0 -= 180;
  return { line, core, peak, from: ((a0 % 360) + 360) % 360,
    box: { az: a0 - 6, w: 192, lo: -8, hi: Math.min(PANO_TOP, peak.alt + 6) } };
}

window.NoctoScout = {
  pano: { strip: panoStrip, grid: panoGrid, footprint: panoFootprint, arch: panoArch, TOP: PANO_TOP, BOT: PANO_BOT },
  Scene, plan, sizeLine, ringsFor, projector, drawSky, drawStarMap, loadBand, galToEq, skyColour, skyBackground,
  nightEvents, paintStrip, stripGestures, STRIP_PPM,
  loadSkyData, skyDataReady: () => !!SKY.stars, skyDataFailed: () => SKY.failed, skyStars: () => SKY.stars,
  bandReady: () => !!bandLifted,
  R_EFF,
};
})();
