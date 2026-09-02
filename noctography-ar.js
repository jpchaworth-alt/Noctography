/* Noctography AR: the framing view aimed by the phone instead of by sliders.
   Two long-standing browser APIs and no WebXR, because iOS Safari still has no handheld WebXR
   AR: getUserMedia for the passthrough, DeviceOrientation for the aim. Everything stays on the
   device, including the camera feed, which is never read back off the video element. */
"use strict";
(function(){
if (window.NoctoAR) return;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm = a => ((a % 360) + 360) % 360;
const KEY = 'nocto-ar-v1';

/* A modern phone is three cameras, not one, and which one is fitted matters more than any
   slider: framing a 135mm shot through a 68-degree wide lens leaves a rectangle the size of a
   postage stamp. Nominal horizontal fields for the three kinds, used to choose between them and
   as the starting calibration for each. */
const MAX_ZOOM = 12;
const LENS_NOMINAL = { ultrawide: 104, wide: 68, tele: 26 };
const LENS_LABEL = { ultrawide: 'ultra wide', wide: 'wide', tele: 'telephoto' };

const S = {
  motion: false, camera: false, stream: null, video: null,
  alpha: 0, beta: 70, gamma: 0, absolute: false, compass: null,
  screenAngle: 0, nudge: 0, haveEvent: false, listening: false,
  smooth: null,
  /* the fitted lens, the digital zoom on top of it, and how much of that zoom the hardware
     agreed to do for us (the rest is done in CSS, which is all iOS Safari allows) */
  lens: 'wide', cameras: [], deviceId: null, zoom: 1, hwZoom: 1,
  hfovByLens: { ultrawide: 104, wide: 62, tele: 26 },
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (typeof saved.nudge === 'number') S.nudge = saved.nudge;
  if (saved.hfovByLens && typeof saved.hfovByLens === 'object')
    S.hfovByLens = Object.assign(S.hfovByLens, saved.hfovByLens);
  // one calibration figure was saved before there was more than one lens: it was the wide
  else if (typeof saved.hfov === 'number') S.hfovByLens.wide = saved.hfov;
} catch (e) {}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify({ nudge: S.nudge, hfovByLens: S.hfovByLens })); }
  catch (e) {}
};

/* ---------- rotation ---------- */
/* The W3C device frame: X across the screen, Y up the screen, Z out of the glass, so the rear
   camera looks along -Z. R = Rz(alpha)Rx(beta)Ry(gamma) takes device coordinates into the world
   frame, which here is X east, Y north, Z up. */
function mul(a, b){
  const o = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
    o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}
function rotZ(t){ const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
function rotX(t){ const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function rotY(t){ const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
const apply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/* Raw orientation events jitter by a degree or two even on a tripod, which reads as the whole
   sky shivering. A low-pass on the angles is enough, taken the short way round the circle. */
function lerpAng(a, b, k){
  let d = ((b - a + 540) % 360) - 180;
  return a + d * k;
}
function onOrient(e){
  if (e.alpha == null && e.beta == null && e.gamma == null) return;
  S.haveEvent = true;
  const a = e.alpha == null ? S.alpha : e.alpha;
  const b = e.beta == null ? S.beta : e.beta;
  const g = e.gamma == null ? S.gamma : e.gamma;
  if (!S.smooth) S.smooth = { a, b, g };
  else {
    S.smooth.a = lerpAng(S.smooth.a, a, 0.22);
    S.smooth.b = lerpAng(S.smooth.b, b, 0.22);
    S.smooth.g = lerpAng(S.smooth.g, g, 0.22);
  }
  S.alpha = S.smooth.a; S.beta = S.smooth.b; S.gamma = S.smooth.g;
  if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
    S.compass = e.webkitCompassHeading;
    S.absolute = true;
  } else if (e.absolute === true) S.absolute = true;
}
function readScreen(){
  const o = window.screen && window.screen.orientation;
  S.screenAngle = o && typeof o.angle === 'number' ? o.angle : (window.orientation || 0);
}

function listen(){
  if (S.listening) return;
  S.listening = true;
  readScreen();
  window.addEventListener('orientationchange', readScreen);
  if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener)
    window.screen.orientation.addEventListener('change', readScreen);
  window.addEventListener('deviceorientationabsolute', onOrient, true);
  window.addEventListener('deviceorientation', onOrient, true);
}
function unlisten(){
  if (!S.listening) return;
  S.listening = false;
  window.removeEventListener('deviceorientationabsolute', onOrient, true);
  window.removeEventListener('deviceorientation', onOrient, true);
  window.removeEventListener('orientationchange', readScreen);
}

/* ---------- fields of view ---------- */
/* Two figures, kept apart on purpose. The base is what the fitted lens sees, and it is what the
   calibration slider adjusts, per lens, because a phone's published figures are marketing. The
   effective field is the base narrowed by whatever zoom is applied, and it is what the overlay
   projects through: zoom in and the sky, the subjects and the lens rectangle all grow together,
   which is the only way a zoomed view stays honest. */
function baseHfov(){
  return S.hfovByLens[S.lens] || LENS_NOMINAL[S.lens] || 62;
}
function effHfov(){
  const b = baseHfov();
  const z = Math.max(1, S.zoom || 1);
  if (z <= 1.0001) return b;
  return 2 * Math.atan(Math.tan(b / 2 * D2R) / z) * R2D;
}
/* What CSS has to make up, because the hardware would not do it. */
function cssZoom(){
  return Math.max(1, (S.zoom || 1) / (S.hwZoom || 1));
}

/* ---------- the aim ---------- */
/* The compass is the weak link: 10 to 20 degrees out is routine and worse beside a tripod head
   or a car. Where iOS gives a true heading we trust it as the starting guess; everywhere else
   the user aligns on the moon and we remember the offset. */
function headingOffset(){
  if (S.compass == null) return 0;
  const fromAlpha = norm(360 - S.alpha);
  return norm(S.compass - fromAlpha);
}

function basis(){
  const R = mul(mul(rotZ(S.alpha * D2R), rotX(S.beta * D2R)), rotY(S.gamma * D2R));
  /* The rendering surface rotates with the screen, the device frame does not, so the basis is
     rotated back about the screen normal. It has to be MINUS the reported angle: when the OS
     turns the layout to keep it upright, screen-up has moved the other way in device
     coordinates. Getting this sign wrong is invisible in either portrait, because 0 and 180
     negate to themselves, and puts the whole overlay 180 degrees out in both landscapes: the
     giveaway is the ground wash sitting above the horizon instead of below it. */
  const t = -S.screenAngle * D2R, ct = Math.cos(t), st = Math.sin(t);
  const right = apply(R, [ct, st, 0]);
  const up = apply(R, [-st, ct, 0]);
  const fwd = apply(R, [0, 0, -1]);
  const off = headingOffset() + S.nudge;
  return { right, up, fwd, off,
    alt: Math.asin(Math.max(-1, Math.min(1, fwd[2]))) * R2D,
    az: norm(Math.atan2(fwd[0], fwd[1]) * R2D + off) };
}

/* A point on the sky as a unit vector, with the calibration offset folded in so that the stars,
   the subjects, the moon, the trails and the cardinals all move together. */
function vecFor(alt, az, off){
  const a = alt * D2R, z = (az - off) * D2R, c = Math.cos(a);
  return [c * Math.sin(z), c * Math.cos(z), Math.sin(a)];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* A projector with the same signature idea as the framing view's: give it the canvas and it
   hands back a function from alt/az to pixels, or null when the point is behind you. */
function projector(W, H, opts){
  const b = (opts && opts.basis) || basis();
  const hf = ((opts && opts.hfov) || effHfov()) * D2R;
  const vf = 2 * Math.atan(Math.tan(hf / 2) * (H / W));
  const kx = (W / 2) / Math.tan(hf / 2), ky = (H / 2) / Math.tan(vf / 2);
  const fn = (alt, az) => {
    const p = vecFor(alt, az, b.off);
    const f = dot(p, b.fwd);
    if (f <= 0.08) return null;
    return { x: W / 2 + (dot(p, b.right) / f) * kx, y: H / 2 - (dot(p, b.up) / f) * ky, f };
  };
  fn.basis = b;
  fn.hfovDeg = hf * R2D;
  fn.vfovDeg = vf * R2D;
  /* the inverse, for tap to align: which direction is under this pixel */
  fn.unproject = (x, y) => {
    const dx = (x - W / 2) / kx, dy = -(y - H / 2) / ky;
    const v = [
      b.fwd[0] + dx * b.right[0] + dy * b.up[0],
      b.fwd[1] + dx * b.right[1] + dy * b.up[1],
      b.fwd[2] + dx * b.right[2] + dy * b.up[2],
    ];
    const n = Math.hypot(v[0], v[1], v[2]);
    return { alt: Math.asin(v[2] / n) * R2D, az: norm(Math.atan2(v[0], v[1]) * R2D + b.off) };
  };
  return fn;
}

/* ---------- permissions and camera ---------- */
function motionNeedsPermission(){
  return typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';
}
async function requestMotion(){
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  if (motionNeedsPermission()) {
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') return false;
    } catch (e) { return false; }
  }
  listen();
  S.motion = true;
  // give the first event a moment to arrive, so callers can report honestly
  await new Promise(r => setTimeout(r, 350));
  return S.haveEvent;
}

/* Which of the phone's cameras is which. Labels are blank until a stream has been granted once,
   so this is worth calling again after startCamera rather than only before it. */
function classify(label){
  const l = (label || '').toLowerCase();
  if (/ultra/.test(l)) return 'ultrawide';
  if (/tele/.test(l)) return 'tele';
  return 'wide';
}
async function listCameras(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return S.cameras;
  let devs = [];
  try { devs = await navigator.mediaDevices.enumerateDevices(); } catch (e) { return S.cameras; }
  const vids = devs.filter(d => d.kind === 'videoinput');
  const back = vids.filter(d => !/front|face|user|selfie/i.test(d.label || ''));
  const pool = back.length ? back : vids;
  const seen = {};
  const out = [];
  pool.forEach(d => {
    const kind = classify(d.label);
    if (seen[kind]) return;                        // one representative per kind is enough
    seen[kind] = true;
    out.push({ id: d.deviceId, label: d.label || LENS_LABEL[kind], kind });
  });
  out.sort((a, b) => LENS_NOMINAL[b.kind] - LENS_NOMINAL[a.kind]);   // widest first
  if (out.length) S.cameras = out;
  return S.cameras;
}

/* Ask the track for real optical or sensor zoom, and remember how much of the request it took.
   Chrome on Android usually obliges; iOS Safari does not expose zoom at all, so this returns 1
   and CSS carries the whole factor. Either way the overlay maths uses the total. */
async function applyHardwareZoom(){
  const track = S.stream && S.stream.getVideoTracks && S.stream.getVideoTracks()[0];
  if (!track || !track.getCapabilities || !track.applyConstraints) { S.hwZoom = 1; return; }
  let caps = null;
  try { caps = track.getCapabilities(); } catch (e) { caps = null; }
  if (!caps || !caps.zoom) { S.hwZoom = 1; return; }
  const want = Math.max(caps.zoom.min || 1, Math.min(caps.zoom.max || 1, S.zoom));
  try { await track.applyConstraints({ advanced: [{ zoom: want }] }); S.hwZoom = want || 1; }
  catch (e) { S.hwZoom = 1; }
}

async function startCamera(video, opts){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  const o = opts || {};
  const want = o.deviceId
    ? { deviceId: { exact: o.deviceId }, width: { ideal: 1920 } }
    : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } };
  /* One stream at a time: asking for a second camera while the first is live fails outright on
     iOS, so the old one is released before the new one is requested. */
  if (S.stream) {
    S.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    S.stream = null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: want, audio: false });
    S.stream = stream; S.camera = true; S.video = video || S.video;
    if (o.deviceId) S.deviceId = o.deviceId;
    if (o.lens) S.lens = o.lens;
    const v = S.video;
    if (v) { v.srcObject = stream; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    await listCameras();
    await applyHardwareZoom();
    return true;
  } catch (e) {
    // a named camera can be refused where the generic rear one is not: fall back rather than fail
    if (o.deviceId && !o._retry) return startCamera(video, { _retry: true });
    S.camera = false;
    return false;
  }
}
function stopCamera(){
  if (S.stream) { S.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); S.stream = null; }
  if (S.video) { try { S.video.srcObject = null; } catch (e) {} S.video = null; }
  S.camera = false;
}
function stop(){ stopCamera(); unlisten(); S.motion = false; S.haveEvent = false; S.smooth = null; }

/* Zooming is expressed as one continuous quantity: the field of view you want to see. The lens
   fitted and the zoom applied are both derived from it, which is what makes a pinch flow through
   the phone's cameras instead of stopping at the edge of one. Nothing here consults the focal
   length being planned: that only decides where a pinch STARTS.

   The rule for a wanted field: the narrowest camera that still contains it, so zoom is only ever
   used to go tighter than a lens natively sees, never wider (which would be pure upscaling with
   a better lens sitting unused). */
function hfovFor(kind){
  return S.hfovByLens[kind] || LENS_NOMINAL[kind] || 62;
}
function pickLensForField(target){
  if (!S.cameras.length) return null;
  const fit = S.cameras.filter(c => hfovFor(c.kind) >= target * 0.999);
  // nothing contains a field this wide, so the widest camera there is; otherwise the tightest
  // one that still holds it, which is the one that needs the least digital zoom
  return fit.length ? fit[fit.length - 1] : S.cameras[0];
}
function zoomForField(target, kind){
  const b = hfovFor(kind || S.lens);
  if (!(target > 0) || target >= b) return 1;
  return Math.max(1, Math.min(MAX_ZOOM, Math.tan(b / 2 * D2R) / Math.tan(target / 2 * D2R)));
}
/* How wide and how tight this phone can actually go, across every camera it has. */
function fieldRange(){
  const bases = S.cameras.length ? S.cameras.map(c => hfovFor(c.kind)) : [baseHfov()];
  const wide = Math.max.apply(null, bases);
  const narrowBase = Math.min.apply(null, bases);
  return { wide, narrow: 2 * Math.atan(Math.tan(narrowBase / 2 * D2R) / MAX_ZOOM) * R2D };
}

/* Kept for the framing case: the field that puts a frame this wide across most of the screen. */
function fieldForFrame(acrossDeg, fill){
  const f = Math.max(0.2, Math.min(0.95, fill || 0.72));
  return Math.max(1, Math.max(1, acrossDeg) / f);
}

window.NoctoAR = {
  state: S,
  LENS_NOMINAL, LENS_LABEL,
  supported: () => typeof DeviceOrientationEvent !== 'undefined',
  cameraSupported: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  secure: () => window.isSecureContext !== false,
  motionNeedsPermission, requestMotion, startCamera, stopCamera, stop, listen,
  basis, projector, vecFor,
  live: () => S.haveEvent,
  absolute: () => S.absolute,
  nudge: () => S.nudge,
  setNudge: d => { S.nudge = norm(d); save(); },
  addNudge: d => { S.nudge = norm(S.nudge + d); save(); },
  /* hfov reads and writes the ACTIVE lens's calibration; effHfov is what the overlay uses */
  hfov: baseHfov,
  effHfov,
  setHfov: v => { S.hfovByLens[S.lens] = Math.max(5, Math.min(140, v)); save(); },
  cameras: () => S.cameras,
  lens: () => S.lens,
  lensLabel: () => LENS_LABEL[S.lens] || S.lens,
  setLens: k => { if (LENS_NOMINAL[k]) S.lens = k; },
  listCameras, hfovFor, pickLensForField, zoomForField, fieldRange, fieldForFrame,
  zoom: () => S.zoom,
  cssZoom,
  maxZoom: () => MAX_ZOOM,
  setZoom: async z => {
    S.zoom = Math.max(1, Math.min(MAX_ZOOM, Number(z) || 1));
    await applyHardwareZoom();
    return S.zoom;
  },
  /* Tap the moon, or the sun, and the whole overlay swings into place in one gesture. */
  alignTo: (trueAz, screenX, screenY, W, H) => {
    const p = projector(W, H);
    const at = p.unproject(screenX, screenY);
    S.nudge = norm(S.nudge + (trueAz - at.az));
    save();
    return S.nudge;
  },
};
})();
