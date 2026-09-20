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
/* Horizontal fields for the three kinds of camera a phone fits, and these are not the numbers
   off a spec sheet. A 35mm-equivalent focal length is quoted on the diagonal, the stream is a
   16:9 crop of a 4:3 sensor, and iOS takes another five to ten per cent off the edges for video
   stabilisation. Worked through for the common moderns: a 13mm ultra wide sees about 106 degrees
   across, a 24mm main about 71, a 5x 120mm telephoto about 16.

   The old telephoto figure here was 26, which is a 3x 77mm lens. On a 5x phone that made the
   overlay's angular scale wrong by more than half, so everything away from the centre of the
   frame was drawn in the wrong place and the error grew towards the edges. That is most of why
   the long end never lined up. These remain starting points: what the slider saves per lens
   always wins, because no published figure survives the stabilisation crop anyway. */
const LENS_NOMINAL = { ultrawide: 106, wide: 71, tele: 18 };
const LENS_WAS = { ultrawide: 104, wide: 62, tele: 26 };   // what earlier builds defaulted to
const LENS_LABEL = { ultrawide: 'ultra wide', wide: 'wide', tele: 'telephoto' };
const CAL_V = 2;
const ALIGN_TTL = 6 * 3600 * 1000;   // an alignment is worth reloading for a night, not a week

const S = {
  motion: false, camera: false, stream: null, video: null,
  alpha: 0, beta: 70, gamma: 0, absolute: false, compass: null, compassRaw: null,
  screenAngle: 0, flip: false, nudge: 0, offCache: 0, haveEvent: false, listening: false,
  smooth: null,
  /* how fast the phone is turning, and how long it has been still: the offset is only allowed
     to move while nothing else is */
  last: null, rate: 0, stillSince: 0, stillNow: 0, offAt: 0,
  /* an alignment on the sun or the moon is a measurement, and it outranks the magnetometer for
     as long as it stands */
  aligned: false, alignedAt: 0,
  /* the fitted lens, the digital zoom on top of it, and how much of that zoom the hardware
     agreed to do for us (the rest is done in CSS, which is all iOS Safari allows) */
  lens: 'wide', cameras: [], deviceId: null, zoom: 1, hwZoom: 1,
  trackLabel: '', trackAuto: false,
  hfovByLens: Object.assign({}, LENS_NOMINAL),
  calibrated: {},
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (typeof saved.nudge === 'number') S.nudge = saved.nudge;
  if (saved.calibrated && typeof saved.calibrated === 'object')
    S.calibrated = Object.assign({}, saved.calibrated);
  /* Corrected defaults have to reach phones that already have a saved file, without throwing
     away a figure the user actually measured. A value that still sits exactly on an old default
     was never touched and is replaced; anything else is a measurement and is kept. */
  const keep = (k, v) => typeof v === 'number' && (saved.calV === CAL_V || S.calibrated[k]
    || Math.abs(v - (LENS_WAS[k] == null ? -999 : LENS_WAS[k])) > 0.5);
  if (saved.hfovByLens && typeof saved.hfovByLens === 'object') {
    Object.keys(saved.hfovByLens).forEach(k => {
      if (LENS_NOMINAL[k] && keep(k, saved.hfovByLens[k])) S.hfovByLens[k] = saved.hfovByLens[k];
    });
  }
  // one calibration figure was saved before there was more than one lens: it was the wide
  else if (keep('wide', saved.hfov)) S.hfovByLens.wide = saved.hfov;
  if (saved.align && saved.align.at && Date.now() - saved.align.at < ALIGN_TTL) {
    S.aligned = true; S.alignedAt = saved.align.at;
    S.offCache = Number(saved.align.off) || 0;
  }
} catch (e) {}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      calV: CAL_V, nudge: S.nudge, hfovByLens: S.hfovByLens, calibrated: S.calibrated,
      align: S.aligned ? { at: S.alignedAt, off: S.offCache } : null,
    }));
  } catch (e) {}
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
/* One constant cannot serve both ends of the lens range. What settles a 71-degree view leaves a
   16-degree one swimming, and the lag it buys is invisible wide and unusable tight. So the
   constant follows two things: how fast the phone is actually turning, because lag only matters
   while you move and jitter only shows when you stop, and how much sky is on the screen, because
   the same tenth of a degree is a pixel at one end of the zoom and a finger's width at the
   other. */
function filterK(){
  const f = Math.max(6, effHfov());
  const still = Math.max(0.045, Math.min(0.2, 0.1 * (f / 62)));
  const t = Math.max(0, Math.min(1, (S.rate - 3) / 25));
  return still + (0.55 - still) * t;
}
const STILL_RATE = 6;      // degrees a second, below which the phone counts as held
const STILL_FOR = 400;     // and for this long before the compass is believed again
function onOrient(e){
  if (e.alpha == null && e.beta == null && e.gamma == null) return;
  S.haveEvent = true;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const a = e.alpha == null ? S.alpha : e.alpha;
  const b = e.beta == null ? S.beta : e.beta;
  const g = e.gamma == null ? S.gamma : e.gamma;
  /* How fast the aim is moving, in degrees a second, as the angle between where the phone
     pointed last event and where it points now. Deliberately not the difference of the Euler
     angles: the W3C set gimbal-locks at beta = 90, which is the phone held upright looking at
     the horizon, and there alpha and gamma swing against each other by tens of degrees a second
     while the phone sits dead still on a tripod. Reading that as motion would hold the compass
     off for ever and drive the filter to its loosest setting in exactly the pose the app is used
     in. The aim vector has no such pole. Roll about the lens axis reads as still, which is
     right: it does not change where you are looking. */
  const Rraw = mul(mul(rotZ(a * D2R), rotX(b * D2R)), rotY(g * D2R));
  const f = apply(Rraw, [0, 0, -1]);
  if (S.last) {
    const dt = Math.max(0.008, Math.min(0.5, (now - S.last.t) / 1000));
    const c = Math.max(-1, Math.min(1, f[0] * S.last.f[0] + f[1] * S.last.f[1] + f[2] * S.last.f[2]));
    S.rate += (Math.acos(c) * R2D / dt - S.rate) * 0.3;
  }
  S.last = { f: f, t: now };
  if (S.rate > STILL_RATE) S.stillSince = 0;
  else if (!S.stillSince) S.stillSince = now;
  S.stillNow = now;
  const k = filterK();
  if (!S.smooth) S.smooth = { a, b, g };
  else {
    S.smooth.a = lerpAng(S.smooth.a, a, k);
    S.smooth.b = lerpAng(S.smooth.b, b, k);
    S.smooth.g = lerpAng(S.smooth.g, g, k);
  }
  S.alpha = S.smooth.a; S.beta = S.smooth.b; S.gamma = S.smooth.g;
  if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
    S.compassRaw = e.webkitCompassHeading;
    /* Filtered with the same constant as the angles. It used to be taken raw and compared
       against the smoothed aim, so every pan wrote the filter's own lag straight into the
       offset, and whatever the last frame before you stopped happened to compute was what
       stuck. That alone is worth tens of degrees after a quick swing round. */
    S.compass = S.compass == null ? S.compassRaw : lerpAng(S.compass, S.compassRaw, k);
    S.absolute = true;
  } else if (e.absolute === true) S.absolute = true;
}
function heldStill(){
  return !!(S.stillSince && (S.stillNow - S.stillSince) > STILL_FOR);
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
   or a car, and the error is direction-dependent, so checking it against the sun facing south
   says nothing about how wrong it is facing east. Where iOS gives a true heading we take it as
   the opening guess; a line-up on the sun or the moon replaces it outright. */
function headingOffset(fwd, screenDeg){
  /* Once an alignment has been taken, that is the answer, and the magnetometer is never asked
     again. This used to be recomputed on nearly every frame with the alignment added on top as
     a nudge: a correction sitting on a base that moved. Line up on the sun in the south, turn
     to the north-east, and the compass error over there quietly replaced the one just measured,
     so the sky came out tens of degrees off on ground the user knows by heart. */
  if (S.aligned) return S.offCache;
  if (S.compass == null) return 0;
  /* Two corrections, and both are needed. The compass is compared against the azimuth this
     matrix gives for the aim, not against alpha on its own, because 360 - alpha only equals that
     azimuth while the phone is upright in portrait. And the reading itself is the heading of the
     phone's physical TOP EDGE, which is not where you are aiming unless the phone is upright:
     turned sideways the top edge lies along the horizon a quarter turn from the aim, which is
     exactly the screen angle, so that angle is added back. Portrait is the case where both
     corrections are zero, which is why it was right all along. Only refreshed while the aim has
     a well-defined azimuth at all; nearer than about 20 degrees to straight up the last good
     value stands. And only while the phone is being held still, because compass and gyro settle
     at different rates and mid-pan the two disagree by whatever the difference happens to be.
     The very first reading is taken whatever the phone is doing, so there is something to draw
     with before the user stops moving. */
  const level = Math.hypot(fwd[0], fwd[1]);
  if (level > 0.35 && (heldStill() || !S.offAt)) {
    const aim = norm(Math.atan2(fwd[0], fwd[1]) * R2D);
    S.offCache = norm(S.compass + screenDeg - aim);
    S.offAt = S.stillNow || 1;
  }
  return S.offCache || 0;
}

/* How far to rotate the basis back for the screen's own rotation. The platform's reported angle
   is the starting guess, but its sign convention is not something to bet the overlay on: get it
   wrong and both landscapes come out 180 degrees round, with the ground wash above the horizon
   and the compass labels swapped end for end, while portrait looks perfect because 0 and 180
   negate to themselves. So the guess is checked against gravity, which cannot be misread: the
   screen's own up direction has to point up in the world, or the user is reading the display
   upside down. Near flat, screen up and down are the same thing and the test means nothing, so
   the last good decision is held instead. */
function screenTurn(){
  const t = -S.screenAngle * D2R;
  const b = S.beta * D2R, g = S.gamma * D2R;
  const cb = Math.cos(b), sb = Math.sin(b), sg = Math.sin(g);
  const upZ = a => cb * sg * Math.sin(a) + sb * Math.cos(a);
  if (Math.hypot(cb * sg, sb) > 0.42) S.flip = upZ(t) < 0;   // 0.42 is about 25 degrees off flat
  return S.flip ? t + Math.PI : t;
}

function basis(){
  const R = mul(mul(rotZ(S.alpha * D2R), rotX(S.beta * D2R)), rotY(S.gamma * D2R));
  const t = screenTurn(), ct = Math.cos(t), st = Math.sin(t);
  const right = apply(R, [ct, st, 0]);
  const up = apply(R, [-st, ct, 0]);
  const fwd = apply(R, [0, 0, -1]);
  /* The turn actually applied, which the gravity check may have taken 180 from what the platform
     reported. The compass correction has to use the same figure or the two disagree. */
  const off = headingOffset(fwd, norm(-t * R2D)) + S.nudge;
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
  if (/ultra|0\.5/.test(l)) return 'ultrawide';
  if (/tele|telephoto/.test(l)) return 'tele';
  return 'wide';
}
/* iOS also lists a virtual camera that switches physical lens by itself, on light level and
   focus distance, and tells the page nothing when it does. Fine for snapshots and ruinous here:
   the field of view the overlay is projecting through changes underneath it with no event to
   catch. Where a real single-lens device is listed, that is the one to open.

   Only the combining devices are virtual. Plain "Back Camera" is iOS's name for the fixed main
   lens and must not be caught here: flagging it sent the no-deviceId path past every wide entry
   and opened the ultra wide instead, which is a 106-degree view where a 71-degree one was
   wanted. */
function isAuto(label){ return /dual|triple|virtual/i.test(label || ''); }
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
    const auto = isAuto(d.label);
    const prev = seen[kind];
    // one representative per kind, and a fixed lens beats a self-switching one
    if (prev && !(prev.auto && !auto)) return;
    const entry = { id: d.deviceId, label: d.label || LENS_LABEL[kind], kind, auto };
    if (prev) out[out.indexOf(prev)] = entry; else out.push(entry);
    seen[kind] = entry;
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
  let o = opts || {};
  let want;
  if (o.deviceId) {
    want = { deviceId: { exact: o.deviceId }, width: { ideal: 1920 } };
  } else {
    /* A named single-lens device in preference to facingMode, which on iOS hands back the
       self-switching virtual camera and with it a field of view that quietly changes. Labels
       only exist once a grant has happened, so the first run still goes through facingMode and
       every run after it does better. */
    /* The wanted kind, then the main lens, then anything fixed. Never just "the first fixed
       one": the list is sorted widest first, so that lands on the ultra wide. */
    const pick = S.cameras.filter(c => c.kind === (o.lens || S.lens) && !c.auto)[0]
      || S.cameras.filter(c => c.kind === 'wide' && !c.auto)[0]
      || S.cameras.filter(c => !c.auto)[0];
    if (pick) {
      o = Object.assign({}, o, { deviceId: pick.id, lens: pick.kind });
      want = { deviceId: { exact: pick.id }, width: { ideal: 1920 } };
    } else {
      want = { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } };
    }
  }
  if (o._retry) want = { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } };
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
    /* What actually opened, which is not always what was asked for. Worth recording: if this is
       a virtual device the assumed field cannot be trusted, and the diagnostics should say so
       rather than leaving a wrong overlay to be blamed on the compass. */
    const tr = stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
    S.trackLabel = (tr && tr.label) || '';
    S.trackAuto = isAuto(S.trackLabel);
    if (S.trackLabel && !o.lens) S.lens = classify(S.trackLabel);
    const v = S.video;
    if (v) { v.srcObject = stream; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    await listCameras();
    await applyHardwareZoom();
    return true;
  } catch (e) {
    // a named camera can be refused where the generic rear one is not: fall back rather than fail
    if (o.deviceId && !o._retry) return startCamera(video, { _retry: true, lens: o.lens });
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

/* Stop asking the magnetometer. Called by every deliberate act of alignment. */
function hold(){
  if (!S.aligned) { S.aligned = true; S.alignedAt = Date.now(); }
}

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
  /* Turning the offset by hand is an alignment too: the user is putting a known star where it
     belongs, and having done it they should not have the compass move it back. Both of these
     therefore freeze the base, and clearAlign is the only way back to following the compass. */
  setNudge: d => { S.nudge = norm(d); hold(); save(); },
  addNudge: d => { S.nudge = norm(S.nudge + d); hold(); save(); },
  clearAlign: () => { S.aligned = false; S.alignedAt = 0; S.offAt = 0; save(); },
  aligned: () => S.aligned,
  alignedAt: () => S.alignedAt,
  /* Everything the AR view needs to say out loud when the overlay and the sky disagree, so the
     next trip out comes back with evidence rather than a hunch. */
  diag: () => ({
    absolute: S.absolute,
    compass: S.compass, compassRaw: S.compassRaw,
    base: S.offCache, nudge: S.nudge, offset: norm(S.offCache + S.nudge),
    offAge: S.offAt ? Math.max(0, Math.round(((S.stillNow || 0) - S.offAt) / 1000)) : null,
    aligned: S.aligned, alignedAt: S.alignedAt,
    rate: Math.round(S.rate), still: heldStill(),
    lens: S.lens, label: S.trackLabel, auto: S.trackAuto, cameras: S.cameras.length,
    baseHfov: baseHfov(), effHfov: effHfov(), nominal: LENS_NOMINAL[S.lens] || 62,
    calibrated: !!S.calibrated[S.lens], zoom: S.zoom, hwZoom: S.hwZoom,
  }),
  /* hfov reads and writes the ACTIVE lens's calibration; effHfov is what the overlay uses */
  hfov: baseHfov,
  effHfov,
  setHfov: v => {
    S.hfovByLens[S.lens] = Math.max(5, Math.min(140, v));
    S.calibrated[S.lens] = true;
    save();
  },
  calibrated: () => !!S.calibrated[S.lens],
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
  /* Tap the moon, or the sun, and the whole overlay swings into place in one gesture. The
     compass base is frozen where it stands at the same moment, so the aim measured here is the
     aim from here on rather than a correction riding on a reading that keeps moving. */
  alignTo: (trueAz, screenX, screenY, W, H) => {
    const p = projector(W, H);
    const at = p.unproject(screenX, screenY);
    S.nudge = norm(S.nudge + (trueAz - at.az));
    hold();
    save();
    return S.nudge;
  },
};
})();
