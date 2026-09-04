/* Noctography planning maths: the kit profile, star trail recipes and sessions, and the sky
   elements catalogue with its ranking. All of it is closed-form arithmetic on data the app
   already holds, and all of it leans on NoctoEngine for coordinates and night slots. */
"use strict";
(function(){
if (window.NoctoPlan) return;
const E = () => window.NoctoEngine;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SIDEREAL = 15.041;   // degrees per hour: the real figure, not the round one

/* ============================ kit profile ============================ */

const SENSORS = {
  ff:   { w: 36.0, h: 24.0, crop: 1.00, label: 'full frame' },
  aps:  { w: 23.5, h: 15.7, crop: 1.53, label: 'APS-C' },
  apsc: { w: 22.3, h: 14.9, crop: 1.61, label: 'APS-C Canon' },
  mft:  { w: 17.3, h: 13.0, crop: 2.00, label: 'Micro 4/3' },
};
const DEFAULT_KIT = { sensor: 'ff', mp: 24, focal: 20, aperture: 2.8, orient: 'land', tol: 'sharp' };
const KIT_KEY = 'nocto-kit-v1';

function loadKit(){
  try {
    const raw = localStorage.getItem(KIT_KEY);
    if (!raw) return Object.assign({}, DEFAULT_KIT);
    const k = JSON.parse(raw);
    return Object.assign({}, DEFAULT_KIT, k && typeof k === 'object' ? k : {});
  } catch (e) { return Object.assign({}, DEFAULT_KIT); }
}
function saveKit(k){ try { localStorage.setItem(KIT_KEY, JSON.stringify(k)); } catch (e) {} }

/* Pixel pitch from megapixels and sensor width, assuming the sensor's own aspect ratio. */
function kitDerived(k){
  const s = SENSORS[k.sensor] || SENSORS.ff;
  const aspect = s.w / s.h;
  const pxW = Math.sqrt(k.mp * 1e6 * aspect);
  const pitch = (s.w / pxW) * 1000;
  const fovW = 2 * Math.atan(s.w / (2 * k.focal)) * R2D;
  const fovH = 2 * Math.atan(s.h / (2 * k.focal)) * R2D;
  const port = k.orient === 'port';
  const across = port ? fovH : fovW;      // the frame's horizontal field as held
  const down   = port ? fovW : fovH;
  const npf = (35 * k.aperture + 30 * pitch) / k.focal;
  const rule500 = 500 / (k.focal * s.crop);
  return { sensor: s, pitch, fovW, fovH, across, down, npf, rule500,
           label: k.focal + 'mm \u00b7 f/' + k.aperture + ' \u00b7 ' + k.mp + ' MP ' + s.label };
}

/* The generic rules assume a star on the celestial equator. Trailing scales with cos(dec), so
   once the app knows where the camera is pointed it can quote the real limit instead. */
function fastestDecInFrame(altDeg, azDeg, lat, across, down){
  const eng = E();
  if (!eng || altDeg == null) return 0;
  // sample the frame corners and centre, keep the declination closest to the equator
  let best = 90;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){
    const a = clamp(altDeg + j * down / 2, -5, 89.5);
    const z = azDeg + i * across / 2 / Math.max(0.2, Math.cos(a * D2R));
    const dec = Math.asin(clamp(Math.sin(a * D2R) * Math.sin(lat * D2R)
      + Math.cos(a * D2R) * Math.cos(lat * D2R) * Math.cos(z * D2R), -1, 1)) * R2D;
    if (Math.abs(dec) < Math.abs(best)) best = dec;
  }
  return best;
}
function maxExposure(k, aim, lat){
  const d = kitDerived(k);
  const dec = aim ? fastestDecInFrame(aim.alt, aim.az, lat, d.across, d.down) : 0;
  const gain = 1 / Math.max(0.08, Math.cos(dec * D2R));
  const base = d.npf * (k.tol === 'relax' ? 2 : 1);
  return { secs: base * gain, worst: base, gain, dec, rule500: d.rule500 };
}
/* Trail length as a fraction of the frame, and its inverse. */
function trailFraction(k, hours, dec){
  const d = kitDerived(k);
  return (SIDEREAL * Math.cos((dec || 0) * D2R) * hours) / d.across;
}
function hoursForFraction(k, frac, dec){
  const d = kitDerived(k);
  return (frac * d.across) / (SIDEREAL * Math.cos((dec || 0) * D2R));
}

/* ============================ star trail recipes ============================ */

function trailRecipes(lat){
  const north = lat >= 0, a = Math.abs(lat);
  const poleAz = north ? 0 : 180, poleWord = north ? 'north' : 'south';
  return [
    { id: 'circles', name: 'Circles', kind: 'circumpolar',
      aim: { az: poleAz, alt: a, label: 'Due ' + poleWord },
      hook: 'Concentric rings around the pole. The one everybody recognises.',
      detail: north
        ? 'Point due north and the rings close on the pole. Polaris sits within a degree of it, so if you can see the star you have found the centre.'
        : 'Point due south and the rings close on the pole. There is no bright south pole star, so the overlay marks the spot for you.',
      looks: [ { h: 1, word: 'subtle' }, { h: 2.5, word: 'the classic' }, { h: 4, word: 'bold' } ],
      span: 'How long, and how much circle',
      icon: [['M29.2 21 A6 6 0 1 1 24 18', 1], ['M33.5 18.5 A11 11 0 1 1 24 13', 0.6],
             ['M37.9 16 A16 16 0 1 1 24 8', 0.32], ['M24 24 h0.01', 1]] },
    { id: 'fan', name: 'The fan', kind: 'due east or due west',
      aim: { az: 90, alt: 30, label: 'Due east or due west' },
      hook: 'One dead-straight trail with the rest flaring away from it, opposite ways above and below.',
      detail: 'Face the point where stars rise or set and the celestial equator draws a dead-straight line, leaning at ' + Math.round(90 - a) + '\u00b0 from here, which is 90\u00b0 minus your latitude. Everything north of it bows one way and everything south of it bows the other: each trail runs closest to that line in the middle of the frame and flares away from it towards the corners, which is what makes the fan.',
      looks: [ { h: 1, word: 'short strokes' }, { h: 2, word: 'the usual' }, { h: 3, word: 'long' } ],
      span: 'How long, and how far they flare',
      icon: [['M12 38 L38 15', 1],
             ['M5.7 26.3 Q23 24.3 27.2 7.3', 0.6],
             ['M22.9 45.7 Q27 28.7 44.3 26.7', 0.6]] },
    { id: 'arches', name: 'Arches', kind: 'facing away from the pole',
      aim: { az: north ? 180 : 0, alt: Math.max(18, Math.round((90 - a) * 0.7)),
             label: 'Due ' + (north ? 'south' : 'north') },
      hook: 'Nested arches over the landscape, every one peaking due ' + (north ? 'south' : 'north') + '.',
      detail: 'Turn your back on the pole and every trail arches, rising in the east of the frame and falling in the west, each peaking as it crosses due ' + (north ? 'south' : 'north') + '. The higher the star, the higher its arch, so they nest inside one another and the whole sky reads as a set of curves over your foreground.',
      looks: [ { h: 1, word: 'gentle' }, { h: 2, word: 'the usual' }, { h: 3, word: 'strong' } ],
      span: 'How long, and how much arch',
      icon: [['M4 38 H44', 0.4], ['M7 34 Q24 11 41 34', 1], ['M12 34 Q24 20 36 34', 0.45]] },
  ];
}

const arcAngle = hours => SIDEREAL * hours;

/* A trails session is a long one, so it is checked against the whole night rather than its
   first minute: darkness, moon, cloud, dew and any bright pass that will cross the stack. */
function session(t, kit, opts){
  const startMs = opts.startMs, hours = opts.hours, exp = opts.exp || 30, gap = opts.gap || 1;
  const endMs = startMs + hours * 3600000;
  const flags = [];
  const dark = t.darkWin;
  const hhmm = d => E().fmtTime(new Date(d));

  if (dark){
    const dawn = dark.to.getTime();
    const spare = Math.round((dawn - endMs) / 60000);
    if (spare < 0) flags.push({ tone: 'warn', text: 'Runs ' + Math.abs(spare) + ' minutes past the end of the dark window at ' + hhmm(dawn) + '. Twilight will lift the last frames: stop early or start earlier.' });
    else if (spare < 30) flags.push({ tone: 'warn', text: 'Ends ' + hhmm(endMs) + ', barely inside the dark window. The last frames will be catching the first of the twilight.' });
    else flags.push({ tone: 'good', text: 'Ends ' + hhmm(endMs) + ', with ' + Math.floor(spare / 60) + ' h ' + String(spare % 60).padStart(2, '0') + ' of dark still to spare.' });
  }

  const ms = t.moonSet ? t.moonSet.getTime() : null;
  const mr = t.moonRise ? t.moonRise.getTime() : null;
  const illum = Math.round((t.midIllum || 0) * 100);
  if (ms && ms > startMs && ms < endMs)
    flags.push({ tone: 'note', text: 'The moon sets at ' + hhmm(ms) + ', mid-stack. The early frames get a lit foreground and the late ones a darker sky. For trails that is a gift, not a problem.' });
  else if (mr && mr > startMs && mr < endMs)
    flags.push({ tone: 'note', text: 'The moon rises at ' + hhmm(mr) + ', part way through. Expect the ground to brighten and the sky to lose its faintest stars.' });
  else if (illum > 25 && (!ms || ms > endMs) && (!mr || mr < startMs))
    flags.push({ tone: 'note', text: 'The moon is up for all of it at ' + illum + '%, lighting the foreground. Trails are the one genre that thanks you for that.' });

  // cloud through the session, not just at the start
  const inWin = (t.night.slots || []).filter(s => s.t.getTime() >= startMs && s.t.getTime() <= endMs && s.cloud);
  if (inWin.length){
    const cf = inWin.map(s => { const c = E().clearFraction(s.cloud); return c == null ? 0.75 : c; });
    const mean = cf.reduce((a, b) => a + b, 0) / cf.length;
    const worstIdx = cf.indexOf(Math.min.apply(null, cf));
    const worst = Math.round((1 - cf[worstIdx]) * 100);
    if (mean > 0.8) flags.push({ tone: 'good', text: 'Cloud stays under ' + Math.max(10, Math.round((1 - Math.min.apply(null, cf)) * 100)) + '% for the whole session.' });
    else if (mean > 0.5) flags.push({ tone: 'note', text: 'Cloud thickens to ' + worst + '% around ' + hhmm(inWin[worstIdx].t) + '. Some frames will thin out: keep shooting and drop them later.' });
    else flags.push({ tone: 'warn', text: 'Cloud averages ' + Math.round((1 - mean) * 100) + '% across the session. A stack full of holes isn\u0027t especially pleasing to the eye.' });
  }

  const nt = t.night || {};
  const dewGap = nt.dewGap != null ? nt.dewGap : (t.fog && t.fog.gap != null ? t.fog.gap : null);
  const dewAt = nt.dewAt || (t.fog && t.fog.t ? t.fog.t : null);
  if (dewGap != null && dewGap < 3)
    flags.push({ tone: dewGap < 1.5 ? 'warn' : 'note',
      text: 'Down to ' + dewGap.toFixed(1) + '\u00b0 off the dew point' + (dewAt ? ' by ' + hhmm(dewAt) : '')
        + '. Dew strap on at the start, not when the lens fogs.' });
  else if (dewGap != null)
    flags.push({ tone: 'good', text: 'Dry enough for a long stack, ' + dewGap.toFixed(1) + '\u00b0 off the dew point at its closest.' });

  const moon = moonVsFrame(kit, opts.aim, startMs, endMs, opts.lat, opts.lon);
  if (moon && moon.inside){
    const setsAfter = ms && ms > moon.inside.t.getTime() ? ms : null;
    flags.push({ tone: 'warn', text: 'The moon is inside the frame from ' + hhmm(moon.inside.t)
      + ' at ' + Math.round(moon.inside.illum * 100) + '%. A moon trail across a star trail cannot be fixed afterwards: if you don\u0027t want it, reframe'
      + (setsAfter ? ', or start after it sets at ' + hhmm(setsAfter) + '.' : '.') });
  } else if (moon && moon.closest && moon.closest.units < 1.7 && moon.closest.illum > 0.2){
    flags.push({ tone: 'note', text: 'The moon passes about ' + Math.round(moon.closest.edgeDeg)
      + '\u00b0 outside the frame edge at ' + hhmm(moon.closest.t) + '. Nothing in shot, but flare is likely: hood on, and check the corners of the first frame.' });
  } else if (!opts.aim && illum > 30 && (!ms || ms > startMs)){
    flags.push({ tone: 'note', text: 'The moon is up at ' + illum + '%. Wherever you point, keep it out of the frame: a moon trail across a star trail cannot be fixed.' });
  }

  const frames = Math.max(1, Math.round(hours * 3600 / (exp + gap)));
  return { endMs, flags, frames, exp, gap, arc: arcAngle(hours), moon };
}

/* A moon trail across a star trail cannot be retouched out, so where the moon will be matters
   more here than how bright it is. At high declination it reaches into a circumpolar frame too,
   which is the case people do not expect. */
function moonVsFrame(kit, aim, startMs, endMs, lat, lon){
  const eng = E();
  if (!eng || !aim) return null;
  const d = kitDerived(kit);
  const halfA = d.across / 2, halfD = d.down / 2;
  let inside = null, closest = null;
  for (let ms = startMs; ms <= endMs; ms += 6 * 60000){
    const date = new Date(ms), jd = eng.jdFrom(date), lst = eng.lstOf(jd, lon);
    const m = eng.moonPos(jd), p = eng.eq2horiz(m.ra, m.dec, lat, lst);
    if (p.alt < -1) continue;
    const dz = ((p.az - aim.az + 540) % 360) - 180;
    const dAz = dz * Math.cos(p.alt * D2R), dAlt = p.alt - aim.alt;
    // in half-frame units: 1.0 is exactly the edge of the frame
    const units = Math.max(Math.abs(dAz) / halfA, Math.abs(dAlt) / halfD);
    const edgeDeg = Math.max(Math.abs(dAz) - halfA, Math.abs(dAlt) - halfD);
    if (!closest || units < closest.units)
      closest = { units, edgeDeg, t: date, illum: eng.moonIllum(jd).frac, alt: p.alt, az: p.az };
    if (units <= 1 && !inside)
      inside = { t: date, illum: eng.moonIllum(jd).frac, alt: p.alt, az: p.az };
  }
  return { inside, closest };
}

/* Given how long the shutter can stay open before stars trail within one frame, the same run of
   frames is also a timelapse: 24 frames make one second of it. */
function timelapse(kit, aim, lat, hours, filmSecs){
  const fps = 24;
  const frames = Math.max(fps, Math.round(fps * filmSecs));
  const interval = (hours * 3600) / frames;
  const gap = interval >= 20 ? 2 : 1;
  const exp = Math.max(1, interval - gap);
  const clean = maxExposure(kit, aim, lat).secs;
  // the film length that lands exactly on the clean-exposure limit
  const cleanFrames = (hours * 3600) / (clean + (clean + 2 >= 20 ? 2 : 1));
  return { fps, frames, interval, gap, exp, clean,
           cleanFilm: cleanFrames / fps,
           trailsInFrame: exp > clean * 1.15 };
}


/* ============================ sky elements ============================ */

/* ra/dec in degrees, ext is the subject's angular extent, need: how dark it wants (1 tolerant,
   3 very dark). minAlt is the height no part of the subject may drop below, measured at its LOWER
   EDGE, so the centre has to be ext/2 higher again. hemi: 0 both, 1 north only, -1 south only.
   Edit this table through exports/sky-elements.csv rather than by hand. */
const ELEMENTS = [
  { id: 'core', name: 'Milky Way core', ra: 266.4, dec: -28.9, ext: 30, need: 3, minAlt: 0, fl: '14–35mm', elong: 1.8, hemi: 0,
    hook: 'Sagittarius and Scorpius, the bright heart of it all.',
    lines: ['The brightest, busiest part of our galaxy, and the reason most people start shooting the night sky.',
            'It wants a genuinely dark sky and ideally no moon, but it tolerates some moonlight. From mid-northern latitudes it never gets far off the horizon, so it also wants a clean southern view.'] },
  { id: 'rift', name: 'The Great Rift', ra: 290, dec: 10, ext: 60, need: 3, minAlt: 5, fl: '14–24mm', elong: 4, hemi: 0,
    hook: 'The dark lane from Aquila to Cygnus, as the subject.',
    lines: ['Dust in the plane of the galaxy, seen as a river of black splitting the Milky Way in two.',
            'A seriously underrated part of the Milky Way and much easier to shoot from mid-northern latitudes as it\'s higher. Lots of detail to reward you.'] },
  { id: 'cygnus', name: 'Cygnus region', ra: 305.5, dec: 40.5, ext: 18, need: 2, minAlt: 5, fl: '24–85mm', elong: 1.6, hemi: 1,
    hook: 'Rich star fields, dust, and glorious nebulosity.',
    lines: ['The Milky Way runs through Cygnus at its dustiest, from Deneb down through Sadr to the Rift splitting it in two.',
            'Dark skies or an astro-modified camera reveal the North America nebula and the rich Sadr region - reds and pinks that look fantastic.'] },
  { id: 'casper', name: 'Cassiopeia and Perseus', ra: 30, dec: 58, ext: 25, need: 2, minAlt: 20, fl: '24–50mm', elong: 1.6, hemi: 1,
    hook: 'The autumn workhorse, with the Double Cluster in the middle.',
    lines: ['A W of bright stars, the Double Cluster between them, and the Heart and Soul nebulae for anyone shooting modified.',
            'Circumpolar from most of the northern hemisphere, so it is available every clear night of the year: high in autumn, low in spring. Rewards starglow or mist filters.'] },
  { id: 'orion', name: 'Orion', ra: 83.5, dec: 0, ext: 20, need: 1, minAlt: 5, fl: '20–85mm', elong: 1.2, hemi: 0,
    hook: 'The one constellation everybody can name, and it survives a moon.',
    lines: ['The Belt, the Sword and the Great Nebula in one frame, bright enough to shoot from a town garden and rich enough to reward a dark site.',
            'It straddles the celestial equator, so it is the winter subject in the north and the summer one in the south, standing on its head and climbing much higher down there.'] },
  { id: 'taurus', name: 'Taurus', ra: 66, dec: 18, ext: 25, need: 1, minAlt: 10, fl: '24–50mm', elong: 1.5, hemi: 1,
    hook: 'Aldebaran, the Hyades and the winter Milky Way running behind them.',
    lines: ['A wide, easy field: the V of the Hyades, an orange first-magnitude star at one corner and the Pleiades just off the shoulder.',
            'Bright enough for a compromised sky, and the dusty background comes through as soon as you get somewhere dark.'] },
  { id: 'pleiades', name: 'Pleiades and Hyades', ra: 60, dec: 19, ext: 10, need: 1, minAlt: 10, fl: '50–135mm', elong: 1.4, hemi: 1,
    hook: 'The gateway to longer lenses.',
    lines: ['Two clusters close enough together to just about share a frame at 85mm, and bright enough that moonlight barely touches them.',
            'A great intro into deepscape photography. Longer tracked exposures reveal the reflection nebulosity and the dusty background.'] },
  { id: 'm31', name: 'Andromeda over a foreground', ra: 10.7, dec: 41.3, ext: 3, need: 3, minAlt: 5, fl: '35–135mm', elong: 1, hemi: 1,
    hook: 'Our neighbouring twin city.',
    lines: ['Two and a half million light years away, and the furthest thing you can see with the naked eye.',
            'Small in frame. A bit lost in widefield but great for deepscapes with longer lenses.'] },
  { id: 'rho', name: 'Rho Ophiuchi', ra: 246.8, dec: -24.5, ext: 15, need: 3, minAlt: 5, fl: '35–85mm', elong: 1.2, hemi: 0,
    hook: 'The most colourful field in the sky.',
    lines: ['Antares, gold and rust dust clouds, and blue reflection nebulae all in one frame.',
            'It wants a very dark, moonless sky, and from northern Europe it barely clears the roofs. It\'s just magnificent.'] },
  { id: 'triangle', name: 'The Summer Triangle', ra: 295, dec: 33, ext: 40, need: 1, minAlt: 10, fl: '14–24mm', elong: 1.2, hemi: 1,
    hook: 'Three bright stars anyone can find.',
    lines: ['Vega, Deneb and Altair, with the Milky Way running straight through the middle of them.',
            'The friendliest wide-angle framing there is, and it holds up in a compromised sky. Darker skies reveal the Milky Way goodness.'] },
  { id: 'plough', name: 'The Plough', ra: 180, dec: 55, ext: 25, need: 1, minAlt: 10, fl: '24–50mm', elong: 1, hemi: 1,
    hook: 'The everyone-knows-it shot.',
    lines: ['Seven stars that survive town light, a full moon and a thin layer of cloud.',
            'Low over a northern foreground on autumn evenings, high overhead by spring. High cloud, starglow or fog filters make it pop.'] },
  { id: 'zodiacal', name: 'Zodiacal light', ra: null, dec: null, ext: 30, need: 3, minAlt: 5, fl: '14–24mm', elong: 2.2, hemi: 0,
    hook: 'Sunlight off dust in the plane of the solar system.',
    lines: ['A tall, faint cone leaning off the horizon after evening twilight in spring, or before dawn twilight in autumn.',
            'It needs a very dark sky, no moon at all, and the right season. Most people have never knowingly seen it.'] },
  { id: 'carina', name: 'The Carina Nebula', ra: 161.3, dec: -59.7, ext: 12, need: 2, minAlt: 10, fl: '35–85mm', elong: 1.4, hemi: -1,
    hook: 'Brighter and bigger than Orion, and the north never sees it.',
    lines: ['A vast star-forming region, easily naked-eye from a dark southern site.',
            'It sits in one of the richest stretches of the whole Milky Way.'] },
  { id: 'crux', name: 'Crux and the Coalsack', ra: 187, dec: -60, ext: 15, need: 1, minAlt: 10, fl: '24–50mm', elong: 1, hemi: -1,
    hook: 'The southern Cassiopeia: instantly recognisable.',
    lines: ['The Southern Cross, the Pointers, and a black hole of dust beside them.',
            'Bright enough to work under a moon and in a compromised sky.'] },
  { id: 'lmc', name: 'Large Magellanic Cloud', ra: 80.9, dec: -69.8, ext: 8, need: 2, minAlt: 10, fl: '24–85mm', elong: 1, hemi: -1,
    hook: 'A whole satellite galaxy, naked eye.',
    lines: ['A detached piece of Milky Way to the eye, and a companion galaxy in truth.',
            'There is no northern equivalent. Nothing in the northern sky comes close.'] },
  { id: 'smc', name: 'Small Magellanic Cloud', ra: 13.2, dec: -72.8, ext: 4, need: 2, minAlt: 10, fl: '35–135mm', elong: 1, hemi: -1,
    hook: 'With 47 Tucanae beside it, for free.',
    lines: ['The smaller companion galaxy, with one of the finest globular clusters in the sky right next to it.',
            'Both fit a single frame at 85mm.'] },
];

/* The arch entries are geometry, not season dates: an arch is framable when the galactic
   equator crosses the meridian somewhere photogenic, between about 20 and 60 degrees up. */
const GAL_POLE_RA = 192.86, GAL_POLE_DEC = 27.13;
function archAltAt(date, lat, lon){
  const eng = E();
  const jd = eng.jdFrom(date), lst = eng.lstOf(jd, lon);
  const p = eng.eq2horiz(GAL_POLE_RA, GAL_POLE_DEC, lat, lst);
  // the galactic equator's highest point on the meridian is 90 minus the pole's altitude
  return 90 - Math.abs(p.alt);
}
function archWindows(night, lat, lon){
  const slots = (night.slots || []).filter(s => s.sunAlt < -15);
  const out = [];
  let run = null;
  slots.forEach(s => {
    const alt = archAltAt(s.t, lat, lon);
    const ok = alt >= 20 && alt <= 60 && (s.moonAlt < 5 || s.illum < 0.25);
    if (ok && !run) run = { from: s.t, to: s.t, alt };
    else if (ok) { run.to = s.t; run.alt = Math.max(run.alt, alt); }
    else if (run) { out.push(run); run = null; }
  });
  if (run) out.push(run);
  return out.filter(w => (w.to - w.from) >= 45 * 60000);
}

/* Nightscape framing is not observing. Too low and the subject sits in haze and town glow; too
   high and it cannot share a frame with a foreground at all. The lower bound is the table's own
   minAlt, taken literally so the CSV is the single source of truth; the upper bound comes from the
   lens and the orientation, which is why a wide lens held portrait genuinely does raise it.
   Altitudes here are the subject's LOWER EDGE, not its centre: minAlt is the height no part of it
   may drop below, so a 60\u00b0-wide subject needs its centre 30\u00b0 higher again. */
function framingBand(el, down){
  const low = el.minAlt;
  const high = Math.max(low + 10, Math.min(72, down * 0.75));
  return { low, high };
}
function framingFactor(alt, band){
  if (alt <= band.low - 14) return 0;
  if (alt < band.low) return 0.15 + 0.55 * (alt - (band.low - 14)) / 14;
  if (alt <= band.high) return 1;
  return clamp(1 - (alt - band.high) / 34, 0.12, 1);
}

function moonPenalty(need, sepDeg, illum, moonAlt){
  if (moonAlt < -2 || illum < 0.02) return 1;
  const strength = illum * clamp((moonAlt + 5) / 40, 0, 1);
  const nearness = clamp(1 - sepDeg / 120, 0, 1);
  const sensitivity = need === 3 ? 1 : need === 2 ? 0.6 : 0.3;
  return clamp(1 - strength * (0.35 + 0.65 * nearness) * sensitivity, 0.05, 1);
}

/* One pass over the dark hours per element: highest useful altitude, what the moon and the
   cloud are doing in that direction at that time, and whether the sky is dark enough for it. */
function rankTonight(t, lat, lon, sky, kit){
  const eng = E();
  const slots = (t.night.slots || []).filter(s => s.sunAlt < -15);
  if (!slots.length) return { picks: [], out: [], none: true };
  const bortle = sky ? sky.bortle : 5;
  const hemi = lat >= 0 ? 1 : -1;
  const down = kitDerived(kit || DEFAULT_KIT).down;

  const scored = ELEMENTS.map(el => {
    let best = null, riseT = null;
    const band = framingBand(el, down);
    const curve = [];
    slots.forEach(s => {
      const jd = eng.jdFrom(s.t), lst = eng.lstOf(jd, lon);
      let pos;
      if (el.id === 'zodiacal'){
        // the ecliptic where it meets the horizon: use the anti-solar/solar point on the ecliptic
        const sun = eng.sunPos(jd);
        const lam = eng.norm(sun.lam + 180);
        const eps = 23.44;
        const ra = eng.norm(Math.atan2(Math.sin(lam * D2R) * Math.cos(eps * D2R), Math.cos(lam * D2R)) * R2D);
        const dec = Math.asin(Math.sin(eps * D2R) * Math.sin(lam * D2R)) * R2D;
        pos = eng.eq2horiz(ra, dec, lat, lst);
        pos = { alt: pos.alt * 0.5 + 12, az: pos.az };   // the cone leans, it is not a point
      } else {
        pos = eng.eq2horiz(el.ra, el.dec, lat, lst);
      }
      curve.push({ t: s.t, alt: pos.alt, az: pos.az });
      const edge = pos.alt - el.ext / 2;          // the bottom of the subject, not its centre
      if (edge >= el.minAlt && !riseT) riseT = s.t;
      const cf = eng.clearFraction(s.cloud);
      const clear = cf == null ? 0.75 : cf;
      const sep = eng.eq2horiz ? angSep(pos.alt, pos.az, s.moonAlt, s.moonAz == null ? pos.az : s.moonAz) : 90;
      const mp = moonPenalty(el.need, sep, s.illum, s.moonAlt);
      const framing = framingFactor(edge, band);
      const q = framing * mp * clear;
      if (!best || q > best.q) best = { q, t: s.t, alt: pos.alt, az: pos.az, edge, sep, moonPen: mp, clear, framing };
    });
    const skyNeed = el.need === 3 ? 4 : el.need === 2 ? 6 : 9;
    /* Light pollution should rank a subject lower, not rule it out: most people never get to a
       Bortle 2 site, and the bright parts of most of these still photograph well from a 5. */
    const skyOk = clamp(1 - Math.max(0, bortle - skyNeed) * 0.18, 0.3, 1);
    const skyGap = bortle - skyNeed;
    const hemiOk = el.hemi === 0 || el.hemi === hemi ? 1 : 0.15;
    const peak = curve.reduce((a, b) => b.alt > a.alt ? b : a, curve[0]);
    const peakEdge = peak.alt - el.ext / 2;
    /* The lowest the subject's bottom edge gets while it is still up: needed to tell "too high all
       night" apart from "too high at one moment". */
    const upEdges = curve.filter(c => c.alt - el.ext / 2 > 0).map(c => c.alt - el.ext / 2);
    const minEdge = upEdges.length ? Math.min.apply(null, upEdges) : null;
    const score = best ? best.q * skyOk * hemiOk : 0;
    return { el, score, best, peak, peakEdge, minEdge, riseT, curve, skyOk, skyGap, bortle, hemiOk, band };
  });

  scored.sort((a, b) => b.score - a.score);
  /* The zodiacal light is not a "worth a try" subject: it needs a genuinely dark sky, no moon
     worth speaking of, and the cone standing up off the horizon. Anything less and offering it
     would be dishonest, so it is not offered at all. */
  const moonOutOfTheWay = slots.some(s => s.moonAlt < 0 || s.illum < 0.15);
  const zodiacalOn = bortle <= 4 && moonOutOfTheWay;
  const ranked = scored.filter(s => s.el.id !== 'zodiacal'
    || (zodiacalOn && s.peak && s.peak.alt >= s.el.minAlt));
  /* Even a filthy night has a best answer, so the list never comes up empty: anything that
     actually clears its own horizon can be offered, with the reason stated plainly. */
  const eligible = ranked.filter(s => s.hemiOk === 1 && s.peakEdge != null && s.peakEdge >= s.el.minAlt);
  /* "Not tonight" has to mean not worth it, never merely sixth. One predicate decides it, stamped
     onto the item, so the ranking and the sentence that explains it can never disagree. */
  const ok = s => s.score >= 0.18 && s.best && s.best.framing >= 0.9;
  ranked.forEach(s => { s.rejected = !ok(s); });
  const strong = eligible.filter(s => !s.rejected);
  const picks = strong.length >= 3 ? strong.slice(0, 8) : eligible.slice(0, 3);
  const out = ranked.filter(s => picks.indexOf(s) < 0).slice(0, 5);
  return { picks, out, none: false, thin: strong.length < 3 };
}

function angSep(a1, z1, a2, z2){
  return Math.acos(clamp(Math.sin(a1 * D2R) * Math.sin(a2 * D2R)
    + Math.cos(a1 * D2R) * Math.cos(a2 * D2R) * Math.cos((z1 - z2) * D2R), -1, 1)) * R2D;
}

/* Why this one is or is not worth it tonight, in plain words. */
function reasonFor(item, t, kit){
  const eng = E(), el = item.el, b = item.best;
  const k = kit || DEFAULT_KIT;
  if (!b) return 'No dark hours to judge it by tonight.';
  const dir = eng.compass(b.az);
  const when = eng.fmtTime(b.t);
  /* Geometry decides whether something rises, never the editorial hemisphere flag: plenty of
     northern subjects clear a useful altitude from Sydney, they are just not what you would drive
     out for down there. */
  if (!item.peak || item.peak.alt <= 0)
    return 'Never rises from your latitude. It is a holiday subject.';
  if (item.hemiOk < 1)
    return 'A ' + (el.hemi === 1 ? 'northern' : 'southern') + ' subject: it clears '
      + Math.round(item.peak.alt) + '\u00b0 here, but it is at its best from the other side of the equator.';
  if (item.peakEdge != null && item.peakEdge < el.minAlt)
    return item.peakEdge <= 0
      ? 'The bottom of it stays below the horizon all night.'
      : 'Never really gets high enough for typical conditions.';
  /* Both band rejections are judged on the whole night, never on one moment: a subject that does
     reach its band falls through to the real culprit, which is usually cloud or the moon. */
  if (item.band && item.minEdge != null && item.minEdge > item.band.high + 5)
    return 'Never drops below ' + Math.round(item.minEdge) + '\u00b0 in the ' + dir
      + ' tonight, too high to share a frame with a foreground at ' + k.focal + 'mm'
      + (k.orient === 'port' ? ' portrait' : ' landscape') + '. Go wider, or turn the camera'
      + (k.orient === 'port' ? ' the other way' : ' portrait') + '.';
  if (item.band && item.peakEdge != null && item.peakEdge < item.band.low)
    return 'Never really gets high enough for typical conditions in the ' + dir + '.';
  if (item.skyOk < 0.6)
    return 'Sky conditions from here aren\u0027t ideal for this, so keep expectations modest: the bright parts will still come through.';
  if (b.moonPen < 0.55)
    return 'The moon is ' + Math.round(b.sep) + '\u00b0 away and washing it out. Worth a look after moonset.';
  if (b.clear < 0.4)
    return 'Cloud in the ' + dir + ' for most of the dark hours.';
  /* Belt and braces: anything the ranking rejected gets a sentence saying so, whatever the
     individual tests above did or did not catch. */
  if (item.rejected){
    if (item.best && item.best.framing < 0.9 && item.band)
      return 'Never really gets high enough for typical conditions when the sky is at its clearest.';
    return Math.round(b.alt) + '\u00b0 up in the ' + dir
      + ' at best, but between the sky, the moon and the cloud it is not the one tonight.';
  }
  /* The list card and the obstacles line have to tell the same story about the sky, so both read
     the same gap between this site and what the subject wants. */
  const skyBit = item.skyGap == null || item.skyGap <= 0 ? ''
    : item.skyGap <= 1 ? ' A Bortle ' + item.bortle + ' sky will cost you a little of the faint stuff.'
    : ' A Bortle ' + item.bortle + ' sky is brighter than it wants, so expect the bright parts rather than the subtle ones.';
  const moonBit = b.moonPen > 0.85 ? 'tonight\u0027s moon barely touches it'
    : b.moonPen > 0.7 ? 'the moon costs it a little contrast' : 'it holds up under tonight\u0027s moon';
  return Math.round(b.alt) + '\u00b0 up in the ' + dir + ' at ' + when
    + ', framing well with a foreground at ' + k.focal + 'mm '
    + (k.orient === 'port' ? 'portrait' : 'landscape') + ', and ' + moonBit + '.' + skyBit;
}

/* A short list of the naked-eye sky: enough to recognise where you are pointing, and nothing
   like a star catalogue. ra, dec in degrees, then magnitude, then a name for the bright ones. */
const BRIGHT = [
  [101.29,-16.72,-1.46,'Sirius'],[95.99,-52.70,-0.74,'Canopus'],[219.90,-60.83,-0.27,'Rigil Kent'],
  [213.92,19.18,-0.05,'Arcturus'],[279.23,38.78,0.03,'Vega'],[79.17,46.00,0.08,'Capella'],
  [78.63,-8.20,0.13,'Rigel'],[114.83,5.22,0.34,'Procyon'],[24.43,-57.24,0.46,'Achernar'],
  [88.79,7.41,0.50,'Betelgeuse'],[210.96,-60.37,0.61,'Hadar'],[297.70,8.87,0.77,'Altair'],
  [186.65,-63.10,0.77,'Acrux'],[68.98,16.51,0.85,'Aldebaran'],[201.30,-11.16,1.04,'Spica'],
  [247.35,-26.43,1.09,'Antares'],[116.33,28.03,1.14,'Pollux'],[344.41,-29.62,1.16,'Fomalhaut'],
  [310.36,45.28,1.25,'Deneb'],[191.93,-59.69,1.25,'Mimosa'],[152.09,11.97,1.40,'Regulus'],
  [104.66,-28.97,1.50,''],[113.65,31.89,1.58,'Castor'],[187.79,-57.11,1.63,''],[263.40,-37.10,1.62,''],
  [81.28,6.35,1.64,''],[81.57,28.61,1.65,''],[84.05,-1.20,1.69,''],[85.19,-1.94,1.74,''],
  [193.51,55.96,1.77,''],[165.93,61.75,1.79,'Dubhe'],[51.08,49.86,1.79,''],[107.10,-26.39,1.83,''],
  [276.04,-34.38,1.85,''],[206.89,49.31,1.86,''],[125.63,-59.51,1.86,''],[89.88,44.95,1.90,''],
  [252.17,-69.03,1.91,''],[99.43,16.40,1.93,''],[306.41,-56.74,1.94,''],[37.95,89.26,1.98,'Polaris'],
  [95.67,-17.96,1.98,''],[141.90,-8.66,1.98,''],[31.79,23.46,2.00,''],[10.90,-17.99,2.04,''],
  [283.82,-26.30,2.05,''],[2.10,29.09,2.06,''],[17.43,35.62,2.06,''],[222.68,74.16,2.08,'Kochab'],
  [86.94,-9.67,2.06,''],[47.04,40.96,2.12,''],[30.97,42.33,2.10,''],[177.26,14.57,2.14,''],
  [14.18,60.72,2.15,''],[190.38,-48.96,2.20,''],[120.90,-40.00,2.21,''],[233.67,26.71,2.22,''],
  [305.56,40.26,2.23,'Sadr'],[200.98,54.93,2.23,''],[10.13,56.54,2.24,'Schedar'],[269.15,51.49,2.23,''],
  [83.00,-0.30,2.25,''],[2.29,59.15,2.28,''],[240.08,-22.62,2.29,''],[165.46,56.38,2.37,''],
  [326.05,9.88,2.38,''],[345.94,28.08,2.42,''],[178.46,53.69,2.44,''],[3.31,15.18,2.83,''],
  [29.69,-61.57,2.86,''],[131.18,-54.71,2.50,''],[218.02,38.31,2.68,''],[236.07,6.43,2.63,'']
];

/* Galactic to equatorial, so the Milky Way can be drawn from geometry instead of a data file. */
const NGP_RA = 192.86, NGP_DEC = 27.13, L_NCP = 122.93;
function galToEq(l, b){
  const sb = Math.sin(b * D2R), cb = Math.cos(b * D2R), dl = (L_NCP - l) * D2R;
  const sd = Math.sin(NGP_DEC * D2R), cd = Math.cos(NGP_DEC * D2R);
  const dec = Math.asin(sb * sd + cb * cd * Math.cos(dl)) * R2D;
  const ra = NGP_RA + Math.atan2(cb * Math.sin(dl), sd * cb * Math.cos(dl) * -1 + sb * cd) * R2D;
  return { ra: ((ra % 360) + 360) % 360, dec };
}

/* The on-screen position angle of the galactic plane at a given point, for a levelled camera:
   0 means the plane runs across the frame, ±90° means it runs up it. Both the framing canvas and
   the "does it fit" card read this, so they cannot disagree about which way a subject lies. */
const PA_CACHE = {};
function galAxisAngle(date, lat, lon, ra, dec){
  const eng = E();
  if (!eng || ra == null || dec == null) return 0;
  const key = [Math.round(ra), Math.round(dec), Math.round(lat * 10), Math.round(lon * 10),
               Math.round(date.getTime() / 300000)].join('|');
  if (PA_CACHE[key] != null) return PA_CACHE[key];
  let bl = 0, bd = 1e9;
  for (let l = 0; l < 360; l += 4){
    const e = galToEq(l, 0);
    const dRa = ((e.ra - ra + 540) % 360) - 180;
    const dd = dRa * dRa + (e.dec - dec) * (e.dec - dec);
    if (dd < bd) { bd = dd; bl = l; }
  }
  const jd = eng.jdFrom(date), lst = eng.lstOf(jd, lon);
  const a = galToEq(bl - 4, 0), b = galToEq(bl + 4, 0);
  const pa = eng.eq2horiz(a.ra, a.dec, lat, lst), pb = eng.eq2horiz(b.ra, b.dec, lat, lst);
  const mid = (pa.alt + pb.alt) / 2;
  const dz = ((pb.az - pa.az + 540) % 360) - 180;
  const out = Math.atan2(pb.alt - pa.alt, dz * Math.cos(mid * D2R));
  PA_CACHE[key] = out;
  return out;
}

/* The extent a subject actually presents to a levelled frame, given how it lies. */
function framedExtent(ext, elong, theta){
  const long = ext, short = ext / (elong || 1);
  const s = Math.abs(Math.sin(theta)), c = Math.abs(Math.cos(theta));
  return { v: Math.sqrt(Math.pow(long * s, 2) + Math.pow(short * c, 2)),
           h: Math.sqrt(Math.pow(long * c, 2) + Math.pow(short * s, 2)), long: long, short: short };
}

/* Long names read fine on a card and badly over a live camera feed, where they collide with
   each other and with the star labels. */
const SHORT = { 'Large Magellanic Cloud': 'LMC', 'Small Magellanic Cloud': 'SMC', 'Milky Way core': 'MW core' };
function shortName(n){
  if (SHORT[n]) return SHORT[n];
  return n.replace(/^The /, '').replace(/ (and|over) .*$/, '');
}

/* Everything the framing view draws, in alt-az, for one instant. */
function skyAt(date, lat, lon){
  const eng = E();
  const jd = eng.jdFrom(date), lst = eng.lstOf(jd, lon);
  const stars = BRIGHT.map(s => {
    const p = eng.eq2horiz(s[0], s[1], lat, lst);
    return { alt: p.alt, az: p.az, mag: s[2], name: s[3] };
  });
  const gal = [];
  for (let l = 0; l <= 360; l += 4){
    const e = galToEq(l, 0), p = eng.eq2horiz(e.ra, e.dec, lat, lst);
    gal.push({ alt: p.alt, az: p.az, l });
  }
  const m = eng.moonPos(jd), mp = eng.eq2horiz(m.ra, m.dec, lat, lst);
  const il = eng.moonIllum(jd);
  const els = ELEMENTS.filter(e => e.ra != null).map(e => {
    const p = eng.eq2horiz(e.ra, e.dec, lat, lst);
    return { id: e.id, name: e.name, short: shortName(e.name), alt: p.alt, az: p.az, ext: e.ext, elong: e.elong || 1,
             pa: galAxisAngle(date, lat, lon, e.ra, e.dec) };
  });
  const s0 = eng.sunPos(jd);
  const eps = 23.4393 * D2R, lam = s0.lam * D2R;
  const sunRa = eng.norm(Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam)) * R2D);
  const sunDec = Math.asin(Math.sin(eps) * Math.sin(lam)) * R2D;
  const sp = eng.eq2horiz(sunRa, sunDec, lat, lst);
  return { stars, gal, moon: { alt: mp.alt, az: mp.az, frac: il.frac },
           sun: { alt: sp.alt, az: sp.az }, elements: els };
}

/* Gnomonic projection about the aim, which is what a rectilinear lens actually does. */
function projector(aimAlt, aimAz, viewAcross, viewDown, W, H){
  const sa = Math.sin(aimAlt * D2R), ca = Math.cos(aimAlt * D2R);
  const kx = (W / 2) / Math.tan(viewAcross / 2 * D2R);
  const ky = (H / 2) / Math.tan(viewDown / 2 * D2R);
  return (alt, az) => {
    const s = Math.sin(alt * D2R), c = Math.cos(alt * D2R), dz = (az - aimAz) * D2R;
    const cosc = sa * s + ca * c * Math.cos(dz);
    if (cosc <= 0.05) return null;
    const x = (c * Math.sin(dz)) / cosc;
    const y = (ca * s - sa * c * Math.cos(dz)) / cosc;
    return { x: W / 2 + x * kx, y: H / 2 - y * ky, front: true };
  };
}

/* One trail per bright star, sampled over the session, for the AR overlay. Recomputing this
   every animation frame would cook the phone, so callers cache it against time and location. */
function starTrailPaths(date, lat, lon, hours, opts){
  const eng = E(), o = opts || {};
  const maxMag = o.maxMag == null ? 2.4 : o.maxMag;
  const steps = o.steps == null ? 20 : o.steps;
  const out = [];
  BRIGHT.forEach(s => {
    if (s[2] > maxMag) return;
    const pts = [];
    let anyUp = false;
    for (let k = 0; k <= steps; k++){
      const t = new Date(date.getTime() + (k / steps) * hours * 3600000);
      const p = eng.eq2horiz(s[0], s[1], lat, eng.lstOf(eng.jdFrom(t), lon));
      if (p.alt > -3) anyUp = true;
      pts.push({ alt: p.alt, az: p.az });
    }
    if (anyUp) out.push({ mag: s[2], name: s[3], pts });
  });
  return out;
}

/* AR photographic sprites (build sheet task 8, done on the existing 2D canvas per the build
   review rather than in WebGL: 118 rotated textured quads is unremarkable for canvas 2D, and
   shipping this without shader work gets the visible half of the feature out first).

   For each catalogue object this hands back the object itself plus alt/az for its centre and
   for a point half its width east and half its height north. Those two projected offsets ARE
   the affine transform a sprite needs (scale, sky rotation and the gnomonic shear all fall out
   at once): the caller never computes a position angle. Filtered to objects that are at least
   plausibly above the horizon so the AR loop is not projecting objects nobody could see. */
function arSpriteFrames(objs, date, lat, lon){
  const eng = E();
  if (!eng || !objs || !objs.length) return [];
  const jd = eng.jdFrom(date), lst = eng.lstOf(jd, lon);
  const out = [];
  for (let i = 0; i < objs.length; i++){
    const o = objs[i];
    const c = eng.eq2horiz(o.ra, o.dec, lat, lst);
    if (c.alt < -8) continue;   // some margin below the horizon, same as the prototype
    const halfW = o.w / 2 / Math.max(0.08, Math.cos(o.dec * D2R));
    const cE = eng.eq2horiz(o.ra + halfW, o.dec, lat, lst);
    const cN = eng.eq2horiz(o.ra, Math.min(89.5, o.dec + o.h / 2), lat, lst);
    out.push({ o, alt: c.alt, az: c.az, eAlt: cE.alt, eAz: cE.az, nAlt: cN.alt, nAz: cN.az });
  }
  return out;
}

window.NoctoPlan = {
  SENSORS, DEFAULT_KIT, loadKit, saveKit, kitDerived, maxExposure,
  trailFraction, hoursForFraction, fastestDecInFrame, arcAngle, SIDEREAL,
  trailRecipes, session, moonVsFrame, timelapse,
  ELEMENTS, rankTonight, reasonFor, archWindows, archAltAt, angSep, framingBand, framingFactor,
  BRIGHT, galToEq, skyAt, projector, starTrailPaths, galAxisAngle, framedExtent, arSpriteFrames,
};
})();
