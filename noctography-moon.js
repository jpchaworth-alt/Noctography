/* Noctography Moon: the Moon as the camera will see it, for Scout's sky and the planning views.

   Where: topocentric (the Moon is close enough for the observer's place on the globe to move it by
   up to a degree) and refracted, so it sits on the real horizon at moonrise. Face: NASA SVS CGI Moon
   Kit, the LRO LROC WAC colour map and LOLA heights, lit by the Sun at the true phase
   (Lommel-Seeliger, as in the preview Paul approved), turned by the optical libration and the
   position angle of the axis, with a little earthshine on the dark side and the sky's own light in
   front of it. Low down, as in the preview, each pixel is refracted and coloured for its own
   altitude: the disc is squashed more at its foot than its crown, and its foot is redder.

   WebGL on a small canvas of its own, drawn into the caller's 2D canvas. Until the maps arrive, or
   without WebGL, draw() returns false and the caller keeps its old disc; tint() gives that the
   air's colour too. */
(function(){
if (window.NoctoMoon) return;
const D = Math.PI / 180;
const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : './'; })();
const ALB_URL = BASE + 'assets/moon/lroc_color_2k.jpg', DEM_URL = BASE + 'assets/moon/ldem_4_uint.jpg';
const Eng = () => window.NoctoEngine;
const norm = a => ((a % 360) + 360) % 360;
/* refraction in degrees: Saemundsson for a true altitude, Bennett for an apparent one (the shader
   undoes it with the same Bennett, so the two agree at the centre) */
function refr(h){ const x = Math.max(-1.9, h); return 1.02 / Math.tan((x + 10.3 / (x + 5.11)) * D) / 60; }
function refrApp(h){ const x = Math.max(-1.5, h); return 1 / Math.tan((x + 7.31 / (x + 4.4)) * D) / 60; }
function airmass(alt){ return 1 / (Math.sin(Math.max(alt, 0.05) * D) + 0.50572 * Math.pow(Math.max(alt, 0) + 6.07995, -1.6364)); }
/* the air's colour on the Moon at an apparent altitude: extinction per channel over the airmass,
   normalised to red, since a photographer exposes for the Moon. Linear [r, g, b]. */
const EXT = [0.10, 0.16, 0.28];
function tint(alt){ const X = airmass(alt), e = EXT.map(k => Math.pow(10, -0.4 * k * X)); return e.map(v => v / e[0]); }

/* Optical libration and the position angle of the axis (Meeus 53, physical libration left out) */
function libration(jd, m){
  const T = (jd - 2451545) / 36525, I = 1.54242 * D, eps = 23.4393 * D;
  const Om = (125.0445479 - 1934.1362891 * T + 0.0020754 * T * T) * D, F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * D;
  const lam = m.lam * D, bet = m.bet * D, W = lam - Om;
  const A = Math.atan2(Math.sin(W) * Math.cos(bet) * Math.cos(I) - Math.sin(bet) * Math.sin(I), Math.cos(W) * Math.cos(bet));
  let l = (A - F) % (2 * Math.PI); if (l > Math.PI) l -= 2 * Math.PI; if (l < -Math.PI) l += 2 * Math.PI;
  const b = Math.asin(-Math.sin(W) * Math.cos(bet) * Math.sin(I) - Math.sin(bet) * Math.cos(I));
  const X = Math.sin(I) * Math.sin(Om), Y = Math.sin(I) * Math.cos(Om) * Math.cos(eps) - Math.cos(I) * Math.sin(eps), w = Math.atan2(X, Y);
  const P = Math.asin(Math.max(-1, Math.min(1, Math.hypot(X, Y) * Math.cos(m.ra * D - w) / Math.cos(b))));
  return { l, b, P };
}

/* Everything about the Moon for one moment and place. alt and az are apparent (topocentric, then
   refracted); sd is the topocentric semi-diameter in degrees; l, b, P, chi, q and i in radians. */
function apparent(when, lat, lon, elevM){
  const e = Eng(); if (!e || !e.moonPos) return null;
  const jd = e.jdFrom(when), lst = e.lstOf(jd, lon), m = e.moonPos(jd), s = e.sunPos(jd);
  /* Meeus 40: the observer's offset from the Earth's centre, applied to RA and Dec */
  const phi = lat * D, u = Math.atan(0.99664719 * Math.tan(phi)), hh = (elevM || 0) / 6378140;
  const rs = 0.99664719 * Math.sin(u) + hh * Math.sin(phi), rc = Math.cos(u) + hh * Math.cos(phi);
  const sp = 6378.14 / m.distKm, H = (lst - m.ra) * D, dec = m.dec * D;
  const dA = Math.atan2(-rc * sp * Math.sin(H), Math.cos(dec) - rc * sp * Math.cos(H));
  const decT = Math.atan2((Math.sin(dec) - rs * sp) * Math.cos(dA), Math.cos(dec) - rc * sp * Math.cos(H)) / D;
  const raT = norm(m.ra + dA / D);
  const h = e.eq2horiz(raT, decT, lat, lst);
  const sd = Math.asin(1737.4 / m.distKm) / D * (1 + Math.max(0, Math.sin(h.alt * D)) * sp);
  const il = e.moonIllum(jd, s, m), lb = libration(jd, m);
  /* the bright limb's position angle, from north through east */
  const a0 = s.ra * D, d0 = s.dec * D, am = m.ra * D;
  const chi = Math.atan2(Math.cos(d0) * Math.sin(a0 - am), Math.sin(d0) * Math.cos(dec) - Math.cos(d0) * Math.sin(dec) * Math.cos(a0 - am));
  /* the parallactic angle: turns the sky's north into the camera's up */
  const Ht = (lst - raT) * D, dT = decT * D;
  const q = Math.atan2(Math.sin(Ht), Math.tan(phi) * Math.cos(dT) - Math.sin(dT) * Math.cos(Ht));
  return { alt: h.alt + refr(h.alt), az: h.az, trueAlt: h.alt, ra: raT, dec: decT, lst, sd, l: lb.l, b: lb.b, P: lb.P, chi, q, i: il.phase * D, frac: il.frac };
}

/* The patch of sky the Moon is drawn into, on screen: its centre and the screen vectors for S true
   degrees along the horizon (rx, ry) and up (ux, uy), S a little over the Moon's radius. The
   projection is near enough straight over half a degree; the bend refraction puts into the disc is
   done per pixel in the shader. big magnifies the whole patch on wide views without changing its
   shape. gx, gy, ga, gb and grot are the refracted outline as an ellipse, for the glow behind it.
   proj(alt, az) -> { x, y } or null. */
function frame(ap, proj, big){
  const S = ap.sd * 1.06, s = S * (big || 1), c = proj(ap.alt, ap.az); if (!c) return null;
  const pr = proj(ap.alt, ap.az + s / Math.max(0.02, Math.cos(ap.alt * D)));
  const up = ap.alt + s < 89.9, pu = proj(up ? ap.alt + s : ap.alt - s, ap.az);
  if (!pr || !pu) return null;
  const rx = pr.x - c.x, ry = pr.y - c.y, ux = up ? pu.x - c.x : c.x - pu.x, uy = up ? pu.y - c.y : c.y - pu.y;
  const ta = ap.alt - refrApp(ap.alt), lo = ta - ap.sd + refr(ta - ap.sd), hi = ta + ap.sd + refr(ta + ap.sd), mid = (lo + hi) / 2;
  return { x: c.x, y: c.y, rx, ry, ux, uy, S,
    gx: c.x + ux * (mid - ap.alt) / S, gy: c.y + uy * (mid - ap.alt) / S,
    ga: Math.hypot(rx, ry) * ap.sd / S, gb: Math.hypot(ux, uy) * (hi - lo) / 2 / S, grot: Math.atan2(ry, rx) };
}

/* ---- the renderer ---- */
const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
const FS = [
  'precision highp float;',
  'uniform sampler2D uAlb, uDem; uniform vec2 uRes;',
  'uniform float uRot, uL, uB, uRelief, uEs, uNv, uApp, uTrue, uSpan, uSD; uniform vec3 uSun, uSky;',
  'const float PI = 3.14159265, D = 0.017453293;',
  'float airmass(float alt){ return 1.0 / (sin(max(alt, 0.05) * D) + 0.50572 * pow(max(alt, 0.0) + 6.07995, -1.6364)); }',
  'float refrA(float h){ h = max(h, -1.5); return 1.0 / tan((h + 7.31 / (h + 4.4)) * D) / 60.0; }',
  /* disc frame: x along the horizon (azimuth increasing), y up, z towards the observer */
  'vec2 sel(vec2 xy, float z){ float c = cos(uRot), s = sin(uRot); float x1 = xy.x * c + xy.y * s, y1 = -xy.x * s + xy.y * c;',
  '  float yb = y1 * cos(uB) + z * sin(uB), zb = -y1 * sin(uB) + z * cos(uB); return vec2(uL + atan(x1, zb), asin(clamp(yb, -1.0, 1.0))); }',
  'vec2 uvOf(vec2 ll){ return vec2(fract(0.5 + ll.x / (2.0 * PI)), clamp(0.5 - ll.y / PI, 0.0, 1.0)); }',
  'float dem(vec2 xy){ float z = sqrt(max(0.0, 1.0 - dot(xy, xy))); return texture2D(uDem, uvOf(sel(xy, z))).r; }',
  'void main(){',
  '  vec2 f = gl_FragCoord.xy / uRes * 2.0 - 1.0;',
  /* this pixel's apparent altitude, and the true one behind it: the refraction undone pixel by pixel */
  '  float app = uApp + f.y * uSpan;',
  '  vec2 xy = vec2(f.x * uSpan, app - refrA(app) - uTrue) / uSD;',
  '  float r = length(xy), px = 2.0 / uRes.x * uSpan / uSD;',
  '  float a = clamp((1.0 - r) / px + 0.5, 0.0, 1.0); if (a <= 0.0) { gl_FragColor = vec4(0.0); return; }',
  '  vec2 q = r > 0.999 ? xy / r * 0.999 : xy; float z = sqrt(max(0.0, 1.0 - dot(q, q)));',
  '  vec3 alb = pow(texture2D(uAlb, uvOf(sel(q, z))).rgb, vec3(2.2)); vec3 n = vec3(q, z);',
  '  if (uRelief > 0.5) { float e = 0.010;',
  '    float gx = (dem(q + vec2(e, 0.0)) - dem(q - vec2(e, 0.0))) / (2.0 * e), gy = (dem(q + vec2(0.0, e)) - dem(q - vec2(0.0, e))) / (2.0 * e);',
  /* near the limb a step across the disc spans a long way on the ground, so the slope there is
     foreshortened away rather than left to throw black specks along the edge */
  '    vec2 g = clamp(vec2(gx, gy), -6.0, 6.0) * smoothstep(0.12, 0.45, z);',
  '    vec3 tx = vec3(1.0, 0.0, -q.x / max(z, 0.05)), ty = vec3(0.0, 1.0, -q.y / max(z, 0.05));',
  '    n = normalize(n - 0.030 * (g.x * tx + g.y * ty)); }',
  /* the relief shades the lit side; the terminator stays where the sphere puts it */
  '  float mu0 = max(dot(n, uSun), 0.0), mu = max(z, 0.02);',
  '  float I = mu0 / (mu0 + mu) * 2.0 * smoothstep(-0.03, 0.06, dot(vec3(q, z), uSun));',
  /* exposed for the Moon: the air sets its colour, not its exposure, pixel by pixel, so low down
     its foot is redder than its crown */
  '  vec3 ext = pow(vec3(10.0), -0.4 * vec3(0.10, 0.16, 0.28) * airmass(app)), hue = ext / max(ext.r, 1e-4);',
  '  vec3 col = pow(clamp(alb * (I * 1.15 + uEs) * hue + uSky, 0.0, 1.0), vec3(1.0 / 2.2));',
  '  if (uNv > 0.5) { float L = dot(col, vec3(0.3, 0.59, 0.11)); col = vec3(L, L * 0.23, L * 0.094); }',
  '  gl_FragColor = vec4(col * a, a); }',
].join('\n');

const R = { cv: null, gl: null, prog: null, u: {}, tex: {}, img: {}, dead: false, key: '', N: 0, asked: false };
function want(){
  if (R.asked) return; R.asked = true;
  [['alb', ALB_URL], ['dem', DEM_URL]].forEach(([k, url]) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { R.img[k] = im; if (R.gl) upload(k); if (R.img.alb && R.img.dem) try { window.dispatchEvent(new Event('nocto-face')); } catch (e) {} };
    im.onerror = () => { R.dead = true; };
    im.src = url;
  });
}
function setup(){
  if (R.gl || R.dead) return !!R.gl;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) { R.dead = true; return false; }
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const la = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    ['uAlb', 'uDem', 'uRes', 'uRot', 'uL', 'uB', 'uRelief', 'uEs', 'uNv', 'uApp', 'uTrue', 'uSpan', 'uSD', 'uSun', 'uSky'].forEach(k => R.u[k] = gl.getUniformLocation(p, k));
    gl.uniform1i(R.u.uAlb, 0); gl.uniform1i(R.u.uDem, 1);
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); R.dead = true; R.gl = null; });
    Object.assign(R, { cv, gl, prog: p });
    ['alb', 'dem'].forEach(k => { if (R.img[k]) upload(k); });
    return true;
  } catch (e) { if (window.console) console.warn('NoctoMoon:', e.message); R.dead = true; return false; }
}
function upload(k){
  const gl = R.gl, im = R.img[k]; if (!gl || !im) return;
  gl.activeTexture(k === 'alb' ? gl.TEXTURE0 : gl.TEXTURE1);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
  const pot = v => (v & (v - 1)) === 0;
  if (pot(im.naturalWidth) && pot(im.naturalHeight)) {
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  } else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  R.tex[k] = t; R.key = '';
}
const ready = () => !R.dead && !!(R.img.alb && R.img.dem);

/* ap from apparent(), F from frame(); o: { nv, sky: [r, g, b] 0-255 in front of the Moon, relief }.
   Returns false (the caller draws its own disc) until it can draw the real one. */
function draw(ctx, ap, F, o){
  o = o || {}; want();
  if (!ap || !F || !ready() || !setup()) return false;
  const rpx = Math.max(Math.hypot(F.rx, F.ry), Math.hypot(F.ux, F.uy)); if (!(rpx >= 5)) return false;
  const N = Math.min(1024, Math.max(64, Math.pow(2, Math.ceil(Math.log2(2 * rpx)))));
  const gl = R.gl, i = ap.i, ang = ap.chi - ap.q, sun = [-Math.sin(ang) * Math.sin(i), Math.cos(ang) * Math.sin(i), Math.cos(i)];
  const sky = (o.sky || [0, 0, 0]).map(v => Math.pow(Math.max(0, Math.min(255, v)) / 255, 2.2));
  const es = 0.006 * Math.pow((1 - Math.cos(i)) / 2, 4), relief = o.relief === false ? 0 : 1, nv = o.nv ? 1 : 0;
  const rot = ap.P - ap.q, tru = ap.alt - refrApp(ap.alt);
  const key = [N, ap.alt.toFixed(4), F.S.toFixed(5), ap.l.toFixed(3), ap.b.toFixed(3), rot.toFixed(3), sun.map(v => v.toFixed(3)).join(','), sky.map(v => v.toFixed(3)).join(','), relief, nv].join('|');
  if (key !== R.key) {
    if (R.N !== N) { R.cv.width = R.cv.height = N; R.N = N; }
    gl.viewport(0, 0, N, N); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.tex.alb);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.tex.dem);
    const u = R.u;
    gl.uniform2f(u.uRes, N, N); gl.uniform1f(u.uRot, rot); gl.uniform1f(u.uL, ap.l); gl.uniform1f(u.uB, ap.b);
    gl.uniform1f(u.uApp, ap.alt); gl.uniform1f(u.uTrue, tru); gl.uniform1f(u.uSpan, F.S); gl.uniform1f(u.uSD, ap.sd);
    gl.uniform1f(u.uRelief, relief); gl.uniform1f(u.uEs, es); gl.uniform1f(u.uNv, nv);
    gl.uniform3f(u.uSun, sun[0], sun[1], sun[2]); gl.uniform3f(u.uSky, sky[0], sky[1], sky[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (gl.isContextLost && gl.isContextLost()) return false;
    R.key = key;
  }
  const h = N / 2;
  ctx.save();
  ctx.transform(F.rx / h, F.ry / h, -F.ux / h, -F.uy / h, F.x, F.y);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(R.cv, -h, -h, N, N);
  ctx.restore();
  return true;
}

window.NoctoMoon = { apparent, frame, draw, libration, refr, refrApp, tint, ready, load: want,
  credit: 'Moon: NASA SVS CGI Moon Kit, LRO LROC and LOLA' };
})();
