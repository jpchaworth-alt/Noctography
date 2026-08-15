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

const S = {
  motion: false, camera: false, stream: null, video: null,
  alpha: 0, beta: 70, gamma: 0, absolute: false, compass: null,
  screenAngle: 0, nudge: 0, hfov: 62, haveEvent: false, listening: false,
  smooth: null,
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (typeof saved.nudge === 'number') S.nudge = saved.nudge;
  if (typeof saved.hfov === 'number') S.hfov = saved.hfov;
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ nudge: S.nudge, hfov: S.hfov })); } catch (e) {} };

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
  // the rendering surface rotates with the screen, the device frame does not
  const t = S.screenAngle * D2R, ct = Math.cos(t), st = Math.sin(t);
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
  const hf = ((opts && opts.hfov) || S.hfov) * D2R;
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
async function startCamera(video){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
    S.stream = stream; S.camera = true; S.video = video;
    if (video) { video.srcObject = stream; const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    return true;
  } catch (e) { S.camera = false; return false; }
}
function stopCamera(){
  if (S.stream) { S.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); S.stream = null; }
  if (S.video) { try { S.video.srcObject = null; } catch (e) {} S.video = null; }
  S.camera = false;
}
function stop(){ stopCamera(); unlisten(); S.motion = false; S.haveEvent = false; S.smooth = null; }

window.NoctoAR = {
  state: S,
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
  hfov: () => S.hfov,
  setHfov: v => { S.hfov = Math.max(30, Math.min(110, v)); save(); },
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
