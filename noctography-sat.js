/* Noctography: satellite passes.
   A compact SGP4 propagator (near-Earth branch, which is what everything in low orbit needs),
   plus visibility logic: the satellite has to be in sunlight while you are in darkness.
   TLEs come from Celestrak. Nothing here talks to a server that computes passes for you: 
   the orbit is propagated on your device. */
"use strict";
(function () {
  if (window.NoctoSat) return;

  const pi = Math.PI, twopi = 2 * pi, deg2rad = pi / 180, rad2deg = 180 / pi;
  const RE = 6378.137, XKE = 0.07436685316871385, J2 = 0.00108262998905;
  const J3 = -0.00000253215306, J4 = -0.00000161098761, J3OJ2 = J3 / J2;
  const CK2 = 0.5 * J2, CK4 = -0.375 * J4, QOMS2T = 1.880279159015270e-9, S = 1.012229;

  /* ---------------- TLE ---------------- */
  function parseTle(l1, l2) {
    const num = (s, a, b) => parseFloat(s.substring(a, b));
    const expo = s => {
      s = s.trim();
      if (!s) return 0;
      const sign = s[0] === '-' ? -1 : 1;
      const body = s.replace(/^[+-]/, '');
      const m = body.match(/^(\d+)([+-]\d)$/);
      if (!m) return sign * parseFloat('0.' + body);
      return sign * parseFloat('0.' + m[1]) * Math.pow(10, parseInt(m[2], 10));
    };
    let yr = parseInt(l1.substring(18, 20), 10);
    yr += yr < 57 ? 2000 : 1900;
    const doy = num(l1, 20, 32);
    const epoch = new Date(Date.UTC(yr, 0, 1) + (doy - 1) * 86400000);
    return {
      satnum: l1.substring(2, 7).trim(),
      epoch,
      bstar: expo(l1.substring(53, 61)),
      inclo: num(l2, 8, 16) * deg2rad,
      nodeo: num(l2, 17, 25) * deg2rad,
      ecco: parseFloat('0.' + l2.substring(26, 33).trim()),
      argpo: num(l2, 34, 42) * deg2rad,
      mo: num(l2, 43, 51) * deg2rad,
      no: num(l2, 52, 63) * twopi / 1440,   // rad/min
    };
  }

  /* ---------------- SGP4 init ---------------- */
  function sgp4init(t) {
    const s = Object.assign({}, t);
    const cosio = Math.cos(s.inclo), sinio = Math.sin(s.inclo);
    const theta2 = cosio * cosio, x3thm1 = 3 * theta2 - 1;
    const eosq = s.ecco * s.ecco, betao2 = 1 - eosq, betao = Math.sqrt(betao2);

    // recover the original mean motion and semi-major axis from the Kozai element
    const a1 = Math.pow(XKE / s.no, 2 / 3);
    const del1 = 1.5 * CK2 * x3thm1 / (a1 * a1 * betao * betao2);
    const ao = a1 * (1 - del1 * (1 / 3 + del1 * (1 + 134 / 81 * del1)));
    const delo = 1.5 * CK2 * x3thm1 / (ao * ao * betao * betao2);
    const no = s.no / (1 + delo);
    const aodp = ao / (1 - delo);

    const perigee = (aodp * (1 - s.ecco) - 1) * RE;
    let sfour = S, qoms24 = QOMS2T;
    if (perigee < 156) {
      sfour = perigee - 78;
      if (perigee < 98) sfour = 20;
      qoms24 = Math.pow((120 - sfour) / RE, 4);
      sfour = sfour / RE + 1;
    }

    const pinvsq = 1 / (aodp * aodp * betao2 * betao2);
    const tsi = 1 / (aodp - sfour);
    const eta = aodp * s.ecco * tsi;
    const etasq = eta * eta, eeta = s.ecco * eta;
    const psisq = Math.abs(1 - etasq);
    const coef = qoms24 * Math.pow(tsi, 4);
    const coef1 = coef / Math.pow(psisq, 3.5);
    const c2 = coef1 * no * (aodp * (1 + 1.5 * etasq + eeta * (4 + etasq))
      + 0.75 * CK2 * tsi / psisq * x3thm1 * (8 + 3 * etasq * (8 + etasq)));
    const c1 = s.bstar * c2;
    const c3 = s.ecco > 1e-4 ? coef * tsi * J3OJ2 * no * sinio / s.ecco : 0;
    const x1mth2 = 1 - theta2;
    const c4 = 2 * no * coef1 * aodp * betao2 * (eta * (2 + 0.5 * etasq)
      + s.ecco * (0.5 + 2 * etasq)
      - 2 * CK2 * tsi / (aodp * psisq) * (-3 * x3thm1 * (1 - 2 * eeta + etasq * (1.5 - 0.5 * eeta))
        + 0.75 * x1mth2 * (2 * etasq - eeta * (1 + etasq)) * Math.cos(2 * s.argpo)));
    const c5 = 2 * coef1 * aodp * betao2 * (1 + 2.75 * (etasq + eeta) + eeta * etasq);

    const temp1 = 3 * CK2 * pinvsq * no;
    const temp2 = temp1 * CK2 * pinvsq;
    const temp3 = 1.25 * CK4 * pinvsq * pinvsq * no;
    const xmdot = no + 0.5 * temp1 * betao * x3thm1
      + 0.0625 * temp2 * betao * (13 - 78 * theta2 + 137 * theta2 * theta2);
    const x1m5th = 1 - 5 * theta2;
    const omgdot = -0.5 * temp1 * x1m5th + 0.0625 * temp2 * (7 - 114 * theta2 + 395 * theta2 * theta2)
      + temp3 * (3 - 36 * theta2 + 49 * theta2 * theta2);
    const xhdot1 = -temp1 * cosio;
    const xnodot = xhdot1 + (0.5 * temp2 * (4 - 19 * theta2) + 2 * temp3 * (3 - 7 * theta2)) * cosio;

    const isimp = (aodp * (1 - s.ecco) / 1) < (220 / RE + 1);
    let d2 = 0, d3 = 0, d4 = 0, t3cof = 0, t4cof = 0, t5cof = 0;
    const c1sq = c1 * c1;
    if (!isimp) {
      const temp = tsi / (aodp - sfour);
      d2 = 4 * aodp * tsi * c1sq;
      const temp5 = d2 * tsi * c1 / 3;
      d3 = (17 * aodp + sfour) * temp5;
      d4 = 0.5 * temp5 * aodp * tsi * (221 * aodp + 31 * sfour) * c1;
      t3cof = d2 + 2 * c1sq;
      t4cof = 0.25 * (3 * d3 + c1 * (12 * d2 + 10 * c1sq));
      t5cof = 0.2 * (3 * d4 + 12 * c1 * d3 + 6 * d2 * d2 + 15 * c1sq * (2 * d2 + c1sq));
    }

    Object.assign(s, {
      no, aodp, cosio, sinio, x3thm1, x1mth2, x1m5th, eta, etasq, eeta, betao, betao2,
      c1, c3, c4, c5, xmdot, omgdot, xnodot, xhdot1, isimp, d2, d3, d4, t3cof, t4cof, t5cof,
      xmcof: s.ecco > 1e-4 ? -2 / 3 * coef * s.bstar / eeta : 0,
      omgcof: s.bstar * c3 * Math.cos(s.argpo),
      xlcof: 0.125 * J3OJ2 * sinio * (3 + 5 * cosio) / (1 + cosio),
      aycof: 0.25 * J3OJ2 * sinio,
      delmo: Math.pow(1 + eta * Math.cos(s.mo), 3),
      sinmao: Math.sin(s.mo),
      t2cof: 1.5 * c1,
    });
    return s;
  }

  /* ---------------- SGP4 propagate, tsince in minutes ---------------- */
  function sgp4(s, tsince) {
    const xmdf = s.mo + s.xmdot * tsince;
    const omgadf = s.argpo + s.omgdot * tsince;
    const xnoddf = s.nodeo + s.xnodot * tsince;
    let omega = omgadf, xmp = xmdf;
    const tsq = tsince * tsince;
    const xnode = xnoddf + s.xhdot1 * tsq;
    let tempa = 1 - s.c1 * tsince;
    let tempe = s.bstar * s.c4 * tsince;
    let templ = s.t2cof * tsq;

    if (!s.isimp) {
      const delomg = s.omgcof * tsince;
      const delm = s.xmcof * (Math.pow(1 + s.eta * Math.cos(xmdf), 3) - s.delmo);
      const temp = delomg + delm;
      xmp = xmdf + temp;
      omega = omgadf - temp;
      const tcube = tsq * tsince, tfour = tsince * tcube;
      tempa = tempa - s.d2 * tsq - s.d3 * tcube - s.d4 * tfour;
      tempe = tempe + s.bstar * s.c5 * (Math.sin(xmp) - s.sinmao);
      templ = templ + s.t3cof * tcube + tfour * (s.t4cof + tsince * s.t5cof);
    }

    const a = s.aodp * tempa * tempa;
    const e = Math.max(1e-6, Math.min(0.999999, s.ecco - tempe));
    const xl = xmp + omega + xnode + s.no * templ;
    const beta = Math.sqrt(1 - e * e);
    const xn = XKE / Math.pow(a, 1.5);

    const axn = e * Math.cos(omega);
    const temp = 1 / (a * beta * beta);
    const xll = temp * s.xlcof * axn;
    const aynl = temp * s.aycof;
    const xlt = xl + xll;
    const ayn = e * Math.sin(omega) + aynl;

    // Kepler for the long-period-corrected mean longitude
    const capu = ((xlt - xnode) % twopi + twopi) % twopi;
    let epw = capu, sinepw = 0, cosepw = 0, ecose = 0, esine = 0;
    for (let i = 0; i < 12; i++) {
      sinepw = Math.sin(epw); cosepw = Math.cos(epw);
      ecose = axn * cosepw + ayn * sinepw;
      esine = axn * sinepw - ayn * cosepw;
      const f = capu - epw + esine;
      if (Math.abs(f) < 1e-12) break;
      const fdot = 1 - ecose;
      let delta = f / fdot;
      if (i === 0) delta = Math.max(-0.95, Math.min(0.95, delta));
      epw += delta;
    }

    const elsq = axn * axn + ayn * ayn;
    const pl = a * (1 - elsq);
    const r = a * (1 - ecose);
    const rdot = XKE * Math.sqrt(a) / r * esine;
    const rfdot = XKE * Math.sqrt(pl) / r;
    const betal = Math.sqrt(1 - elsq);
    const temp3 = esine / (1 + betal);
    const cosu = a / r * (cosepw - axn + ayn * temp3);
    const sinu = a / r * (sinepw - ayn - axn * temp3);
    const u = Math.atan2(sinu, cosu);
    const sin2u = 2 * sinu * cosu, cos2u = 1 - 2 * sinu * sinu;

    const t2 = CK2 / pl, t3 = t2 / pl;
    const rk = r * (1 - 1.5 * t3 * betal * s.x3thm1) + 0.5 * t2 * s.x1mth2 * cos2u;
    const uk = u - 0.25 * t3 * s.x1m5th * sin2u;
    const xnodek = xnode + 1.5 * t3 * s.cosio * sin2u;
    const xinck = s.inclo + 1.5 * t3 * s.cosio * s.sinio * cos2u;

    const sinuk = Math.sin(uk), cosuk = Math.cos(uk);
    const sinik = Math.sin(xinck), cosik = Math.cos(xinck);
    const sinnok = Math.sin(xnodek), cosnok = Math.cos(xnodek);
    const xmx = -sinnok * cosik, xmy = cosnok * cosik;
    const ux = xmx * sinuk + cosnok * cosuk;
    const uy = xmy * sinuk + sinnok * cosuk;
    const uz = sinik * sinuk;

    return { x: rk * ux * RE, y: rk * uy * RE, z: rk * uz * RE, r: rk * RE };
  }

  /* ---------------- time and frames ---------------- */
  function jdOf(d) { return d.getTime() / 86400000 + 2440587.5; }
  function gmst(d) {
    const T = (jdOf(d) - 2451545) / 36525;
    let g = 280.46061837 + 360.98564736629 * (jdOf(d) - 2451545) + 0.000387933 * T * T - T * T * T / 38710000;
    g = ((g % 360) + 360) % 360;
    return g * deg2rad;
  }
  function observerEci(latDeg, lonDeg, altKm, d) {
    const lat = latDeg * deg2rad, theta = gmst(d) + lonDeg * deg2rad;
    const f = 1 / 298.257223563, e2 = f * (2 - f);
    const c = RE / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
    const sq = c * (1 - e2);
    return {
      x: (c + altKm) * Math.cos(lat) * Math.cos(theta),
      y: (c + altKm) * Math.cos(lat) * Math.sin(theta),
      z: (sq + altKm) * Math.sin(lat),
      theta,
    };
  }
  function lookAngles(obs, sat, latDeg) {
    const lat = latDeg * deg2rad;
    const rx = sat.x - obs.x, ry = sat.y - obs.y, rz = sat.z - obs.z;
    const st = Math.sin(obs.theta), ct = Math.cos(obs.theta);
    const sl = Math.sin(lat), cl = Math.cos(lat);
    const top_s = sl * ct * rx + sl * st * ry - cl * rz;
    const top_e = -st * rx + ct * ry;
    const top_z = cl * ct * rx + cl * st * ry + sl * rz;
    const range = Math.sqrt(rx * rx + ry * ry + rz * rz);
    let az = Math.atan2(-top_e, top_s) + pi;
    return { az: ((az * rad2deg) % 360 + 360) % 360, el: Math.asin(top_z / range) * rad2deg, range };
  }
  /* Low-precision solar position in the same frame, good to about an arcminute. */
  function sunEci(d) {
    const jd = jdOf(d), n = jd - 2451545;
    const L = (280.460 + 0.9856474 * n) * deg2rad;
    const g = (357.528 + 0.9856003 * n) * deg2rad;
    const lam = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * deg2rad;
    const eps = (23.439 - 0.0000004 * n) * deg2rad;
    const R = (1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g)) * 149597870.7;
    return { x: R * Math.cos(lam), y: R * Math.cos(eps) * Math.sin(lam), z: R * Math.sin(eps) * Math.sin(lam) };
  }
  /* Is the satellite in sunlight? Cylindrical Earth shadow is plenty for pass prediction. */
  function sunlit(sat, sun) {
    const sm = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z);
    const ux = sun.x / sm, uy = sun.y / sm, uz = sun.z / sm;
    const proj = sat.x * ux + sat.y * uy + sat.z * uz;
    if (proj > 0) return true;                       // sunward side, always lit
    const px = sat.x - proj * ux, py = sat.y - proj * uy, pz = sat.z - proj * uz;
    return Math.sqrt(px * px + py * py + pz * pz) > RE;
  }
  function sunElevation(d, lat, lon) {
    const obs = observerEci(lat, lon, 0, d);
    return lookAngles(obs, sunEci(d), lat).el;
  }

  /* Standard magnitude model: intrinsic brightness at 1000 km, corrected for range
     and for how much of the lit face is turned towards you. */
  function magnitude(intrinsic, rangeKm, phaseRad) {
    const term = (1 - phaseRad / pi) * Math.cos(phaseRad) + Math.sin(phaseRad) / pi;
    return intrinsic - 15.75 + 2.5 * Math.log10(rangeKm * rangeKm / Math.max(term, 1e-4));
  }

  /* ---------------- pass finding ---------------- */
  function findPasses(rec, lat, lon, from, to, opts) {
    opts = opts || {};
    const stepMs = (opts.stepSec || 30) * 1000;
    const minEl = opts.minEl != null ? opts.minEl : 10;
    const intrinsic = opts.intrinsic != null ? opts.intrinsic : -1.8;
    const sunMax = opts.sunMax != null ? opts.sunMax : -6;   // observer must be in twilight or darker
    const passes = [];
    let cur = null;

    for (let ms = from.getTime(); ms <= to.getTime(); ms += stepMs) {
      const d = new Date(ms);
      const sat = sgp4(rec, (ms - rec.epoch.getTime()) / 60000);
      if (!isFinite(sat.x)) continue;
      const obs = observerEci(lat, lon, 0, d);
      const la = lookAngles(obs, sat, lat);
      const visible = la.el >= minEl && sunlit(sat, sunEci(d)) && sunElevation(d, lat, lon) <= sunMax;

      if (visible) {
        const sun = sunEci(d);
        const sx = sun.x - sat.x, sy = sun.y - sat.y, sz = sun.z - sat.z;
        const ox = obs.x - sat.x, oy = obs.y - sat.y, oz = obs.z - sat.z;
        const sm = Math.sqrt(sx * sx + sy * sy + sz * sz), om = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const phase = Math.acos(Math.max(-1, Math.min(1, (sx * ox + sy * oy + sz * oz) / (sm * om))));
        const mag = magnitude(intrinsic, la.range, phase);
        if (!cur) cur = { start: d, startAz: la.az, peak: { el: -90 }, points: 0 };
        cur.points++;
        cur.end = d; cur.endAz = la.az;
        if (la.el > cur.peak.el) cur.peak = { t: d, el: la.el, az: la.az, range: la.range, mag };
        if (cur.brightest == null || mag < cur.brightest) cur.brightest = mag;
      } else if (cur) {
        if (cur.points > 1) passes.push(cur);
        cur = null;
      }
    }
    if (cur && cur.points > 1) passes.push(cur);
    return passes.map(p => ({
      start: p.start, end: p.end, startAz: p.startAz, endAz: p.endAz,
      maxEl: p.peak.el, maxAt: p.peak.t, maxAz: p.peak.az, range: p.peak.range,
      mag: p.brightest,
      minutes: (p.end - p.start) / 60000,
    }));
  }

  async function fetchTle(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('tle ' + r.status);
    const lines = (await r.text()).split(/\r?\n/).filter(l => l.trim().length);
    const out = [];
    for (let i = 0; i + 2 < lines.length + 1; i += 3) {
      if (!lines[i + 1] || !lines[i + 2]) break;
      if (lines[i + 1][0] !== '1' || lines[i + 2][0] !== '2') { i -= 2; continue; }
      out.push({ name: lines[i].trim(), l1: lines[i + 1], l2: lines[i + 2] });
    }
    return out;
  }

  window.NoctoSat = { parseTle, sgp4init, sgp4, findPasses, fetchTle, lookAngles, observerEci, sunEci, sunElevation, magnitude };
})();
