/* Noctography phone check: ten seconds of measurement that turns "it's laggy on my phone" into
   something that can be diagnosed in one go. Reads the phone, the browser, the graphics, the
   drawing rate, the motion sensors, the camera and its zoom, and the app's own storage. Nothing
   leaves the phone unless the user copies or emails the report. */
"use strict";
(function(){
if (window.NoctoPhoneCheck) return;
const wait = ms => new Promise(r => setTimeout(r, ms));

function isIOS(){
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
function browserOf(ua){
  let m;
  if (isIOS()) {
    if ((m = ua.match(/CriOS\/([\d.]+)/))) return 'Chrome ' + m[1].split('.')[0] + ' (iOS, Safari engine)';
    if ((m = ua.match(/FxiOS\/([\d.]+)/))) return 'Firefox ' + m[1].split('.')[0] + ' (iOS, Safari engine)';
    if ((m = ua.match(/EdgiOS\/([\d.]+)/))) return 'Edge ' + m[1].split('.')[0] + ' (iOS, Safari engine)';
    m = ua.match(/Version\/([\d.]+)/); return 'Safari' + (m ? ' ' + m[1] : '');
  }
  if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) return 'Samsung Internet ' + m[1].split('.')[0];
  if ((m = ua.match(/Firefox\/([\d.]+)/))) return 'Firefox ' + m[1].split('.')[0];
  if ((m = ua.match(/EdgA?\/([\d.]+)/))) return 'Edge ' + m[1].split('.')[0];
  if ((m = ua.match(/OPR\/([\d.]+)/))) return 'Opera ' + m[1].split('.')[0];
  if ((m = ua.match(/Chrome\/([\d.]+)/))) return 'Chrome ' + m[1].split('.')[0];
  if ((m = ua.match(/Version\/([\d.]+).*Safari/))) return 'Safari ' + m[1];
  return 'Unknown browser';
}
async function device(){
  const ua = navigator.userAgent || '';
  let os = 'Unknown', model = '', m;
  if (isIOS()) { m = ua.match(/OS (\d+)[_.](\d+)/); os = (/iPad|Macintosh/.test(ua) ? 'iPadOS ' : 'iOS ') + (m ? m[1] + '.' + m[2] : ''); model = /iPad|Macintosh/.test(ua) ? 'iPad' : 'iPhone'; }
  else if ((m = ua.match(/Android ([\d.]+)/))) os = 'Android ' + m[1];
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  /* Chrome cut the model out of its user agent; it is still offered through client hints */
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const h = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion']);
      if (h.model) model = h.model;
      if (/Android/.test(os) && h.platformVersion) os = 'Android ' + h.platformVersion.split('.')[0];
    }
  } catch (e) {}
  if (!model && (m = ua.match(/Android [\d.]+; ([^;)]+)\)/)) && m[1] !== 'K') model = m[1].trim();
  return {
    model, os, browser: browserOf(ua),
    screen: Math.round(screen.width) + '×' + Math.round(screen.height) + ' at ' + (window.devicePixelRatio || 1).toFixed(1) + 'x',
    view: innerWidth + '×' + innerHeight,
    mem: navigator.deviceMemory || 0, cores: navigator.hardwareConcurrency || 0,
    installed: (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true,
    touch: navigator.maxTouchPoints || 0,
  };
}
function graphics(){
  const cv = document.createElement('canvas');
  let gl2 = null, g = null;
  try { gl2 = cv.getContext('webgl2'); } catch (e) {}
  g = gl2;
  if (!g) { try { g = cv.getContext('webgl'); } catch (e) {} }
  const o = { webgl2: !!gl2, webgl: !!g, renderer: '', maxTex: 0, software: false };
  if (g) {
    try { const x = g.getExtension('WEBGL_debug_renderer_info'); o.renderer = String(x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); } catch (e) {}
    try { o.maxTex = g.getParameter(g.MAX_TEXTURE_SIZE); } catch (e) {}
    o.software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(o.renderer);
    if (gl2 && !o.software) {
      try {
        const c2 = document.createElement('canvas'), g2 = c2.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
        if (!g2) o.software = true; else { const l = g2.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
      } catch (e) {}
    }
    try { const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {}
  }
  return o;
}
function frames(ms){
  return new Promise(res => {
    const t = [], s = performance.now();
    const f = now => {
      t.push(now);
      if (now - s < ms) return requestAnimationFrame(f);
      const d = [];
      for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
      d.sort((a, b) => a - b);
      const med = d[Math.floor(d.length / 2)] || 0;
      /* a hidden page (a permission prompt on top, a locked screen) barely draws, which says nothing
         about the phone: too few frames and the figure is left out rather than reported as slow */
      res({ fps: med ? Math.round(1000 / med) : 0, stalls: d.filter(x => x > 50).length, n: d.length, hidden: document.visibilityState !== 'visible' });
    };
    requestAnimationFrame(f);
  });
}
async function motion(permP, secs){
  if (typeof DeviceOrientationEvent === 'undefined') return { api: false };
  let perm = 'not asked';
  if (permP) { perm = await permP; if (perm !== 'granted') return { api: true, perm }; }
  const c = { api: true, perm, abs: 0, rel: 0, relAbs: 0, noAlpha: 0, compass: 0, acc: null, secs };
  const on = e => {
    if (e.type === 'deviceorientationabsolute') c.abs++;
    else { c.rel++; if (e.absolute === true) c.relAbs++; }
    if (e.alpha == null) c.noAlpha++;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
      c.compass++;
      if (typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy >= 0) c.acc = e.webkitCompassAccuracy;
    }
  };
  addEventListener('deviceorientationabsolute', on, true);
  addEventListener('deviceorientation', on, true);
  await wait(secs * 1000);
  removeEventListener('deviceorientationabsolute', on, true);
  removeEventListener('deviceorientation', on, true);
  return c;
}
async function camera(){
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia) return { api: false };
  let st = null;
  try { st = await md.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false }); }
  catch (e) { return { api: true, err: (e && e.name) || String(e) }; }
  const tr = st.getVideoTracks()[0], o = { api: true, label: (tr && tr.label) || '' };
  try { const s = tr.getSettings(); o.w = s.width; o.h = s.height; o.fps = s.frameRate ? Math.round(s.frameRate) : null; }
  catch (e) {}
  let caps = null;
  try { caps = tr.getCapabilities ? tr.getCapabilities() : null; } catch (e) {}
  if (caps && caps.zoom) {
    o.zmin = caps.zoom.min; o.zmax = caps.zoom.max;
    o.zwant = Math.min(2, caps.zoom.max || 1);
    try { await tr.applyConstraints({ advanced: [{ zoom: o.zwant }] }); } catch (e) { o.zerr = (e && e.name) || 'error'; }
    await wait(400);
    try { o.zgot = tr.getSettings().zoom; } catch (e) {}
  }
  try {
    const v = (await md.enumerateDevices()).filter(d => d.kind === 'videoinput');
    o.cams = v.length;
    o.back = v.filter(d => !/front|face|user|selfie/i.test(d.label || '')).length;
  } catch (e) {}
  /* which lenses Live will actually use, as the app sorts them */
  try { if (window.NoctoAR && window.NoctoAR.listCameras) { const cs = await window.NoctoAR.listCameras(); o.lenses = cs.map(c => (window.NoctoAR.LENS_LABEL || {})[c.kind] || c.kind); } } catch (e) {}
  st.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
  return o;
}
async function app(){
  const o = { sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), online: navigator.onLine };
  const c = navigator.connection;
  if (c) { o.net = c.effectiveType || ''; o.down = c.downlink; o.save = !!c.saveData; }
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); o.used = e.usage; o.quota = e.quota; } } catch (e) {}
  try { if (navigator.storage && navigator.storage.persisted) o.persist = await navigator.storage.persisted(); } catch (e) {}
  try { const p = await navigator.permissions.query({ name: 'geolocation' }); o.geo = p.state; } catch (e) {}
  try { if (navigator.getBattery) { const b = await navigator.getBattery(); o.batt = Math.round(b.level * 100); o.charging = b.charging; } } catch (e) {}
  return o;
}

const MB = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : Math.round(b / 1e6) + ' MB';

function rows(R){
  const out = [], add = (k, v, s, note) => out.push({ k, v, s: s || 'info', note: note || '' });
  const d = R.device, g = R.gfx, f = R.fps, m = R.motion, c = R.cam, a = R.app;
  add('Phone', [d.model, d.os].filter(Boolean).join(', '));
  add('Browser', d.browser + (d.installed ? ', installed' : ', in the browser'));
  add('Screen', d.screen + ', window ' + d.view);
  if (d.mem || d.cores) add('Memory', [d.mem ? d.mem + ' GB' + (d.mem === 8 ? ' or more' : '') : '', d.cores ? d.cores + ' cores' : ''].filter(Boolean).join(', '),
    d.mem && d.mem <= 2 ? 'warn' : 'info', d.mem && d.mem <= 2 ? 'Low memory: Scout keeps its ground detail light here.' : '');
  if (!g.webgl) add('Graphics', 'No WebGL', 'bad', 'Scout and Sky AR cannot draw the ground in this browser. Try Chrome or Safari.');
  else if (g.software) add('Graphics', 'Drawn on the processor', 'bad', 'Graphics acceleration is off, so everything will crawl. In Chrome or Edge: Settings, System, turn on graphics acceleration, then restart the browser.');
  else if (!g.webgl2) add('Graphics', 'WebGL 1 only', 'warn', 'Scout falls back to its simpler ground.');
  else {
    /* Chrome wraps the chip name as ANGLE (vendor, chip (ids), backend): the chip is what matters */
    const am = (g.renderer || '').match(/^ANGLE \([^,]+, ([^,]+?)(?: \(0x[0-9a-f]+\))?(?: Direct3D[^,]*)?,/i);
    const chip = (am ? am[1] : g.renderer || 'WebGL 2').replace(/\s+/g, ' ').trim().slice(0, 48);
    add('Graphics', chip + ', ' + g.maxTex + ' px', 'good');
  }
  if (f.n < 20 || f.hidden) add('Drawing', 'Not measured', 'info', 'The app was hidden or covered while it ran. Run it again with the app on screen.');
  else if (f.fps >= 50) add('Drawing', f.fps + ' frames a second' + (f.stalls ? ', ' + f.stalls + ' stalls' : ''), f.stalls > 6 ? 'warn' : 'good',
    f.stalls > 6 ? 'Smooth on average but stuttering: other apps or tabs may be busy.' : '');
  else if (f.fps >= 25) add('Drawing', f.fps + ' frames a second', 'warn', 'About half speed. Battery saver or Low Power Mode is the usual reason, and Sky AR will feel sluggish with it on.');
  else add('Drawing', (f.fps || 0) + ' frames a second', 'bad', 'Very slow drawing. Close other tabs and apps, check battery saver, and try another browser.');
  if (!m.api) add('Motion sensors', 'None', 'bad', 'Sky AR Live cannot follow the phone. Scout works with a finger instead.');
  else if (m.perm && m.perm !== 'granted' && m.perm !== 'not asked') add('Motion sensors', 'Refused', 'bad', 'Allow Motion and Orientation Access for this site, then run this again. On an iPhone you may need to close and reopen the app.');
  else if (!(m.abs + m.rel)) add('Motion sensors', 'Nothing arrived', d.touch ? 'bad' : 'info', d.touch ? 'No readings in ' + m.secs + ' seconds: the sensors are missing or blocked in this browser.' : 'Normal on a computer.');
  else {
    const hz = n => Math.round(n / m.secs);
    add('Motion sensors', [m.abs ? hz(m.abs) + '/s from north' : '', m.rel ? hz(m.rel) + '/s gyro' : ''].filter(Boolean).join(', '), 'good');
    if (m.noAlpha >= m.abs + m.rel) add('Compass', 'No heading', 'bad', 'The phone reports tilt but not which way it faces, so Live cannot turn with you. Use Scout.');
    else if (m.compass) add('Compass', 'From the compass' + (m.acc != null ? ', ±' + Math.round(m.acc) + '°' : ''), m.acc != null && m.acc > 25 ? 'warn' : 'good',
      m.acc != null && m.acc >= 90 ? 'The compass has not settled, which is normal indoors or after the device has been still. Outside, turn it through a slow figure of eight once, or line Live up on the moon or a bright star.'
      : m.acc != null && m.acc > 25 ? 'The compass is unsettled. Move away from cars and metal, or line Live up on the moon or a bright star.' : '');
    else if (m.abs || m.relAbs) add('Compass', 'North from the sensors', 'good');
    else add('Compass', 'Gyro only, no north', 'warn', 'In Sky AR Live, tap the moon, the sun or a bright star to line the sky up.');
  }
  if (!c.api) add('Camera', 'Not available', 'bad', 'Live needs a camera. Scout works without one.');
  else if (c.err) {
    const why = { NotAllowedError: ['Refused', 'Allow the camera for this site to use Live.'], NotReadableError: ['In use elsewhere', 'Another app has the camera. Close it and try again.'],
      NotFoundError: ['None found', 'Live needs a camera. Scout works without one.'], OverconstrainedError: ['Would not open', ''] }[c.err] || [c.err, ''];
    add('Camera', why[0], c.err === 'NotReadableError' ? 'warn' : 'bad', why[1]);
  } else {
    add('Camera', (c.w && c.h ? c.w + '×' + c.h : 'Open') + (c.fps ? ' at ' + c.fps + '/s' : '') + (c.back ? ', ' + c.back + ' rear' : ''), 'good');
    if (c.lenses && c.lenses.length) add('Lenses used', c.lenses.join(', '), c.back > 1 && c.lenses.length < 2 ? 'warn' : 'info',
      c.back > 1 && c.lenses.length < 2 ? 'The phone has more than one rear camera but Live can only tell one apart, so it cannot zoom out past the main lens.' : '');
    if (c.zmax == null) add('Zoom', 'Not offered', 'info', 'The app enlarges the picture itself, a little softer.');
    else if (c.zgot != null && Math.abs(c.zgot - c.zwant) < 0.05) add('Zoom', c.zmin + '–' + c.zmax + 'x, works', 'good');
    else add('Zoom', c.zmin + '–' + c.zmax + 'x offered, stayed at ' + (c.zgot != null ? c.zgot + 'x' : '–'), 'warn', 'The camera ignores zoom here, so the app enlarges the picture itself.');
  }
  if (a.geo) add('Location', { granted: 'Allowed', prompt: 'Not asked yet', denied: 'Blocked' }[a.geo] || a.geo, a.geo === 'denied' ? 'warn' : 'info',
    a.geo === 'denied' ? 'Allow location for this site, or set the place by hand in Place.' : '');
  add('Offline', a.sw ? 'Ready' : 'Not yet', a.sw ? 'good' : 'warn', a.sw ? '' : 'Open the app once more with a signal and it will keep a copy for the field.');
  if (a.quota) add('Storage', MB(a.used || 0) + ' of ' + MB(a.quota) + (a.persist ? ', kept' : ''));
  if (a.net || !a.online) add('Network', !a.online ? 'Offline' : a.net + (a.down ? ', ' + a.down + ' Mb/s' : '') + (a.save ? ', data saver on' : ''), a.save ? 'warn' : 'info',
    a.save ? 'Data saver can hold back maps and ground detail.' : '');
  if (a.batt != null) add('Battery', a.batt + '%' + (a.charging ? ', charging' : ''), !a.charging && a.batt < 20 ? 'warn' : 'info',
    !a.charging && a.batt < 20 ? 'Many phones slow themselves down below 20%.' : '');
  /* Scout's detail level and whether a crash lowered it: the first thing to know about a freeze */
  try {
    const s = JSON.parse(localStorage.getItem('nocto.scoutHD') || '{}') || {}, nm = { full: 'Full', reduced: 'Reduced', basic: 'Basic', light: 'Light', off: 'Simple ground' };
    const cr = s.crashed, ago = cr && cr.at ? Math.round((Date.now() - cr.at) / 3600000) : null;
    if (s.pick || s.cap) add('Scout detail', (s.pick && s.pick !== 'auto' ? nm[s.pick] || s.pick : 'Auto')
      + (s.cap ? ', held at ' + (nm[s.cap] || s.cap) + (cr ? ' after ' + (cr.src === 'lost' ? 'losing the graphics memory' : 'closing') + (ago != null ? ' ' + (ago < 1 ? 'within the hour' : ago + ' h ago') : '') : '') : ''),
      s.cap ? 'warn' : 'info');
  } catch (e) {}
  return out;
}

function report(list, version, when){
  const pad = s => (s + ':').padEnd(16, ' ');
  const lines = ['Noctography phone check', 'Version ' + version + ', ' + when, ''];
  list.forEach(r => {
    lines.push(pad(r.k) + r.v + (r.s === 'bad' ? '  [problem]' : r.s === 'warn' ? '  [check]' : ''));
    if (r.note) lines.push('                ' + r.note);
  });
  return lines.join('\n');
}

/* Must be called straight from a tap: iOS only shows the motion prompt inside the gesture, so it
   is asked for before anything is awaited. */
function run(opts){
  const o = opts || {}, step = s => { try { if (o.onStep) o.onStep(s); } catch (e) {} };
  let permP = null;
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try { permP = DeviceOrientationEvent.requestPermission().catch(() => 'error'); } catch (e) { permP = Promise.resolve('error'); }
  }
  return (async () => {
    step('Reading the phone and browser');
    const dev = await device();
    const gfx = graphics();
    step('Hold the phone up and turn it slowly');
    const [mot, fps] = await Promise.all([motion(permP, 3), frames(3000)]);
    step('Trying the camera');
    const cam = o.camera === false ? { api: true, err: 'skipped' } : await camera();
    step('Checking storage and network');
    const ap = await app();
    const R = { device: dev, gfx, fps, motion: mot, cam, app: ap };
    const list = rows(R);
    const d = new Date();
    const when = d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      + ' (' + ((Intl.DateTimeFormat().resolvedOptions().timeZone) || '') + ')';
    const text = report(list, o.version || '', when);
    const problems = list.filter(r => r.s === 'bad').length, checks = list.filter(r => r.s === 'warn').length;
    return { rows: list, text, model: dev.model || dev.os, problems, checks, raw: R };
  })();
}

window.NoctoPhoneCheck = { run };
})();
