/* Shared aurora sightings.

   Every other module in Noctography works on the device and sends nothing anywhere. This one is
   the exception, and it is the only one, so it is kept apart in its own file and its own words:
   a report is something you choose to publish, and nothing leaves until you press the button.

   What travels is deliberately small. Not your coordinates: the position is rounded to a grid
   about five kilometres across, which is fine for "was it visible from the fens" and useless for
   finding a person. Alongside it goes the timestamp, what you saw, and the readings the app had
   already frozen at that moment. Those readings are the point. Every other sightings map on the
   internet can tell you someone saw the aurora; this one can tell you what the sky was doing where
   they stood, because the app worked it out there and then. */
(function (root) {
  'use strict';

  /* The ladder. Two things people argue about are kept apart: camera against eye, and colour
     against grey. Structure and corona are NOT rungs, because a colourless arc can have perfect
     structure and a corona is geometry rather than brightness. They are separate ticks, so a
     report never has to trade one truth for another. */
  var LEVELS = [
    { id: 0, key: 'nothing', label: 'Nothing seen',      short: 'nothing', eye: false,
      hint: 'Looked properly, saw nothing. Worth saying.' },
    { id: 1, key: 'cam',     label: 'Diffuse on camera', short: 'camera',  eye: false,
      hint: 'A grey or green wash in a long exposure, invisible to the eye.' },
    { id: 2, key: 'faint',   label: 'Diffuse to eye',    short: 'faint',   eye: true,
      hint: 'A pale glow you can see unaided, easy to mistake for cloud.' },
    { id: 3, key: 'obvious', label: 'Obvious to eye',    short: 'obvious', eye: true,
      hint: 'Unmistakably there, brighter than the sky around it.' },
    { id: 4, key: 'colour',  label: 'Colour to eye',     short: 'colour',  eye: true,
      hint: 'Green, or pink in the upper edge, seen without a camera.' },
  ];
  var MARKS = [
    { id: 'structure', label: 'Structure', hint: 'An arc, bands or pillars, rather than a formless glow.' },
    { id: 'corona',    label: 'Corona',    hint: 'Rays converging overhead. Rare, and unmistakable.' },
  ];
  function level(id) { return LEVELS[Math.max(0, Math.min(4, id | 0))]; }

  /* Colour by rung, from the design system's sky accents. Nothing-seen is drawn hollow, so it
     reads as a look rather than a sighting without needing a legend. */
  var INK = ['rgba(245,245,245,.55)', '#7FB2C8', '#6FCF97', '#9CCB3B', '#F06FA8'];
  function ink(id) { return INK[Math.max(0, Math.min(4, id | 0))]; }

  /* About five kilometres. A tenth of a degree of latitude is 11.1 km, so a twentieth is 5.6;
     longitude is scaled by the cosine so the cells stay roughly square rather than becoming
     slivers in the north. Rounding happens on the device, before anything is sent: the precise
     position never leaves, rather than being sent and discarded politely at the far end. */
  var CELL_DEG = 0.05;
  function cell(lat, lon) {
    var la = Math.round(lat / CELL_DEG) * CELL_DEG;
    var k = Math.max(0.15, Math.cos(la * Math.PI / 180));
    var step = CELL_DEG / k;
    return { lat: +la.toFixed(4), lon: +(Math.round(lon / step) * step).toFixed(4), km: 5 };
  }

  /* A night runs noon to noon, so a report at 02:00 belongs to the evening before. Used for the
     scrollback, for the observer count, and for deciding when a pin finally goes out. */
  function nightKey(ms) {
    var d = new Date(ms);
    if (d.getHours() < 12) d = new Date(d.getTime() - 86400000);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function nightStart(ms) {
    var d = new Date(ms);
    if (d.getHours() < 12) d = new Date(d.getTime() - 86400000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).getTime();
  }

  /* Pins stay for the whole of the night they belong to, and shrink as they age. Size rather than
     fade, so an old report is still legible in the dark: a dimmed pin on a dark map is a pin
     nobody can read. Radius runs from 11px fresh to 4px by dawn. */
  function ageAt(rec, now) {
    var start = nightStart(rec.at);
    var span = Math.max(3600000, (start + 20 * 3600000) - rec.at);
    var age = Math.max(0, (now == null ? Date.now() : now) - rec.at);
    var f = Math.min(1, age / span);
    return { f: f, radius: 11 - 7 * f, fresh: age < 45 * 60000, hours: age / 3600000 };
  }

  /* Plausibility, not moderation. Three rules hold this honest.

     One: only claims the physics can contradict. A camera genuinely sees what the eye cannot, so a
     camera-only report is never marked, whatever the conditions.

     Two: never on one signal. Cloud data is coarse, Hp arrives late, and people do stand in holes
     in the overcast. One disagreement is noise; two is a pattern.

     Three: the mark says what disagreed. A reporter who was right can then be visibly right,
     which deletion would never allow. */
  function plausibility(rec, opts) {
    var o = opts || {};
    var lv = rec.level | 0;
    if (lv < 2) return { marked: false, reasons: [] };
    var r = [];
    if (rec.cloud != null && rec.cloud >= 90) {
      r.push('total cloud overhead here at the time');
    }
    /* Altitude is signed: positive is above the horizon. Running it through Math.abs turned a sun
       27\u00b0 up into "27\u00b0 down", so the sentence accused the reporter of seeing an aurora in
       twilight when the real objection was that it was the middle of the day. Three states, three
       different things to say, and the number matches the conditions table beside it. */
    if (rec.sunAlt != null && rec.sunAlt > 0) {
      r.push('the sun was still ' + Math.round(rec.sunAlt) + '\u00b0 above the horizon');
    } else if (rec.sunAlt != null && rec.sunAlt > -6) {
      r.push('the sun was only ' + Math.abs(Math.round(rec.sunAlt)) + '\u00b0 below the horizon in bright twilight');
    }
    if (rec.kp != null && rec.mlat != null) {
      var edge = 66.5 - 2.07 * Math.max(0, Math.min(9, rec.kp));
      var gap = edge - Math.abs(rec.mlat);
      if (gap > 5) r.push('Kp ' + (+rec.kp).toFixed(1) + ' puts the oval about ' + Math.round(gap) + '\u00b0 north of here');
    }
    if (lv >= 4 && rec.moon != null && rec.moon >= 0.85 && rec.moonAlt != null && rec.moonAlt > 10) {
      r.push('a ' + Math.round(rec.moon * 100) + '% moon well up washing the colour out');
    }
    if (o.nearbyNothing >= 2) {
      r.push(o.nearbyNothing + ' reports within 100 km saw nothing that hour');
    }
    return { marked: r.length >= 2, reasons: r, sentence: sentence(r) };
  }

  /* One place builds the sentence, because the count and the list have to agree with each other
     and with the reasons actually found. Commas between, one "and" before the last. */
  var COUNTS = ['', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'];
  function sentence(r) {
    if (!r.length) return '';
    var list = r.length === 1 ? r[0] : r.slice(0, -1).join(', ') + ' and ' + r[r.length - 1];
    var lead = r.length === 1 ? 'One thing here disagrees with that: '
      : (COUNTS[r.length] || r.length + ' things') + ' here disagree with that: ';
    return lead + list
      + '. It is marked rather than removed, because standing in the one gap in the cloud is a real'
      + ' thing that happens.';
  }

  /* Ten separate nights earns it, and a year of silence lets it lapse. Counted from the reports
     themselves rather than stored as a flag, so it cannot drift out of step with the record. */
  var OBSERVER_NIGHTS = 10, LAPSE_MS = 365 * 86400000;
  function observer(reports, now) {
    var list = reports || [];
    if (!list.length) return { nights: 0, observer: false, label: '' };
    var keys = {}, last = 0;
    for (var i = 0; i < list.length; i++) {
      keys[nightKey(list[i].at)] = 1;
      if (list[i].at > last) last = list[i].at;
    }
    var n = Object.keys(keys).length;
    var live = (now == null ? Date.now() : now) - last < LAPSE_MS;
    return {
      nights: n,
      observer: n >= OBSERVER_NIGHTS && live,
      lapsed: n >= OBSERVER_NIGHTS && !live,
      toGo: Math.max(0, OBSERVER_NIGHTS - n),
      label: n >= OBSERVER_NIGHTS && live ? 'Regular observer' : '',
    };
  }

  /* The service. One endpoint, append-only, and the app works without it: if no endpoint is
     configured, or it cannot be reached, everything local carries on and the map simply says so.
     A shared feature that breaks the app when the server is down is not worth having. */
  var ENDPOINT = null, TOKEN_KEY = 'nocto-reporter-v1';

  function configure(url) { ENDPOINT = url || null; }
  function configured() { return !!ENDPOINT; }

  /* A handle is claimed, not owned. The device token beside it is random, never shown, and exists
     so a reporter can delete their own report and so the service can rate limit without ever
     knowing who anybody is. */
  function me() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) {}
    if (raw && raw.token) return raw;
    var token = '';
    var bytes = new Uint8Array(16);
    (root.crypto || {}).getRandomValues ? root.crypto.getRandomValues(bytes) : bytes.forEach(function (_, i) { bytes[i] = Math.random() * 256; });
    for (var i = 0; i < bytes.length; i++) token += ('0' + bytes[i].toString(16)).slice(-2);
    var out = { token: token, handle: '' };
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify(out)); } catch (e) {}
    return out;
  }
  function setHandle(h) {
    var cur = me();
    cur.handle = String(h || '').trim().slice(0, 24);
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify(cur)); } catch (e) {}
    return cur;
  }

  function timeout(p, ms) {
    return new Promise(function (res, rej) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, ms || 8000);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); res(v); } },
             function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }

  function publish(rec) {
    if (!ENDPOINT) return Promise.reject(new Error('no-service'));
    var who = me();
    var c = cell(rec.lat, rec.lon);
    var body = {
      at: rec.at, lat: c.lat, lon: c.lon, cellKm: c.km,
      level: rec.level | 0, structure: !!rec.structure, corona: !!rec.corona,
      dir: rec.dir == null ? null : rec.dir, height: rec.height || null,
      note: String(rec.note || '').slice(0, 140),
      handle: who.handle || 'anon', token: who.token,
      kp: rec.kp == null ? null : rec.kp, kpMeasured: !!rec.kpMeasured,
      mlat: rec.mlat == null ? null : rec.mlat,
      cloud: rec.cloud == null ? null : rec.cloud,
      sunAlt: rec.sunAlt == null ? null : rec.sunAlt,
      moon: rec.moon == null ? null : rec.moon,
      moonAlt: rec.moonAlt == null ? null : rec.moonAlt,
      bortle: rec.bortle == null ? null : rec.bortle,
    };
    return timeout(fetch(ENDPOINT + '/report', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('http-' + r.status);
      return r.json();
    }));
  }

  /* Reports for a span, which is what both halves of the map ask for: the live view asks for
     tonight, the scrollback asks for a night five days ago. Same call. */
  function fetchRange(fromMs, toMs) {
    if (!ENDPOINT) return Promise.reject(new Error('no-service'));
    var u = ENDPOINT + '/reports?from=' + Math.floor(fromMs) + '&to=' + Math.ceil(toMs);
    return timeout(fetch(u).then(function (r) {
      if (!r.ok) throw new Error('http-' + r.status);
      return r.json();
    })).then(function (j) { return (j && j.reports) || []; });
  }

  function withdraw(id) {
    if (!ENDPOINT) return Promise.reject(new Error('no-service'));
    return timeout(fetch(ENDPOINT + '/report/' + encodeURIComponent(id), {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: me().token }),
    }).then(function (r) { return r.ok; }));
  }

  root.NoctoSightings = {
    LEVELS: LEVELS, MARKS: MARKS, level: level, ink: ink,
    cell: cell, nightKey: nightKey, nightStart: nightStart, ageAt: ageAt,
    plausibility: plausibility, observer: observer, OBSERVER_NIGHTS: OBSERVER_NIGHTS,
    configure: configure, configured: configured, me: me, setHandle: setHandle,
    publish: publish, fetchRange: fetchRange, withdraw: withdraw,
  };
})(typeof window !== 'undefined' ? window : this);
