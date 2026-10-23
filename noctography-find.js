/* Noctography Find shot: when, and from where on the loaded ground, the Moon, the Sun, a star or the
   Milky Way lines up with a subject at Scout's pin. Arithmetic only: Scout supplies the sky (apparent
   positions, as it draws them) and the ground (its loaded heights). */
(function(){
if (window.NoctoFind) return;
const D = Math.PI / 180, R = 6371000, REFF = R * 7 / 6, MR = 6378137, LN = Math.log(1.04);
const wrap = a => ((a % 360) + 540) % 360 - 180;
/* the angle up to a point h metres high, d metres away, from an eye at h0, with the curvature drop */
const elev = (h, h0, d) => Math.atan2(h - h0 - d * d / (2 * REFF), d) / D;
function dest(lat, lon, az, d){
  const dr = d / R, br = az * D, la = lat * D, lo = lon * D;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / D, lon: lo2 / D };
}
const pause = () => new Promise(r => setTimeout(r, 0));
const row = az => ((Math.round(az) % 360) + 360) % 360;
const latY = y => (2 * Math.atan(Math.exp(y / MR)) - Math.PI / 2) / D;
const stepOf = x => x < 2000 ? 4 : x < 6000 ? 6 : x < 12000 ? 10 : 15;

/* ---------------- what stands above the ground ----------------
   o.obs.grids: what stands above the bare ground on grids round the pin, finest first, each { box (Web
   Mercator metres), W, mm (metres a cell), nd (metres above the ground, NaN unknown) }. Each cell takes
   the tallest of itself and its eight neighbours, so a line counts what stands a cell either side of it:
   from near at hand that is a few degrees of the frame, which a tree crown or a wall filling it would spoil,
   and the grid's own sampling misses less. Each also gets the bare ground at half its resolution, once, so
   a bearing can be followed by arithmetic alone. */
function dilate(nd, W){
  const tmp = new Float32Array(nd.length), out = new Float32Array(nd.length), mx3 = (a, b, c) => { let m = -Infinity; if (a === a && a > m) m = a; if (b === b && b > m) m = b; if (c === c && c > m) m = c; return m === -Infinity ? NaN : m; };
  for (let j = 0; j < W; j++) { const r = j * W; for (let i = 0; i < W; i++) tmp[r + i] = mx3(nd[r + i], i ? nd[r + i - 1] : NaN, i < W - 1 ? nd[r + i + 1] : NaN); }
  for (let j = 0; j < W; j++) { const r = j * W; for (let i = 0; i < W; i++) out[r + i] = mx3(tmp[r + i], j ? tmp[r - W + i] : NaN, j < W - 1 ? tmp[r + W + i] : NaN); }
  return out;
}
async function fieldOf(o, stop){
  let last = performance.now(); const grids = [];
  for (const q0 of o.obs.grids) {
    const q = { ...q0, nd: dilate(q0.nd, q0.W) };
    if (stop && stop()) return null; await pause(); last = performance.now();
    const hw = Math.ceil(q.W / 2), gh = new Float32Array(hw * hw).fill(NaN);
    for (let j = 0; j < hw; j++) {
      const la = latY(q.box.y1 - (2 * j + 1) * q.mm);
      for (let i = 0; i < hw; i++) { const g = o.ground(la, (q.box.x0 + (2 * i + 1) * q.mm) / MR / D); if (g != null) gh[j * hw + i] = g; }
      if (performance.now() - last > 24) { if (stop && stop()) return null; await pause(); last = performance.now(); }
    }
    grids.push({ x0: q.box.x0, y1: q.box.y1, W: q.W, mm: q.mm, nd: q.nd, hw, gh });
  }
  const far = Math.min(o.rMax || 25000, o.blockR || 25000), xs = [];
  for (let x = 40; x <= far; x += stepOf(x)) xs.push(x);
  return { grids, far, xs: Float32Array.from(xs), near: o.near || 40, need: o.need != null ? o.need : o.top, top: o.top, o, cache: new Map() };
}
let LB = NaN, LG = NaN;
function look(grids, X, Y){
  for (let a = 0; a < grids.length; a++) {
    const q = grids[a], i = Math.floor((X - q.x0) / q.mm), j = Math.floor((q.y1 - Y) / q.mm);
    if (i < 0 || j < 0 || i >= q.W || j >= q.W) continue;
    const b = q.nd[j * q.W + i]; if (b !== b) continue;
    const g = q.gh[(j >> 1) * q.hw + (i >> 1)]; if (g !== g) continue;
    LB = b; LG = g; return true;
  }
  return false;
}
/* the places on one exact bearing out from the pin, x metres along it (a rhumb line, which over 25 km
   is the great circle to well under a metre) */
function geo(pin, brg){
  const p0 = pin.lat * D, l0 = pin.lon * D, cb = Math.cos(brg * D), sb = Math.sin(brg * D), q0 = Math.log(Math.tan(Math.PI / 4 + p0 / 2));
  const flat = Math.abs(cb) < 1e-4, tb = flat ? 0 : sb / cb;
  return { lat: 0, lon: 0, X: 0, Y: 0, at(x){
    const p = p0 + x * cb / R, q = Math.log(Math.tan(Math.PI / 4 + p / 2)), l = flat ? l0 + x * sb / (R * Math.cos((p0 + p) / 2)) : l0 + tb * (q - q0);
    this.lat = p / D; this.lon = l / D; this.X = MR * l; this.Y = MR * q; return this; } };
}
/* along one bearing, at each of the field's distances: the bare ground, the top of whatever stands there,
   and whether you could stand there (open ground, nothing over 2.5 m, not water) */
function along(F, pin, brg){
  const o = F.o, xs = F.xs, N = xs.length, GR = new Float32Array(N), T = new Float32Array(N), ST = new Uint8Array(N), c = geo(pin, brg);
  for (let j = 0; j < N; j++) {
    c.at(xs[j]); let g, top, st;
    if (look(F.grids, c.X, c.Y)) { g = LG; top = g + LB; st = LB <= 2.5; }
    else { const g0 = o.ground(c.lat, c.lon), s0 = o.surface(c.lat, c.lon); g = g0 != null ? g0 : s0 != null ? s0 : NaN; top = s0 != null ? s0 : g; st = g === g && (s0 == null || s0 - g <= 2.5); }
    if (st && o.water && o.water(c.lat, c.lon, g)) st = false;
    GR[j] = g; T[j] = top; ST[j] = st ? 1 : 0;
  }
  return { GR, T, ST, c };
}
/* On one exact bearing: whether, from each place, the part of the subject that has to show (o.need) is in
   sight: above every building, tree and rise more than 8 m short of you (nearer than that you would step
   round it, and the 3D view draws no tree there), with 3e-4 (2 m in 7 km) to spare, and you can stand
   there. Kept for the last 1500 bearings, a hundredth of a degree apart. */
function fine(Gd, brg){
  const F = Gd.fine, key = Math.round(brg * 100); let e = F.cache.get(key);
  if (e) { F.cache.delete(key); F.cache.set(key, e); return e; }
  const { GR, T, ST, c } = along(F, Gd.pin, key / 100), xs = F.xs, N = xs.length, OK = new Uint8Array(N), R2 = 2 * REFF, need = F.need;
  let pm = -1e9, m = 0;
  for (let j = 0; j < N; j++) {
    const x = xs[j];
    while (m < j && xs[m] <= x - 8) { const t = T[m], xm = xs[m]; if (t === t && xm >= F.near) { const sl = (t - xm * xm / R2 - need) / xm; if (sl > pm) pm = sl; } m++; }
    const g = GR[j]; OK[j] = ST[j] && g === g && (g + 1.6 - x * x / R2 - need) / x > pm + 3e-4 ? 1 : 0;
  }
  e = { OK, GR, c };
  F.cache.set(key, e); if (F.cache.size > 1500) F.cache.delete(F.cache.keys().next().value);
  return e;
}
const nearI = (Gd, x) => Math.max(0, Math.min(Gd.n - 1, Math.round(Math.log(x / 40) / LN)));
function lowerBound(xs, v){ let a = 0, b = xs.length; while (a < b) { const m = (a + b) >> 1; if (xs[m] < v) a = m + 1; else b = m; } return a; }
/* where along a whole-degree row the mark's altitude passes A (cross) or its range takes A in, a step or two
   either side: where on the exact bearing to look */
function bandOf(Gd, r, A, cross){
  const { n, ds, MK, MK2 } = Gd; let i0 = -1, i1 = -1;
  for (let i = 0; i < n; i++) {
    const k = r * n + i, m1 = MK[k]; if (m1 !== m1) continue; let hit;
    if (cross) { const m0 = i ? MK[k - 1] : NaN; hit = m0 === m0 && m0 >= A - 0.05 && m1 < A + 0.05; }
    else { const m2 = MK2 ? MK2[k] : NaN; hit = m2 === m2 && A >= Math.min(m1, m2) - 0.05 && A <= Math.max(m1, m2) + 0.05; }
    if (hit) { if (i0 < 0) i0 = i; i1 = i; }
  }
  return i0 < 0 ? null : [ds[Math.max(0, i0 - 2)], ds[Math.min(n - 1, i1 + 1)]];
}
/* the ten-minute test, with the field: could it line up anywhere on this row, before each minute is
   followed on its own bearing */
function maybe(Gd, az, A, lo, hi, acc, cross){
  const r = row(az + 180), b = bandOf(Gd, r, A, cross); if (!b) return false;
  const { n, ds, OK, SK } = Gd;
  for (let i = 0; i < n; i++) { const d = ds[i]; if (d < b[0] || d > b[1] || (lo && d < lo) || (hi && d > hi)) continue; const k = r * n + i; if (OK[k] && SK[k] <= A + 0.1 && (!acc || acc(k))) return true; }
  return false;
}

/* The loaded ground round the pin, once: every degree of bearing, out in 4 per cent steps to 25 km.
   For each place: whether you can stand there (known ground, not water, not inside a building or a
   wood), the altitude from there of the mark (the subject's top plus the gap, in metres or degrees),
   of the subject's top, whether that top is in sight, and the skyline beyond the pin.
   o: pin {lat, lon}, top (metres above sea level), gapM or gapDeg, surface(lat, lon), ground(lat, lon),
   water(lat, lon, g); and optionally obs (what stands above the ground, above) out to blockR from the
   pin, with need, the height that has to be in sight, and near, how far round the pin is the subject's
   own. With obs, places on the field are only candidates here: each moment is checked on its own exact
   bearing (fine), a few metres apart, against the buildings and trees. */
async function grid(o, stop){
  const NR = 360, ds = []; for (let d = 40; d <= (o.rMax || 25000); d *= 1.04) ds.push(d);
  const n = ds.length, N = NR * n, S = new Float32Array(N), G = new Float32Array(N), LA = new Float64Array(N), LO = new Float64Array(N);
  const FT = new Float32Array(N).fill(NaN), two = o.gapDeg2 != null || o.gapM2 != null, MK2 = two ? new Float32Array(N).fill(NaN) : null, MK = new Float32Array(N).fill(NaN), TP = new Float32Array(N).fill(NaN), SK = new Float32Array(N).fill(-90), OK = new Uint8Array(N);
  const F = o.obs ? await fieldOf(o, stop) : null; if (o.obs && !F) return null;
  let last = performance.now();
  for (let r = 0; r < NR; r++) {
    for (let i = 0; i < n; i++) {
      const k = r * n + i, q = dest(o.pin.lat, o.pin.lon, r, ds[i]); LA[k] = q.lat; LO[k] = q.lon;
      const s = o.surface(q.lat, q.lon), g = o.ground(q.lat, q.lon);
      S[k] = s == null ? NaN : s; G[k] = g == null ? S[k] : g;
    }
    if (performance.now() - last > 24) { if (stop && stop()) return null; await pause(); last = performance.now(); }
  }
  /* With the field: along each whole-degree row, the skyline beyond the pin (PK, the tallest thing in each
     stretch between places, taken at its near end) and, for places beyond the field, the steepest rise from
     the height that has to show to anything on it, then to the places' own heights (MS) */
  let MS = null, PK = null;
  const R2 = 2 * REFF;
  if (F) {
    MS = new Float32Array(N).fill(-1e9); PK = Float32Array.from(S);
    const xs = F.xs, NX = xs.length, need = F.need;
    for (let r = 0; r < NR; r++) {
      const { T } = along(F, o.pin, r); let pm = -1e9, j = 0;
      for (let m = 0; m < NX; m++) { const t = T[m]; if (t !== t) continue; const x = xs[m];
        while (j < n - 1 && ds[j] < x) j++; const kk = r * n + j; if (!(PK[kk] >= t)) PK[kk] = t;
        if (x >= F.near) { const sl = (t - x * x / R2 - need) / x; if (sl > pm) pm = sl; } }
      for (let i = 0; i < n; i++) { const d = ds[i]; if (d <= F.far) continue; let M = pm;
        for (let jj = 0; jj < i; jj++) { if (ds[jj] <= F.far || d - ds[jj] < 15) continue; const sj = S[r * n + jj]; if (sj === sj) { const sl = (sj - ds[jj] * ds[jj] / R2 - need) / ds[jj]; if (sl > M) M = sl; } }
        MS[r * n + i] = M; }
      if (performance.now() - last > 24) { if (stop && stop()) return null; await pause(); last = performance.now(); }
    }
  }
  for (let r = 0; r < NR; r++) {
    /* the subject's foot as seen from each place: a structure's own base, or for a summit the lowest ground in
       the part of the line nearer the subject (the nearer 60 per cent), so a dip at your feet is not its foot */
    const opp = (r + 180) % NR; let mn = Infinity, mnD = 0, jp = 0;
    for (let i = 0; i < n; i++) {
      const k = r * n + i, g = G[k], s = S[k], d = ds[i];
      while (jp < i && ds[jp] <= 0.6 * d) { const sj = S[r * n + jp]; if (sj === sj && sj < mn) { mn = sj; mnD = ds[jp]; } jp++; }
      if (!(g === g && s === s)) continue;
      const onF = F && d <= F.far, wet = o.water && o.water(LA[k], LO[k], g);
      if (!onF && (s - g > 2.5 || wet)) continue;
      const h0 = g + 1.6, aTop = elev(o.top, h0, d);
      TP[k] = aTop; MK[k] = o.gapDeg != null ? aTop + o.gapDeg : elev(o.top + (o.gapM || 0), h0, d);
      if (two) MK2[k] = o.gapDeg2 != null ? aTop + o.gapDeg2 : elev(o.top + o.gapM2, h0, d);
      /* on the field, only the bare ground (the buildings and trees come with the exact bearing); beyond it,
         everything on the field and the places' own heights; with no field, the loaded surface */
      let seen = true;
      if (onF) { if (wet) seen = false; else for (let j = i - 1; j >= 0 && seen; j--) { if (d - ds[j] < 15) continue; const gj = G[r * n + j]; if (gj === gj && elev(gj, h0, d - ds[j]) > aTop - 0.02) seen = false; } }
      else if (F) seen = (h0 - d * d / R2 - F.need) / d > MS[k] + 3e-4;
      else for (let j = i - 1; j >= 0 && seen; j--) { if (d - ds[j] < 15) continue; const sj = S[r * n + j]; if (sj === sj && elev(sj, h0, d - ds[j]) > aTop - 0.02) seen = false; }
      /* beyond the pin, the tallest thing in each stretch, taken at its near end */
      let sky = -90;
      for (let j = 0; j < n; j++) { const sj = PK ? PK[opp * n + j] : S[opp * n + j]; if (sj === sj) { const e = elev(sj, h0, d + (PK && j ? ds[j - 1] : ds[j])); if (e > sky) sky = e; } }
      SK[k] = sky; OK[k] = seen ? 1 : 0;
      FT[k] = o.foot != null ? elev(o.foot, h0, d) : mn < Infinity ? Math.min(aTop - 0.05, elev(mn, h0, Math.max(15, d - mnD))) : aTop - 0.5;
    }
    if (performance.now() - last > 24) { if (stop && stop()) return null; await pause(); last = performance.now(); }
  }
  return { NR, n, ds, LA, LO, MK, MK2, TP, SK, OK, FT, pin: o.pin, fine: F };
}
/* Where, on a bearing, the mark stands at altitude A: the nearest place out where it has dropped to A,
   if you can stand there, the top is in sight and the skyline beyond keeps below A. */
function solve(Gd, az, A, lo, hi, acc){
  const { n, ds, MK, OK, SK } = Gd, b = row(az + 180) * n;
  for (let i = 1; i < n; i++) {
    if (lo && ds[i] < lo) continue; if (hi && ds[i - 1] > hi) break;
    const m0 = MK[b + i - 1], m1 = MK[b + i];
    if (!(m0 === m0 && m1 === m1) || !(m0 >= A && m1 < A)) continue;
    const f = (m0 - A) / (m0 - m1), k = b + (f < 0.5 ? i - 1 : i);
    if (!OK[k] || SK[k] > A - 0.02 || (acc && !acc(k))) return null;
    const d = ds[i - 1] + f * (ds[i] - ds[i - 1]), q = dest(Gd.pin.lat, Gd.pin.lon, (az + 180) % 360, d);
    return { d, lat: q.lat, lon: q.lon };
  }
  return null;
}
/* With a range above the top: the stretch of a bearing where the mark's range takes in A, the longest
   unbroken run of places you can stand with the top in sight and the skyline beyond clear */
function span(Gd, az, A, lo, hi, acc){
  const { n, ds, MK, MK2, OK, SK } = Gd; if (!MK2) return null;
  const b = row(az + 180) * n; let best = null, cur = null;
  const better = q => !best || q.d1 / q.d0 > best.d1 / best.d0;
  for (let i = 0; i < n; i++) {
    const k = b + i, d = ds[i], m1 = MK[k], m2 = MK2[k];
    const ok = (!lo || d >= lo) && (!hi || d <= hi) && OK[k] && m1 === m1 && m2 === m2 && A >= Math.min(m1, m2) && A <= Math.max(m1, m2) && SK[k] <= A - 0.02 && (!acc || acc(k));
    if (ok) { if (!cur) cur = { d0: d, d1: d }; else cur.d1 = d; }
    else if (cur) { if (better(cur)) best = cur; cur = null; }
  }
  if (cur && better(cur)) best = cur;
  return best;
}
/* The stretch of a bearing you could stand on, for an alignment that holds at any distance (the Milky
   Way's arch, or its band rising out of the subject, which then has to stand clear of the skyline). */
function ray(Gd, az, needTop, lo, hi, acc){
  const { n, ds, OK, TP, SK } = Gd, b = row(az + 180) * n;
  let d0 = null, d1 = null;
  for (let i = 0; i < n; i++) { const k = b + i; if ((lo && ds[i] < lo) || (hi && ds[i] > hi) || (acc && !acc(k))) continue; if (!OK[k] || (needTop && !(TP[k] > SK[k] + 0.1))) continue; if (d0 == null) d0 = ds[i]; d1 = ds[i]; }
  return d0 == null ? null : { d0, d1 };
}

/* The same three on the exact bearing, with the field: every few metres, the place itself (open ground, the
   subject in sight past the buildings and trees) and the mark's altitude from it; the skyline beyond and the
   framing from the nearest place on the whole-degree row. acc(k, lat, lon) is asked with the spot itself.
   Past the field, the row's own places, as before. */
const markAt = (F, g, x, two) => { const o = F.o, h0 = g + 1.6, aT = elev(F.top, h0, x);
  return two ? (o.gapDeg2 != null ? aT + o.gapDeg2 : elev(F.top + o.gapM2, h0, x)) : (o.gapDeg != null ? aT + o.gapDeg : elev(F.top + (o.gapM || 0), h0, x)); };
function solveF(Gd, az, A, lo, hi, acc){
  const brg = (((az + 180) % 360) + 360) % 360, r = row(brg), F = Gd.fine, b = bandOf(Gd, r, A, true); if (!b) return null;
  const e = fine(Gd, brg), xs = F.xs, x1 = Math.min(b[1], hi || Infinity);
  let j = Math.max(1, lowerBound(xs, Math.max(b[0], lo || 0))), m0 = j - 1 < xs.length && e.GR[j - 1] === e.GR[j - 1] ? markAt(F, e.GR[j - 1], xs[j - 1], false) : NaN;
  for (; j < xs.length && xs[j] <= x1; j++) {
    const g = e.GR[j], m1 = g === g ? markAt(F, g, xs[j], false) : NaN;
    if (m0 === m0 && m1 === m1 && m0 >= A && m1 < A) {
      const f = (m0 - A) / (m0 - m1), jj = f < 0.5 ? j - 1 : j, k = r * Gd.n + nearI(Gd, xs[jj]);
      if (e.OK[jj] && Gd.SK[k] <= A - 0.02) { const p = e.c.at(xs[jj]);
        if (!acc || acc(k, p.lat, p.lon)) { const d = xs[j - 1] + f * (xs[j] - xs[j - 1]), q = e.c.at(d); return { d, lat: q.lat, lon: q.lon }; } }
    }
    m0 = m1;
  }
  return b[1] > F.far ? solve(Gd, az, A, Math.max(lo || 0, F.far), hi, acc) : null;
}
function spanF(Gd, az, A, lo, hi, acc){
  if (!Gd.MK2) return null;
  const brg = (((az + 180) % 360) + 360) % 360, r = row(brg), F = Gd.fine, b = bandOf(Gd, r, A, false); if (!b) return null;
  const e = fine(Gd, brg), xs = F.xs, x0 = Math.max(b[0], lo || 0), x1 = Math.min(b[1], hi || Infinity);
  let best = null, cur = null; const better = q => !best || q.d1 / q.d0 > best.d1 / best.d0, close = () => { if (cur && better(cur)) best = cur; cur = null; };
  for (let j = lowerBound(xs, x0); j < xs.length && xs[j] <= x1; j++) {
    const x = xs[j]; let ok = e.OK[j] === 1;
    if (ok) { const g = e.GR[j], m1 = markAt(F, g, x, false), m2 = markAt(F, g, x, true); ok = A >= Math.min(m1, m2) && A <= Math.max(m1, m2); }
    if (ok) { const k = r * Gd.n + nearI(Gd, x); ok = Gd.SK[k] <= A - 0.02; if (ok && acc) { const p = e.c.at(x); ok = acc(k, p.lat, p.lon); } }
    if (ok) { if (!cur) cur = { d0: x, d1: x }; else cur.d1 = x; } else close();
  }
  close();
  if (x1 > F.far) { const s = span(Gd, az, A, Math.max(x0, F.far), hi, acc); if (s && better(s)) best = s; }
  return best;
}
function rayF(Gd, az, needTop, lo, hi, acc){
  const brg = (((az + 180) % 360) + 360) % 360, r = row(brg), F = Gd.fine, e = fine(Gd, brg), xs = F.xs;
  let best = null, cur = null; const better = q => !best || q.d1 / q.d0 > best.d1 / best.d0, close = () => { if (cur && better(cur)) best = cur; cur = null; };
  for (let j = 0; j < xs.length; j++) {
    const x = xs[j]; let ok = (!lo || x >= lo) && (!hi || x <= hi) && e.OK[j] === 1;
    if (ok) { const k = r * Gd.n + nearI(Gd, x); ok = !needTop || Gd.TP[k] > Gd.SK[k] + 0.1; if (ok && acc) { const p = e.c.at(x); ok = acc(k, p.lat, p.lon); } }
    if (ok) { if (!cur) cur = { d0: x, d1: x }; else cur.d1 = x; } else close();
  }
  close();
  const s = ray(Gd, az, needTop, Math.max(lo || 0, F.far), hi, acc); if (s && better(s)) best = s;
  return best;
}
const solveX = (Gd, ...a) => Gd.fine ? solveF(Gd, ...a) : solve(Gd, ...a);
const spanX = (Gd, ...a) => Gd.fine ? spanF(Gd, ...a) : span(Gd, ...a);
const rayX = (Gd, ...a) => Gd.fine ? rayF(Gd, ...a) : ray(Gd, ...a);

/* Every moment in the coming days it works from somewhere: o.body(ms) -> { alt, az, sd } for a body,
   or o.aims(ms) -> [{ az, val, ok, br, needTop }] for the Milky Way; o.okAt(ms) -> extra facts, or
   null where the light or the phase rule it out; o.lo and o.hi, the distances from the pin allowed.
   With the field, a ten-minute moment that could work on its whole-degree row has the twenty minutes
   round it followed a minute at a time, each on its own exact bearing. */
async function moments(Gd, o, onStep, stop){
  const STEP = o.step || 600000, SUB = 60000, end = o.from + o.days * 86400000, out = [], fineOn = !!Gd.fine;
  const candsAt = t => o.cands ? o.cands(t) || [] : (() => { const b = o.body(t); return b ? [{ az: b.az, A: b.alt - b.sd, need: b.alt, alt: b.alt }] : []; })();
  const accFor = cd => o.accept ? (k, la, lo) => o.accept(k, cd, la, lo) : null;
  const oneAt = t => {
    for (const cd of candsAt(t)) {
      if (cd.alt + Math.max(0, cd.alt - cd.A) <= -0.5) continue;
      const s = o.span ? spanF(Gd, cd.az, cd.A, o.lo, o.hi, accFor(cd)) : solveF(Gd, cd.az, cd.A, o.lo, o.hi, accFor(cd));
      if (s) return { az: cd.az, alt: cd.alt, br: 0, d0: o.span ? s.d0 : s.d, d1: o.span ? s.d1 : s.d, off: cd.off || 0 };
    }
    return null; };
  let last = performance.now(), doneTo = -Infinity;
  for (let t = o.from; t <= end; t += STEP) {
    if (stop && stop()) return null;
    const hits = []; let cand = false;
    if (o.aims) {
      let ex;
      (o.aims(t) || []).forEach(a => { if (!a.ok) return; const acc = accFor(null); let s = ray(Gd, a.az, a.needTop, o.lo, o.hi, acc);
        if (s && fineOn) { if (ex === undefined) ex = o.okAt ? o.okAt(t) : {}; s = ex ? rayF(Gd, a.az, a.needTop, o.lo, o.hi, acc) : null; }
        if (s) hits.push({ az: a.az, val: a.val, br: a.br, d0: s.d0, d1: s.d1 }); });
    }
    else {
      /* the ways it could line up, best first: one for a disc, several across a big target */
      for (const cd of candsAt(t)) {
        if (cd.alt + Math.max(0, cd.alt - cd.A) <= -0.5) continue;
        const acc = accFor(cd);
        if (fineOn) { if (maybe(Gd, cd.az, cd.A, o.lo, o.hi, acc, !o.span)) { cand = true; break; } continue; }
        if (o.span) { const s = span(Gd, cd.az, cd.A, o.lo, o.hi, acc); if (s) { hits.push({ az: cd.az, alt: cd.alt, br: 0, d0: s.d0, d1: s.d1, off: cd.off || 0 }); break; } }
        else { const s = solve(Gd, cd.az, cd.A, o.lo, o.hi, acc); if (s) { hits.push({ az: cd.az, alt: cd.alt, br: 0, d0: s.d, d1: s.d, off: cd.off || 0 }); break; } }
      }
    }
    if (hits.length) { const ex = o.okAt ? o.okAt(t) : {}; if (ex) hits.forEach(h => out.push({ ms: t, ...h, ...ex })); }
    if (cand) {
      const to = Math.min(end, t + STEP);
      for (let u = Math.max(o.from, t - STEP, doneTo + SUB); u <= to; u += SUB) { const ex = o.okAt ? o.okAt(u) : {}; if (!ex) continue; const h = oneAt(u); if (h) out.push({ ms: u, ...h, ...ex }); }
      doneTo = to;
    }
    if (performance.now() - last > 24) { if (onStep) onStep((t - o.from) / (end - o.from), t); await pause(); last = performance.now(); }
  }
  return out;
}

window.NoctoFind = { grid, solve: solveX, span: spanX, ray: rayX, moments, dest, elev, wrap };
})();
