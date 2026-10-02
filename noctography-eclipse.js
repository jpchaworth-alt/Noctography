/* Noctography: eclipses. Everything is worked out on the device from the data file, so it works
   offline and needs nothing of ours.
   Solar: the standard Besselian method. The Moon's shadow is followed on the fundamental plane (through
   the Earth's centre, square to the shadow axis) and each point of it is carried along the axis to
   the ground. Local circumstances, the central line, the limits of totality or annularity and the
   partial bands all come from the same few lines, so they can never disagree.
   Lunar: the Moon's track across the shadow is a straight line to well under an arcminute over an
   eclipse, so a place only needs to know when each contact happens and whether the Moon is up.
   Eclipse Predictions by Fred Espenak, NASA's GSFC. */
(function () {
  const R = Math.PI / 180, B = 0.99664719, E2 = 1 - B * B, MIN = 60000, H = 3600000;
  const TYPES = { T: 'Total', A: 'Annular', H: 'Hybrid', P: 'Partial', N: 'Penumbral' };
  let DATA = null, LIST = null;

  function data() {
    if (DATA) return DATA;
    const d = window.NoctoEclipseData; if (!d) return null;
    DATA = {
      solar: d.solar.map((r, i) => {
        const [y, m, dd, type, t0, dT, x, yy, dc, mu, l1, l2, tf1, tf2, mag, gamma, glat, glon, gdur, gwidth, gut] = r;
        const [hh, mi, ss] = gut.replace(/[^\d:]/g, '').split(':').map(Number);
        const t0ms = Date.UTC(y, m - 1, dd) + t0 * H;
        return { id: 's' + y + String(m).padStart(2, '0') + String(dd).padStart(2, '0'), kind: 'solar', type, typeName: TYPES[type],
          y, m, d: dd, t0, t0ms, dT, x, yy, dc, mu, l1, l2, tf1, tf2, mag, gamma, glat, glon, gdur, gwidth,
          /* the calendar date is in dynamical time, so an eclipse near midnight can peak on the day either side */
          peak: [-1, 0, 1].map(k => Date.UTC(y, m - 1, dd + k, hh, mi, ss)).reduce((a, b) => Math.abs(b - (t0ms - dT * 1000)) < Math.abs(a - (t0ms - dT * 1000)) ? b : a) };
      }),
      lunar: d.lunar.map(r => {
        const [peak, type, sdP, sdU, sdT, umag, pmag, x, y, vx, vy, ru, rp, sm, sub] = r;
        const dt = new Date(peak);
        return { id: 'l' + dt.getUTCFullYear() + String(dt.getUTCMonth() + 1).padStart(2, '0') + String(dt.getUTCDate()).padStart(2, '0'),
          kind: 'lunar', type, typeName: TYPES[type], peak, sdP, sdU, sdT, umag, pmag, mag: type === 'N' ? pmag : umag,
          x, y, vx, vy, ru, rp, sm, sub };
      }),
    };
    return DATA;
  }
  function list() {
    if (LIST) return LIST;
    const d = data(); if (!d) return [];
    return LIST = d.solar.concat(d.lunar).sort((a, b) => a.peak - b.peak);
  }
  const byId = id => list().find(e => e.id === id) || null;

  /* ---------------- solar ---------------- */
  const poly = (c, t) => c[0] + t * (c[1] + t * ((c[2] || 0) + t * (c[3] || 0)));
  const dpoly = (c, t) => c[1] + t * (2 * (c[2] || 0) + 3 * t * (c[3] || 0));
  /* the elements at t hours from t0; mu is turned from ephemeris time to the Earth's real turn */
  function el(e, t) {
    return { x: poly(e.x, t), y: poly(e.yy, t), d: poly(e.dc, t) * R, mu: (poly(e.mu, t) - 0.00417807 * e.dT) * R,
      l1: poly(e.l1, t), l2: poly(e.l2, t), dx: dpoly(e.x, t), dy: dpoly(e.yy, t) };
  }
  const tOf = (e, ms) => (ms - e.t0ms) / H + e.dT / 3600;         // UT ms to hours from t0 (TDT)
  const msOf = (e, t) => e.t0ms + (t - e.dT / 3600) * H;
  function observer(lat, lon, hM) {
    const f = lat * R, u = Math.atan(B * Math.tan(f)), h = (hM || 0) / 6378137;
    return { f, lam: lon * R, ps: B * Math.sin(u) + h * Math.sin(f), pc: Math.cos(u) + h * Math.cos(f) };
  }
  /* where the observer sits against the shadow at t */
  function at(e, o, t) {
    const b = el(e, t), Hh = b.mu + o.lam, sd = Math.sin(b.d), cd = Math.cos(b.d);
    const xi = o.pc * Math.sin(Hh), eta = o.ps * cd - o.pc * Math.cos(Hh) * sd, zeta = o.ps * sd + o.pc * Math.cos(Hh) * cd;
    const u = b.x - xi, v = b.y - eta, L1 = b.l1 - zeta * e.tf1, L2 = b.l2 - zeta * e.tf2, m = Math.hypot(u, v);
    return { u, v, m, L1, L2, zeta, H: Hh, d: b.d };
  }
  /* the Sun's height and bearing: the shadow axis points at it to a fraction of an arcminute */
  function sunAltAz(o, H0, d) {
    const sa = Math.sin(o.f) * Math.sin(d) + Math.cos(o.f) * Math.cos(d) * Math.cos(H0);
    const alt = Math.asin(Math.max(-1, Math.min(1, sa))) / R;
    const az = (Math.atan2(Math.sin(H0), Math.cos(H0) * Math.sin(o.f) - Math.tan(d) * Math.cos(o.f)) / R + 180 + 360) % 360;
    return { alt: alt + refr(alt), az };
  }
  const refr = a => a > -1.5 ? 1.02 / Math.tan((a + 10.3 / (a + 5.11)) * R) / 60 : 0;
  function overlap(rs, rm, m) {                                 // fraction of the Sun's disc covered
    if (m >= rs + rm) return 0;
    if (m <= Math.abs(rm - rs)) return rm >= rs ? 1 : (rm * rm) / (rs * rs);
    const a = Math.acos((m * m + rs * rs - rm * rm) / (2 * m * rs)), b = Math.acos((m * m + rm * rm - rs * rs) / (2 * m * rm));
    return (rs * rs * (a - Math.sin(2 * a) / 2) + rm * rm * (b - Math.sin(2 * b) / 2)) / (Math.PI * rs * rs);
  }
  function phaseAt(e, o, t) {
    const q = at(e, o, t), rs = (q.L1 + q.L2) / 2, rm = (q.L1 - q.L2) / 2;   // magnitude is (L1 - m) / 2rs
    return { ...q, mag: Math.max(0, (q.L1 - q.m) / (q.L1 + q.L2)), obsc: overlap(rs, rm, q.m), rs, rm };
  }
  const span = e => [-3.6, 3.6];
  function root(fn, a, b) { let fa = fn(a); for (let i = 0; i < 40; i++) { const c = (a + b) / 2, fc = fn(c); if ((fc < 0) === (fa < 0)) { a = c; fa = fc; } else b = c; } return (a + b) / 2; }
  function golden(fn, a, b, n) { for (let i = 0; i < (n || 60); i++) { const c = a + (b - a) * 0.382, d = a + (b - a) * 0.618; if (fn(c) < fn(d)) b = d; else a = c; } return (a + b) / 2; }

  /* Local circumstances: the four contacts, greatest eclipse, magnitude, how much of the Sun is
     covered, how long totality lasts, and where the Sun is at each. A contact with the Sun down is
     still given, marked, so sunrise and sunset eclipses read properly. */
  function solarLocal(e, lat, lon, hM) {
    const o = observer(lat, lon, hM), [a, b] = span(e), step = 2 / 60;
    let best = null;
    for (let t = a; t <= b; t += step) { const q = at(e, o, t); if (!best || q.m - q.L1 < best.v) best = { t, v: q.m - q.L1 }; }
    const tm = golden(t => at(e, o, t).m, best.t - step, best.t + step), qm = phaseAt(e, o, tm);
    if (qm.m >= qm.L1) return null;                               // not even partial here
    const f1 = t => { const q = at(e, o, t); return q.m - q.L1; }, f2 = t => { const q = at(e, o, t); return q.m - Math.abs(q.L2); };
    const c1 = root(f1, tm - 4, tm), c4 = root(f1, tm, tm + 4);
    let c2 = null, c3 = null, kind = 'partial';
    if (qm.m < Math.abs(qm.L2)) { c2 = root(f2, tm - 0.3, tm); c3 = root(f2, tm, tm + 0.3); kind = qm.L2 < 0 ? 'total' : 'annular'; }
    const pt = t => { if (t == null) return null; const q = at(e, o, t), s = sunAltAz(o, q.H, q.d); return { ms: msOf(e, t), alt: s.alt, az: s.az }; };
    const r = { e, kind, mag: qm.mag, obsc: qm.obsc, c1: pt(c1), c2: pt(c2), max: pt(tm), c3: pt(c3), c4: pt(c4),
      dur: c2 != null ? (c3 - c2) * 3600 : 0, ratio: qm.rm / qm.rs };
    r.visible = [r.c1, r.max, r.c4].some(p => p.alt > -0.5);
    r.maxUp = r.max.alt > -0.5;
    return r;
  }
  /* the Sun, the Moon and how far through the eclipse, at any moment, for drawing the sky */
  function solarAt(e, lat, lon, ms, hM) {
    const o = observer(lat, lon, hM), t = tOf(e, ms), q = phaseAt(e, o, t), s = sunAltAz(o, q.H, q.d);
    /* the Moon's centre from the Sun's centre, in solar radii, north up and east left as the sky
       shows it: u is east on the fundamental plane, v north; the position angle turns them onto the sky */
    const total = q.L2 < 0 && q.m < -q.L2, ring = q.L2 > 0 && q.m < q.L2;
    return { mag: q.mag, obsc: total ? 1 : q.obsc, east: q.u / q.rs, north: q.v / q.rs, moonR: q.rm / q.rs, alt: s.alt, az: s.az, zeta: q.zeta, total, ring,
      /* how far the Sun's light has gone, 0 to 1: a log scale, as the eye and the sky both see it */
      dark: total ? 1 : Math.max(0, Math.min(1, Math.log10(1 / Math.max(1e-6, 1 - q.obsc)) / 6)) };
  }

  /* ---- the ground track ---- */
  function frame(b) {
    const al = -b.mu, sd = Math.sin(b.d), cd = Math.cos(b.d), ca = Math.cos(al), sa = Math.sin(al);
    return { k: [cd * ca, cd * sa, sd], i: [-sa, ca, 0], j: [-sd * ca, -sd * sa, cd] };
  }
  /* a point on the fundamental plane carried along the axis to the ground (the Sun-facing side) */
  function toGround(F, px, py) {
    const P = [px * F.i[0] + py * F.j[0], px * F.i[1] + py * F.j[1], px * F.i[2] + py * F.j[2]], k = F.k, b2 = B * B;
    const A = k[0] * k[0] + k[1] * k[1] + k[2] * k[2] / b2, Bq = 2 * (P[0] * k[0] + P[1] * k[1] + P[2] * k[2] / b2);
    const C = P[0] * P[0] + P[1] * P[1] + P[2] * P[2] / b2 - 1, D = Bq * Bq - 4 * A * C;
    if (D < 0) return null;
    const s = (-Bq + Math.sqrt(D)) / (2 * A), g = [P[0] + s * k[0], P[1] + s * k[1], P[2] + s * k[2]];
    return { lat: Math.atan(g[2] / (b2 * Math.hypot(g[0], g[1]))) / R, lon: Math.atan2(g[1], g[0]) / R, zeta: s };
  }
  function centreAt(e, t) { const b = el(e, t); return toGround(frame(b), b.x, b.y); }
  /* the edge of the umbra (or antumbra) on the ground at t: the cone narrows along the axis, so each
     point is carried down, its radius corrected for how far it went, and carried again */
  function edgeAt(e, t, th, pen) {
    const b = el(e, t), F = frame(b), c = Math.cos(th), s = Math.sin(th);
    let z = 0, g = null;
    for (let i = 0; i < 4; i++) {
      const L = Math.abs(pen ? b.l1 - z * e.tf1 : b.l2 - z * e.tf2);
      g = toGround(F, b.x + L * c, b.y + L * s); if (!g) return null; z = g.zeta;
    }
    return g;
  }
  function outline(e, t, n, pen) { const out = []; for (let i = 0; i < n; i++) { const g = edgeAt(e, t, i / n * 2 * Math.PI, pen); if (g) out.push([g.lat, g.lon]); } return out; }
  /* Central line with minute ticks, and the two limits: at each moment, the edge points furthest to
     either side of the direction the shadow is moving over the ground. */
  function solarPath(e, stepMin) {
    if (e.type === 'P') return null;
    const st = (stepMin || 0.5) / 60, [a0, b] = span(e), line = [], north = [], south = [];
    /* on whole minutes of UT, so the ticks on the map read true */
    const a = tOf(e, Math.ceil(msOf(e, a0) / MIN) * MIN);
    for (let t = a; t <= b; t += st) {
      const c = centreAt(e, t); if (!c) continue;
      const n = centreAt(e, t + 1 / 120);
      line.push({ lat: c.lat, lon: c.lon, ms: msOf(e, t) });
      if (!n) continue;
      const ky = n.lat - c.lat, kx = wrap(n.lon - c.lon) * Math.cos(c.lat * R), kl = Math.hypot(kx, ky) || 1;
      let hi = null, lo = null;
      for (let i = 0; i < 180; i++) {
        const g = edgeAt(e, t, i / 180 * 2 * Math.PI, false); if (!g) continue;
        const s = (-(wrap(g.lon - c.lon) * Math.cos(c.lat * R)) * ky + (g.lat - c.lat) * kx) / kl;
        if (!hi || s > hi.s) hi = { s, lat: g.lat, lon: g.lon };
        if (!lo || s < lo.s) lo = { s, lat: g.lat, lon: g.lon };
      }
      if (hi) north.push([hi.lat, hi.lon]); if (lo) south.push([lo.lat, lo.lon]);
    }
    return { line, north, south };
  }
  const wrap = a => ((a + 540) % 360) - 180;
  /* Greatest magnitude on a lat/lon grid, with the Sun up: the partial bands and the outer limits
     are contours of this. res in degrees; box [s, w, n, e] or the whole Earth. */
  function solarGrid(e, res, box) {
    const [S, W, N, Ee] = box || [-90, -180, 90, 180], nx = Math.round((Ee - W) / res) + 1, ny = Math.round((N - S) / res) + 1;
    const g = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = magAt(e, S + j * res, W + i * res);
    return { g, nx, ny, res, S, W };
  }
  /* greatest magnitude seen from one place with the Sun up (0 if none) */
  function magAt(e, lat, lon) {
    const [a, b] = span(e), st = 0.25;
    {
      const o = observer(lat, lon, 0);
      let best = 0, bt = null;
      let near = 9, pz = null;
      for (let t = a; t <= b; t += st) { const q = at(e, o, t);
        /* the Sun rises or sets in this step: the eclipse as it does so can be the most seen here */
        if (pz != null && (pz > 0) !== (q.zeta > 0)) { const tz = root(x => at(e, o, x).zeta, t - st, t) + (q.zeta > 0 ? 1e-4 : -1e-4), z = at(e, o, tz); if (z.zeta > 0) best = Math.max(best, (z.L1 - z.m) / (z.L1 + z.L2)); }
        pz = q.zeta; if (q.zeta <= 0) continue; const x = q.m - q.L1; if (x < near) { near = x; bt = t; } best = Math.max(best, (q.L1 - q.m) / (q.L1 + q.L2)); }
      /* more than a shadow's crossing away from the edge at best: nothing here */
      if (bt != null && near < 0.3) { const tm = golden(t => { const q = at(e, o, t); return q.zeta > 0 ? (q.m - q.L1) / (q.L1 + q.L2) : 9; }, Math.max(a, bt - st), Math.min(b, bt + st), 28), q = at(e, o, tm); if (q.zeta > 0) best = Math.max(best, (q.L1 - q.m) / (q.L1 + q.L2)); }
      return best;
    }
  }
  /* the same, a few rows at a time so the page never stalls; resolves null if cancelled */
  function solarGridAsync(e, res, box, cancelled) {
    const [S, W, N, Ee] = box || [-90, -180, 90, 180], rows = Math.round((N - S) / res) + 1, parts = [];
    return new Promise(done => {
      let j = 0;
      const step = () => {
        if (cancelled && cancelled()) return done(null);
        const t = performance.now();
        while (j < rows && performance.now() - t < 12) { parts.push(solarGrid(e, res, [S + j * res, W, S + j * res, Ee]).g); j++; }
        if (j < rows) return setTimeout(step, 0);
        const nx = parts[0].length, g = new Float32Array(nx * rows); parts.forEach((p, k) => g.set(p, k * nx));
        done({ g, nx, ny: rows, res, S, W });
      };
      step();
    });
  }
  /* the box the penumbra touches, from its outline every ten minutes, a grid step wider all round */
  function solarBox(e, pad) {
    const [a, b] = span(e); let S = 90, N = -90, lons = [];
    for (let t = a; t <= b; t += 1 / 6) for (const [la, lo] of outline(e, t, 48, true)) { S = Math.min(S, la); N = Math.max(N, la); lons.push(lo); }
    if (!lons.length) return null;
    /* the widest gap in longitude is the side the shadow never reaches */
    lons.sort((x, y) => x - y); let gap = lons[0] + 360 - lons[lons.length - 1], W = lons[0], E = lons[lons.length - 1];
    for (let i = 1; i < lons.length; i++) if (lons[i] - lons[i - 1] > gap) { gap = lons[i] - lons[i - 1]; W = lons[i]; E = lons[i - 1] + 360; }
    const p = pad || 2; if (N > 80 || S < -80) { W = -180; E = 180; }
    return [Math.max(-90, S - p), W - p, Math.min(90, N + p), E + p];
  }
  /* marching squares: each level as a list of polylines in [lat, lon] */
  /* refine: a function giving the true value at a point; each crossing is then found by bisection on
     it rather than by straight-line interpolation between grid points, so the line lies on the real
     limit instead of zig-zagging between the grid's guesses. Shared edges are worked out once. */
  function contours(G, level, refine) {
    const { g, nx, ny, res, S, W } = G, segs = [], memo = new Map();
    const P = (i, j) => [S + j * res, W + i * res], v = (i, j) => g[j * nx + i] - level;
    const lerp0 = (p, q, a, b) => { const k = a / (a - b); return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; };
    const lerp = (p, q, a, b) => {
      const id = p[0] + ',' + p[1] + ',' + q[0] + ',' + q[1]; if (memo.has(id)) return memo.get(id);
      let r = lerp0(p, q, a, b);
      if (refine) { let lo = 0, hi = 1; const pa = a > 0; for (let n = 0; n < 9; n++) { const m = (lo + hi) / 2, x = [p[0] + (q[0] - p[0]) * m, p[1] + (q[1] - p[1]) * m]; if ((refine(x[0], x[1]) - level > 0) === pa) lo = m; else hi = m; } const m = (lo + hi) / 2; r = [p[0] + (q[0] - p[0]) * m, p[1] + (q[1] - p[1]) * m]; }
      memo.set(id, r); return r;
    };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
      const k = (a > 0) | ((b > 0) << 1) | ((c > 0) << 2) | ((d > 0) << 3); if (k === 0 || k === 15) continue;
      const e0 = () => lerp(P(i, j), P(i + 1, j), a, b), e1 = () => lerp(P(i + 1, j), P(i + 1, j + 1), b, c),
        e2 = () => lerp(P(i, j + 1), P(i + 1, j + 1), d, c), e3 = () => lerp(P(i, j), P(i, j + 1), a, d);
      const T = { 1: [[e0, e3]], 2: [[e0, e1]], 3: [[e1, e3]], 4: [[e1, e2]], 5: [[e0, e1], [e2, e3]], 6: [[e0, e2]], 7: [[e2, e3]],
        8: [[e2, e3]], 9: [[e0, e2]], 10: [[e0, e3], [e1, e2]], 11: [[e1, e2]], 12: [[e1, e3]], 13: [[e0, e1]], 14: [[e0, e3]] }[k];
      for (const [p, q] of T) segs.push([p(), q()]);
    }
    return join(segs);
  }
  /* Chaikin corner-cutting: rounds the corners a 1-degree grid leaves without moving the line far.
     Ends of an open line stay put, and nothing is cut across the date line. */
  function smooth(L, n) {
    for (let k = 0; k < n; k++) {
      if (L.length < 3) return L;
      const closed = L[0][0] === L[L.length - 1][0] && L[0][1] === L[L.length - 1][1], out = closed ? [] : [L[0]];
      for (let i = 0; i < L.length - 1; i++) { const p = L[i], q = L[i + 1];
        if (Math.abs(q[1] - p[1]) > 180) { out.push(p, q); continue; }
        out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]); }
      if (closed) out.push(out[0]); else out.push(L[L.length - 1]);
      L = out;
    }
    return L;
  }
  function join(segs) {
    const key = p => p[0].toFixed(4) + ',' + p[1].toFixed(4), ends = new Map(), used = new Uint8Array(segs.length), lines = [];
    segs.forEach((s, n) => { for (const p of s) { const k = key(p); (ends.get(k) || ends.set(k, []).get(k)).push(n); } });
    for (let n = 0; n < segs.length; n++) {
      if (used[n]) continue; used[n] = 1; const L = [segs[n][0], segs[n][1]];
      for (const dir of [1, 0]) for (;;) {
        const tip = dir ? L[L.length - 1] : L[0], nx = (ends.get(key(tip)) || []).find(m => !used[m]); if (nx == null) break;
        used[nx] = 1; const s = segs[nx], other = key(s[0]) === key(tip) ? s[1] : s[0];
        if (dir) L.push(other); else L.unshift(other);
      }
      lines.push(L);
    }
    return lines;
  }

  /* ---------------- lunar ---------------- */
  function lunarContacts(e) {
    const k = [-e.sdP, -e.sdU, -e.sdT, 0, e.sdT, e.sdU, e.sdP], names = ['P1', 'U1', 'U2', 'Max', 'U3', 'U4', 'P4'];
    return names.map((n, i) => (k[i] || i === 3) ? { name: n, ms: e.peak + k[i] * MIN, sub: e.sub[i] } : null);
  }
  const moonAlt = (lat, lon, sub) => { const f = lat * R, dl = (lon - sub[1]) * R, d = sub[0] * R;
    return Math.asin(Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(dl)) / R - 0.95 + 0.57; };
  const moonAz = (lat, lon, sub) => { const f = lat * R, Hh = (lon - sub[1]) * R, d = sub[0] * R;
    return (Math.atan2(-Math.sin(Hh) * Math.cos(d), Math.cos(f) * Math.sin(d) - Math.sin(f) * Math.cos(d) * Math.cos(Hh)) / R + 360) % 360; };
  function lunarLocal(e, lat, lon) {
    const c = lunarContacts(e).map(p => p && { ...p, alt: moonAlt(lat, lon, p.sub), up: moonAlt(lat, lon, p.sub) > 0, az: moonAz(lat, lon, p.sub) });
    const mx = c[3];
    return { e, kind: e.type === 'T' ? 'total' : e.type === 'P' ? 'partial' : 'penumbral', mag: e.mag, umag: e.umag, pmag: e.pmag,
      contacts: c, max: mx, visible: c.some(p => p && p.up), maxUp: mx.up,
      dur: e.sdT * 120, partialDur: e.sdU * 120 };
  }
  /* the Moon's centre against the shadow's, in arcminutes east and north, at any moment */
  function lunarAt(e, ms) {
    const h = (ms - e.peak) / H, x = e.x + e.vx * h, y = e.y + e.vy * h, d = Math.hypot(x, y);
    return { x, y, d, ru: e.ru, rp: e.rp, sm: e.sm, umag: (e.ru + e.sm - d) / (2 * e.sm), pmag: (e.rp + e.sm - d) / (2 * e.sm) };
  }
  /* where each contact can be seen: the Moon's horizon circle at that moment, as a polyline */
  function horizonAt(sub, n) {
    const out = [], f0 = sub[0] * R, l0 = sub[1] * R, dd = 90.8 * R;
    for (let i = 0; i <= (n || 180); i++) {
      const b = i / (n || 180) * 2 * Math.PI, f = Math.asin(Math.sin(f0) * Math.cos(dd) + Math.cos(f0) * Math.sin(dd) * Math.cos(b));
      const l = l0 + Math.atan2(Math.sin(b) * Math.sin(dd) * Math.cos(f0), Math.cos(dd) - Math.sin(f0) * Math.sin(f));
      out.push([f / R, wrap(l / R)]);
    }
    return out;
  }


  /* ---------------- drawing, shared by Scout and the app ---------------- */
  /* the eclipse under way at a moment, if any: solar within its span, lunar within its penumbral one */
  function find(ms) {
    const L = list(); let lo = 0, hi = L.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].peak < ms - 6 * H) lo = m + 1; else hi = m; }
    for (let i = lo; i < L.length && L[i].peak < ms + 6 * H; i++) {
      const e = L[i];
      if (e.kind === 'lunar' && Math.abs(ms - e.peak) <= e.sdP * MIN) return e;
      if (e.kind === 'solar' && Math.abs(ms - e.peak) <= 4 * H) return e;
    }
    return null;
  }
  /* the angle from the zenith round to celestial north at an object: north on screen, zenith up */
  function parallactic(alt, az, lat) {
    const f = lat * R, h = alt * R, A = az * R;
    const sd = Math.sin(f) * Math.sin(h) + Math.cos(f) * Math.cos(h) * Math.cos(A), d = Math.asin(sd);
    const Hh = Math.atan2(-Math.sin(A) * Math.cos(h), Math.cos(f) * Math.sin(h) - Math.sin(f) * Math.cos(h) * Math.cos(A));
    return Math.atan2(Math.sin(Hh), Math.tan(f) * Math.cos(d) - Math.sin(d) * Math.cos(Hh));
  }
  const axes = q => ({ nx: Math.sin(q), ny: -Math.cos(q), ex: -Math.cos(q), ey: -Math.sin(q) });
  /* The faces: real photographs, so a disc reads as the Moon or the Sun rather than a dot. Moon:
     Gregory H. Revera, CC BY-SA 3.0 (cropped and toned). Sun: NASA/SDO HMI continuum, public domain
     (warmed). 512px WebP beside this script in assets/, loaded on first use and tinted on demand:
     red for night vision, warmer for the sequence stamps. Until one arrives the flat disc stands in. */
  const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : '../'; })();
  const FACES = {};
  function face(kind, tint) {
    let f = FACES[kind];
    if (!f) {
      f = FACES[kind] = { ready: false, tints: {} };
      const img = new Image(); img.decoding = 'async';
      img.onload = () => { f.img = img; f.ready = true; try { window.dispatchEvent(new Event('nocto-face')); } catch (err) {} };
      img.src = BASE + 'assets/' + kind + '-disc.webp';
    }
    if (!f.ready) return null;
    if (!tint) return f.img;
    if (!f.tints[tint]) {
      const s = f.img.naturalWidth || 512, cv = document.createElement('canvas'); cv.width = cv.height = s;
      const c = cv.getContext('2d'); c.drawImage(f.img, 0, 0, s, s);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = tint; c.fillRect(0, 0, s, s);
      c.globalCompositeOperation = 'destination-in'; c.drawImage(f.img, 0, 0, s, s);
      f.tints[tint] = cv;
    }
    return f.tints[tint];
  }
  /* north on the photograph turned to north in the sky (q is the parallactic angle) */
  function drawFace(ctx, kind, x, y, r, q, tint) {
    const im = face(kind, tint); if (!im) return false;
    ctx.save(); ctx.translate(x, y); if (q) ctx.rotate(q);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, -r, -r, 2 * r, 2 * r); ctx.restore(); return true;
  }
  /* the full Moon on its own: the photograph, or the flat disc until it has loaded */
  function moonDisc(ctx, x, y, r, q, nv) {
    if (drawFace(ctx, 'moon', x, y, r, q, nv ? '#FF3B18' : null)) return;
    ctx.save(); ctx.fillStyle = nv ? '#FF3B18' : '#DDE0E8'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.restore();
  }
  /* the Sun with the Moon across it: crescent, ring, diamond ring, beads, corona */
  function drawSun(ctx, x, y, r, s, q, o) {
    const A = axes(q), mx = x + (s.east * A.ex + s.north * A.nx) * r, my = y + (s.east * A.ey + s.north * A.ny) * r, mr = s.moonR * r;
    const lit = 1 - s.obsc, stamp = o && o.stamp;
    ctx.save();
    if (s.total || lit < 0.004) {
      const k = s.total ? 1 : 1 - lit / 0.004;
      /* the corona: soft, a little longer along the Sun's equator */
      const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 4.2);
      g.addColorStop(0, 'rgba(236,240,255,' + (0.9 * k) + ')'); g.addColorStop(0.25, 'rgba(210,220,245,' + (0.35 * k) + ')'); g.addColorStop(1, 'rgba(200,210,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 4.2, r * 3.3, Math.atan2(A.ey, A.ex), 0, 6.2832); ctx.fill();
      if (s.total) { ctx.fillStyle = 'rgba(255,90,120,.85)'; [0.6, 2.3, 4.4].forEach(a => { ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(1, r * 0.06), 0, 6.2832); ctx.fill(); }); }
    } else if (!stamp) {
      ctx.shadowColor = 'rgba(255,240,200,.9)'; ctx.shadowBlur = r * 6 * Math.max(0.15, lit);
    }
    /* the uncovered Sun */
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.clip();
    ctx.fillStyle = stamp ? '#FFD9A0' : '#FFF4DC';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.arc(mx, my, mr, 0, 6.2832, true); ctx.fill('evenodd');
    if (!s.total) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.clip('evenodd'); drawFace(ctx, 'sun', x, y, r * 1.005, q, stamp ? '#FFD9A0' : null); }
    ctx.restore();
    /* the last sliver: the diamond ring and the beads */
    if (!s.total && lit < 0.004 && s.obsc > 0) {
      const dx = x - mx, dy = y - my, dl = Math.hypot(dx, dy) || 1, bx = x + dx / dl * r, by = y + dy / dl * r, k = 1 - lit / 0.004;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r * 1.6);
      g.addColorStop(0, 'rgba(255,255,255,' + k + ')'); g.addColorStop(0.2, 'rgba(255,248,230,' + (0.6 * k) + ')'); g.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r * 1.6, 0, 6.2832); ctx.fill();
    }
    if (s.total) { ctx.fillStyle = '#050508'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.2832); ctx.fill(); }
  }
  /* Danjon's scale, 0 (the Moon almost gone) to 4 (bright copper) */
  function umbraInk(L) {
    const T = [[18, 10, 10, 0.96], [55, 22, 14, 0.93], [110, 40, 20, 0.88], [170, 75, 35, 0.8], [215, 120, 60, 0.7]];
    const i = Math.max(0, Math.min(3.999, L)), a = T[Math.floor(i)], b = T[Math.floor(i) + 1], f = i - Math.floor(i);
    return a.map((v, k) => v + (b[k] - v) * f);
  }
  /* the Earth's shadow over the Moon, drawn on top of the Moon already on the canvas */
  function drawMoonShadow(ctx, x, y, r, l, q, danjon) {
    const A = axes(q), k = r / l.sm, sx = x - (l.x * A.ex + l.y * A.nx) * k, sy = y - (l.x * A.ey + l.y * A.ny) * k;
    const ru = l.ru * k, rp = l.rp * k, c = umbraInk(danjon == null ? 2 : danjon);
    const tex = !!(FACES.moon && FACES.moon.ready);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * (tex ? 1.005 : 1.02), 0, 6.2832); ctx.clip();
    const gp = ctx.createRadialGradient(sx, sy, ru, sx, sy, rp);
    gp.addColorStop(0, 'rgba(8,8,12,.55)'); gp.addColorStop(1, 'rgba(8,8,12,0)');
    ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(sx, sy, rp, 0, 6.2832); ctx.fill();
    const gu = ctx.createRadialGradient(sx, sy, 0, sx, sy, ru);
    /* over the photograph the shadow tints rather than covers, so the maria still show through in copper */
    if (tex) {
      const L = v => Math.min(255, Math.round(v * 1.35)), ink = (m, a) => 'rgba(' + L(c[0] * m) + ',' + L(c[1] * m) + ',' + L(c[2] * m) + ',' + a + ')';
      ctx.globalCompositeOperation = 'multiply';
      gu.addColorStop(0, ink(0.6, c[3])); gu.addColorStop(0.97, ink(1, c[3])); gu.addColorStop(1, ink(1, c[3] * 0.6));
      ctx.fillStyle = gu; ctx.beginPath(); ctx.arc(sx, sy, ru, 0, 6.2832); ctx.fill();
      ctx.restore(); return;
    }
    gu.addColorStop(0, 'rgba(' + (c[0] * 0.55) + ',' + (c[1] * 0.55) + ',' + (c[2] * 0.55) + ',' + c[3] + ')');
    gu.addColorStop(0.97, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')'); gu.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (c[3] * 0.6) + ')');
    ctx.fillStyle = gu; ctx.beginPath(); ctx.arc(sx, sy, ru, 0, 6.2832); ctx.fill();
    ctx.restore();
  }
  /* how much moonlight is left, for the sky's own wash */
  const moonLit = l => l.umag >= 1 ? 0.02 : l.umag > 0 ? Math.max(0.05, 1 - l.umag * 0.95) : Math.max(0.6, 1 - Math.max(0, l.pmag) * 0.35);

  /* ---------------- the map: paths, bands, horizons ---------------- */
  const PATHS = new Map(), GRIDS = new Map();
  /* everything the map draws for one eclipse, worked out once; the partial bands arrive a moment later */
  function mapData(e, onGrid) {
    if (e.kind === 'lunar') return { lunar: true, circles: lunarContacts(e).map((c, i) => c && i !== 3 ? { name: c.name, pts: horizonAt(c.sub, 120) } : null).filter(Boolean), max: e.sub[3] };
    if (!PATHS.has(e.id)) PATHS.set(e.id, solarPath(e, 1));
    const g = GRIDS.get(e.id);
    if (!g) { GRIDS.set(e.id, 'busy'); const box = solarBox(e); if (box) solarGridAsync(e, 1, box).then(G => { GRIDS.set(e.id, G ? [0.001, 0.2, 0.4, 0.6, 0.8].map(lv => ({ lv, lines: contours(G, lv).map(L => smooth(L, 2)) })) : null); if (onGrid) onGrid();
      /* then the outer limit again, found exactly at each crossing: drawn first from the grid so the map is never kept waiting */
      if (G) setTimeout(() => { const bands = GRIDS.get(e.id); if (!Array.isArray(bands)) return; bands[0] = { lv: 0.001, lines: contours(G, 0.001, (la, lo) => magAt(e, la, lo)).map(L => smooth(L, 1)) }; if (onGrid) onGrid(); }, 60); }); }
    return { path: PATHS.get(e.id), bands: Array.isArray(GRIDS.get(e.id)) ? GRIDS.get(e.id) : null };
  }
  /* draws onto a map; at(lat, lon) gives the pixel, world is the width of the world in pixels */
  function drawMap(ctx, e, at, world, o) {
    const D = mapData(e, o && o.onGrid), W = ctx.canvas.width, fmtUT = ms => { const d = new Date(ms); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UT'; };
    const poly = (pts, close) => { let px = null; ctx.beginPath(); pts.forEach((p, i) => { let [x, y] = at(p[0], p[1]); if (px != null) { while (x - px > world / 2) x -= world; while (px - x > world / 2) x += world; } if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); px = x; }); if (close) ctx.closePath(); };
    /* on a pale basemap (Detail) the bands and horizons are drawn in ink rather than light */
    const ink = o && o.light ? a => 'rgba(22,22,28,' + Math.min(1, a + 0.25) + ')' : a => 'rgba(240,236,228,' + a + ')';
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const label = (t, x, y, c) => { ctx.font = '600 11px "JetBrains Mono", monospace'; const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(10,10,11,.8)'; ctx.fillRect(x - 3, y - 11, w + 6, 15); ctx.fillStyle = c; ctx.fillText(t, x, y); };
    if (D.lunar) {
      const mx = at(D.max[0], D.max[1]);
      ctx.fillStyle = 'rgba(214,179,104,.9)'; ctx.beginPath(); ctx.arc(mx[0], mx[1], 5, 0, 6.2832); ctx.fill();
      label('Moon overhead at greatest', mx[0] + 9, mx[1] + 4, '#E8C98A');
      D.circles.forEach(c => { ctx.strokeStyle = /U2|U3/.test(c.name) ? 'rgba(232,201,138,.95)' : /U/.test(c.name) ? 'rgba(232,201,138,.6)' : ink(0.35); ctx.lineWidth = /U2|U3/.test(c.name) ? 2 : 1.4; ctx.setLineDash(/P/.test(c.name) ? [5, 5] : []);
        poly(c.pts); ctx.stroke(); const m = c.pts[30], p = at(m[0], m[1]); label(c.name, p[0] + 4, p[1], '#DCD7CC'); });
      ctx.restore(); return;
    }
    if (D.bands) D.bands.forEach(b => { ctx.strokeStyle = b.lv < 0.01 ? ink(0.75) : ink(0.38); ctx.lineWidth = b.lv < 0.01 ? 1.6 : 1; ctx.setLineDash(b.lv < 0.01 ? [] : [4, 4]);
      b.lines.forEach(L => { if (L.length < 3) return; poly(L); ctx.stroke(); const m = L[Math.floor(L.length / 2)], p = at(m[0], m[1]); if (p[0] > 0 && p[0] < W) label(b.lv < 0.01 ? 'Partial limit' : Math.round(b.lv * 100) + '%', p[0] + 4, p[1] - 3, '#DCD7CC'); }); });
    ctx.setLineDash([]);
    const P = D.path;
    if (P && P.north.length > 1) {
      ctx.fillStyle = e.type === 'A' ? 'rgba(232,201,138,.28)' : 'rgba(214,179,104,.38)';
      poly(P.north.concat(P.south.slice().reverse()), true); ctx.fill();
      ctx.strokeStyle = '#E8C98A'; ctx.lineWidth = 1.5; poly(P.north); ctx.stroke(); poly(P.south); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,10,11,.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]); poly(P.line.map(q => [q.lat, q.lon])); ctx.stroke(); ctx.setLineDash([]);
      P.line.forEach(q => { if (Math.round(q.ms / MIN) % 10) return; const p = at(q.lat, q.lon); ctx.fillStyle = '#0A0A0B'; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 6.2832); ctx.fill();
        if (Math.round(q.ms / MIN) % 30 === 0) label(fmtUT(q.ms), p[0] + 6, p[1] - 5, '#E8C98A'); });
    }
    if (e.gdur) { const p = at(e.glat, e.glon); ctx.fillStyle = '#F3F0EA'; ctx.beginPath(); ctx.arc(p[0], p[1], 4.5, 0, 6.2832); ctx.fill(); ctx.strokeStyle = '#0A0A0B'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  }
  /* the box to fit the map to */
  function mapBox(e) {
    if (e.kind === 'lunar') return [Math.max(-70, e.sub[3][0] - 60), e.sub[3][1] - 110, Math.min(75, e.sub[3][0] + 60), e.sub[3][1] + 110];
    const P = PATHS.get(e.id) || (PATHS.set(e.id, solarPath(e, 1)), PATHS.get(e.id));
    if (P && P.line.length > 1) { const la = P.line.map(q => q.lat), lo = P.line.map(q => q.lon), c = lo[Math.floor(lo.length / 2)]; const un = lo.map(v => c + wrap(v - c));
      return [Math.min(...la) - 12, Math.min(...un) - 15, Math.max(...la) + 12, Math.max(...un) + 15]; }
    return solarBox(e, 0) || [-60, -180, 70, 180];
  }

  /* ---------------- sequence, shot list, prompts ---------------- */
  const KEY = 'noctography.eclipse';
  const DEF = { every: 10, near: 1, nearMin: 5, danjon: 2, voice: true, beeps: true, count90: true, count10: true, frames: true,
    cues: [{ at: 'C2', off: -15, text: 'Diamond ring. Filter off at totality.' }, { at: 'C2', off: 0, text: 'Totality. Filters off now.' },
      { at: 'C3', off: 0, text: 'Totality over. Filters back on now.' }] };
  function settings() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (err) { return Object.assign({}, DEF); } }
  function saveSettings(p) { const s = Object.assign(settings(), p); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (err) {} return s; }
  /* the contacts that matter here, by name, whichever kind of eclipse */
  function marks(lc) {
    if (!lc) return {};
    if (lc.e.kind === 'solar') return { C1: lc.c1 && lc.c1.ms, C2: lc.c2 && lc.c2.ms, Max: lc.max.ms, C3: lc.c3 && lc.c3.ms, C4: lc.c4 && lc.c4.ms };
    const o = {}; lc.contacts.forEach(c => { if (c) o[c.name] = c.ms; }); o.C2 = o.U2; o.C3 = o.U3; o.C1 = o.U1 || o.P1; o.C4 = o.U4 || o.P4; return o;
  }
  /* the frames of a sequence: every so often through the partial stages, closer together near the
     middle, and the contacts themselves */
  function sequence(lc, st) {
    const s = st || settings(), M = marks(lc); if (!M.C1 || !M.C4) return [];
    const mid0 = M.C2 || M.Max, mid1 = M.C3 || M.Max, near = (s.nearMin || 0) * MIN, out = new Set();
    for (let t = M.C1; t <= M.C4 + 1; t += Math.max(1, s.every) * MIN) out.add(Math.round(t));
    if (s.near > 0 && near > 0) for (let t = mid0 - near; t <= mid1 + near + 1; t += s.near * MIN) out.add(Math.round(t));
    [M.C1, M.C2, M.Max, M.C3, M.C4].forEach(t => t && out.add(Math.round(t)));
    const L = [...out].sort((a, b) => a - b);
    return L.filter((t, i) => !i || t - L[i - 1] > 20000);
  }
  function stageAt(lc, t) {
    const M = marks(lc), sol = lc.e.kind === 'solar';
    if (M.C2 && t >= M.C2 - 1000 && t <= M.C3 + 1000) return sol ? (lc.kind === 'annular' ? 'Ring' : 'Totality') : 'Totality';
    if (Math.abs(t - M.Max) < 30000) return 'Greatest';
    if (t < M.Max) return 'Partial, going in'; return 'Partial, coming out';
  }
  /* From Fred Espenak's exposure guides: t = f^2 / (ISO x 2^Q), snapped to the nearest full-stop shutter speed.
     Solar Q (Espenak, NASA eclipse bulletins): partial behind ND 5.0 8, chromosphere 11, prominences 9,
     corona 0.1 Rs 7, 0.2 Rs (diamond ring) 5, 0.5 Rs 3, 1 Rs 1, 4 Rs -1. Partial values also serve annulars.
     Lunar Q (Espenak, How to Photograph a Lunar Eclipse): full Moon 8, penumbral 7, partial 6,
     totality by Danjon L: 4 -3, 3 -5, 2 -7, 1 -9, 0 -11 (two stops per step). Starting points only. */
  const SPEEDS = [1/8000, 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30, 60, 120, 240];
  function speed(f, iso, Q) {
    const t = f * f / (iso * Math.pow(2, Q)); let b = SPEEDS[0];
    SPEEDS.forEach(s => { if (Math.abs(Math.log2(s / t)) < Math.abs(Math.log2(b / t))) b = s; });
    return b >= 1 ? b + 's' : '1/' + Math.round(1 / b) + 's';
  }
  function exposureAt(lc, t, danjon) {
    const sol = lc.e.kind === 'solar', st = stageAt(lc, t);
    if (sol) {
      const S = Q => speed(8, 100, Q), M = marks(lc), total = lc.kind !== 'annular';
      if (total && st === 'Totality') return { filter: 'Off', exp: 'ISO 100 f/8: prominences ' + S(9) + ', inner corona ' + S(7) + ' to ' + S(3) + ', outer corona ' + S(1) + ' to ' + S(-1) };
      if (total && M.C2 && (Math.abs(t - M.C2) < 20000 || Math.abs(t - M.C3) < 20000)) return { filter: 'Off', exp: 'ISO 100 f/8: chromosphere ' + S(11) + ', diamond ring ' + S(5) };
      return { filter: 'On', exp: 'ISO 100 f/8 ' + S(8) + ' (ND 5.0)' };
    }
    const l = lunarAt(lc.e, t), L = Math.round(Math.max(0, Math.min(4, danjon == null ? 2 : danjon))), Qt = -11 + 2 * L;
    if (l.umag >= 1) return { filter: '\u2013', exp: 'ISO 800 f/5.6 ' + speed(5.6, 800, Qt) };
    if (l.umag > 0) return { filter: '\u2013', exp: 'ISO 400 f/8 ' + speed(8, 400, 6) + ', and ISO 800 f/5.6 ' + speed(5.6, 800, Qt) + ' for the shadow' };
    return { filter: '\u2013', exp: 'ISO 400 f/8 ' + speed(8, 400, (l.pmag == null || l.pmag > 0) ? 7 : 8) };
  }
  function shotList(lc, st, fmt) {
    const s = st || settings();
    return sequence(lc, s).map((t, i) => { const x = exposureAt(lc, t, s.danjon); return { n: i + 1, ms: t, time: fmt ? fmt(t) : new Date(t).toISOString().slice(11, 19), stage: stageAt(lc, t), filter: x.filter, exp: x.exp }; });
  }
  /* everything to be said on the day, in order */
  function cueList(lc, st) {
    const s = st || settings(), M = marks(lc), out = [], sol = lc.e.kind === 'solar';
    const say = (ms, text, kind) => { if (ms) out.push({ ms: Math.round(ms), text, kind: kind || 'say' }); };
    const tot = sol ? (lc.kind === 'annular' ? 'the ring' : 'totality') : 'totality';
    say(M.C1, sol ? 'First contact. The eclipse has begun.' : (M.U1 ? 'The partial eclipse has begun.' : 'The penumbral eclipse has begun.'), 'mark');
    if (M.C2) {
      if (s.count90) [300, 90, 60, 30].forEach(k => say(M.C2 - k * 1000, (k >= 120 ? Math.round(k / 60) + ' minutes' : k + ' seconds') + ' to ' + tot + '.'));
      if (s.count10) { say(M.C2 - 10000, tot.charAt(0).toUpperCase() + tot.slice(1) + ' in 10.', 'count'); for (let k = 9; k >= 1; k--) say(M.C2 - k * 1000, String(k), 'count'); }
      say(M.C2, (tot === 'the ring' ? 'The ring' : 'Totality') + '.', 'mark');
      if (s.count10) { say(M.C3 - 10000, (tot === 'the ring' ? 'The ring' : 'Totality') + ' ends in 10.', 'count'); for (let k = 9; k >= 1; k--) say(M.C3 - k * 1000, String(k), 'count'); }
      say(M.C3, (tot === 'the ring' ? 'The ring is over.' : 'Totality is over.'), 'mark');
    } else say(M.Max, 'Greatest eclipse.', 'mark');
    say(M.C4, sol ? 'Last contact. The eclipse is over.' : 'The Moon is out of the shadow.', 'mark');
    (s.cues || []).forEach(c => { const b = M[c.at]; if (b && c.text) say(b + (c.off || 0) * 1000, c.text, 'cue'); });
    if (s.frames) sequence(lc, s).forEach((t, i, a) => say(t, 'Frame ' + (i + 1) + ' of ' + a.length + '.', 'frame'));
    out.sort((a, b) => a.ms - b.ms || (a.kind === 'count' ? -1 : 1));
    /* two things at the same second: the countdown wins, the rest wait their turn */
    return out;
  }
  /* The runner: speaks each cue at its time, ticks the countdowns, keeps the screen awake. A rehearsal
     is the same clock moved, so it runs exactly as the day will. Start it from a tap: browsers only
     speak after one. */
  const Runner = {
    list: [], i: 0, shift: 0, on: false, t: null, lock: null, onTick: null, ac: null,
    start(list, o) {
      this.stop(); this.list = list.slice(); this.shift = (o && o.shift) || 0; this.on = true; this.onTick = o && o.onTick; this.s = settings();
      const now = this.now(); this.i = this.list.findIndex(c => c.ms >= now - 500); if (this.i < 0) this.i = this.list.length;
      try { const u = new SpeechSynthesisUtterance(o && o.hello || 'Prompts on.'); this.voice(u); speechSynthesis.speak(u); } catch (err) {}
      try { this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); this.ac.resume(); } catch (err) {}
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { this.lock = l; }).catch(() => {}); } catch (err) {}
      this.t = setInterval(() => this.tick(), 100); this.tick();
    },
    now() { return Date.now() + this.shift; },
    voice(u) { u.lang = 'en-GB'; u.rate = 1.05; try { const v = speechSynthesis.getVoices().find(x => /en-GB/i.test(x.lang)); if (v) u.voice = v; } catch (err) {} },
    beep(hi) { const ac = this.ac; if (!ac || !this.s.beeps) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hi ? 1320 : 880; g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (hi ? 0.5 : 0.12)); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.6); },
    tick() {
      if (!this.on) return; const now = this.now();
      while (this.i < this.list.length && this.list[this.i].ms <= now) {
        const c = this.list[this.i++]; if (now - c.ms > 3000) continue;
        if (c.kind === 'count') { this.beep(false); try { speechSynthesis.cancel(); } catch (err) {} }
        if (c.kind === 'mark') this.beep(true);
        if (this.s.voice) try { const u = new SpeechSynthesisUtterance(c.text); this.voice(u); speechSynthesis.speak(u); } catch (err) {}
      }
      if (this.onTick) this.onTick(this.state());
      if (this.i >= this.list.length && now > (this.list.length ? this.list[this.list.length - 1].ms : 0) + 5000) this.stop();
    },
    state() { const now = this.now(), next = this.list.slice(this.i).find(c => c.kind !== 'count') || null; return { on: this.on, now, next, rehearse: this.shift !== 0 }; },
    stop() { clearInterval(this.t); this.t = null; const was = this.on; this.on = false; try { speechSynthesis.cancel(); } catch (err) {} try { if (this.lock) this.lock.release(); } catch (err) {} this.lock = null; if (was && this.onTick) this.onTick(this.state()); },
  };

  /* ---------------- where it can be seen, in words ---------------- */
  const FR = { 'Northern America': 'North America', 'Central America': 'Central America', 'Caribbean': 'the Caribbean', 'South America': 'South America',
    'Northern Europe': 'northern Europe', 'Western Europe': 'western Europe', 'Southern Europe': 'southern Europe', 'Eastern Europe': 'eastern Europe',
    'Northern Africa': 'north Africa', 'Western Africa': 'west Africa', 'Middle Africa': 'central Africa', 'Eastern Africa': 'east Africa', 'Southern Africa': 'southern Africa',
    'Western Asia': 'the Middle East', 'Central Asia': 'central Asia', 'Southern Asia': 'south Asia', 'Eastern Asia': 'east Asia', 'South-Eastern Asia': 'south-east Asia',
    'Australia and New Zealand': 'Australasia', 'Melanesia': 'the south-west Pacific', 'Antarctica': 'Antarctica' };
  const GROUPS = [['Europe', ['Northern Europe', 'Western Europe', 'Southern Europe', 'Eastern Europe']],
    ['Africa', ['Northern Africa', 'Western Africa', 'Middle Africa', 'Eastern Africa', 'Southern Africa']],
    ['Asia', ['Western Asia', 'Central Asia', 'Southern Asia', 'Eastern Asia', 'South-Eastern Asia']]];
  const and = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function regionText(subs) {
    const has = x => subs.includes(x), out = [];
    const am = ['Northern America', 'Central America', 'Caribbean', 'South America'].filter(has);
    if (has('Northern America') && has('South America')) out.push('the Americas');
    else if (has('Northern America') && has('Central America')) out.push('North and Central America');
    else am.filter(x => x !== 'Caribbean' || am.length === 1).forEach(x => out.push(FR[x]));
    for (const [name, mem] of GROUPS) { const on = mem.filter(has); if (on.length >= 3) out.push(name); else on.forEach(x => out.push(FR[x])); }
    if (has('Australia and New Zealand')) out.push(FR['Australia and New Zealand']);
    if (has('Melanesia') && !has('Australia and New Zealand')) out.push(FR.Melanesia);
    if (!out.length && has('Antarctica')) out.push('Antarctica');
    return and(out);
  }
  const cap = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  /* { path: countries under the path, regions: where the rest of it is seen, line: both, short } */
  function where(e) {
    const G = window.NoctoEclipseData && window.NoctoEclipseData.geo, r = G && G.geo[e.id]; if (!r) return null;
    const regions = regionText(r[1].map(i => G.SUBS[i])), countries = r[0];
    const few = n => countries.length > n ? countries.slice(0, n).join(', ') + ' +' + (countries.length - n) : and(countries);
    const central = e.kind === 'solar' && e.type !== 'P';
    return { countries, regions, path: central ? (countries.length ? and(countries.length > 6 ? countries.slice(0, 6).concat([(countries.length - 6) + ' more']) : countries) : 'the ocean only') : '',
      line: central ? (countries.length ? few(4) : 'Over the ocean' + (regions ? ', partial in ' + regions : '')) : cap(regions) || 'Hardly seen from land' };
  }

  /* ---------------- for the app ---------------- */
  function local(e, lat, lon, hM) { return e.kind === 'solar' ? solarLocal(e, lat, lon, hM) : lunarLocal(e, lat, lon); }
  /* eclipses from here, with the ones that can be seen marked: from a date, forwards or back */
  function around(lat, lon, fromMs, n, back) {
    const L = list(), out = [];
    const i0 = L.findIndex(e => e.peak >= fromMs), idx = i0 < 0 ? L.length : i0;
    for (let i = back ? idx - 1 : idx; back ? i >= 0 : i < L.length; back ? i-- : i++) {
      const e = L[i], lc = lat == null ? null : local(e, lat, lon);
      out.push({ e, lc, seen: !!(lc && lc.visible) });
      if (out.length >= (n || 12)) break;
    }
    return out;
  }
  const credit = 'Eclipse Predictions by Fred Espenak, NASA\u2019s GSFC';
  window.NoctoEclipse = { where, find, parallactic, drawSun, drawMoonShadow, face, drawFace, moonDisc, moonLit, mapData, drawMap, mapBox, settings, saveSettings, marks, sequence, stageAt, exposureAt, shotList, cueList, Runner,
    data, list, byId, local, around, solarLocal, solarAt, solarPath, solarGrid, solarGridAsync, solarBox, contours, outline, centreAt,
    lunarLocal, lunarAt, lunarContacts, horizonAt, tOf, msOf, TYPES, credit };
})();
