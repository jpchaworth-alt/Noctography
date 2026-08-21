/* ============================ the night log ============================
   A record of what you actually shot, kept on the device and nowhere else. Storage, the shape of
   an entry, and the three ways a copy gets off the phone. No UI here.

   Two decisions worth stating, because everything else follows from them.

   A night is keyed by the date the night STARTED, not by the calendar date at the moment of
   writing. A shot at 01:18 belongs to the evening you drove out on, which is what a photographer
   means by "that night at Cley", and it keeps one night from splitting across two calendar squares
   at midnight.

   The stamp on an entry is the moment it was first written and it never moves. Entries can be
   edited and deleted freely, because a log you cannot correct is a log you stop keeping, but the
   time is the one thing that stays honest: it is the whole reason a note is worth anything a year
   later. */
"use strict";
(function () {
  const KEY = 'nocto.log.v1';
  const BACKUP_EVERY = 20;          // entries written between prods to get a copy off the phone

  function blank() { return { nights: {}, exportedAt: 0, sinceExport: 0 }; }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || !o.nights) return blank();
      return o;
    } catch (e) { return blank(); }
  }

  /* Storage can refuse: a full quota, or Safari in private mode. Silence would lose the entry the
     user just typed without telling them, so the failure is reported back and surfaced. */
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { return false; }
  }

  /* The night this moment belongs to. Before the small hours are done, you are still on yesterday
     evening's night, which is the same rollover the rest of the app uses. */
  function nightKey(d, rolloverHour) {
    const t = d ? new Date(d) : new Date();
    const roll = rolloverHour == null ? 12 : rolloverHour;
    if (t.getHours() < roll) t.setDate(t.getDate() - 1);
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }

  function zoneNow() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }
  /* The zone is only ever shown when it is not the one the app is written for, so a log kept in
     the Fens reads clean and a week in Norway is unambiguous. */
  function zoneLabel(tz) {
    if (!tz || tz === 'Europe/London') return '';
    const bits = String(tz).split('/');
    return bits[bits.length - 1].replace(/_/g, ' ');
  }

  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function night(db, key) { return db.nights[key] || null; }

  /* A night record is created by the first thing written into it, never by opening the app: the
     calendar shows nights you had something to say about, not nights you happened to check. */
  function ensureNight(db, key, cond) {
    if (!db.nights[key]) {
      db.nights[key] = { at: Date.now(), tz: zoneNow(), cond: cond || null, note: '', shots: [] };
    } else if (cond && !db.nights[key].cond) {
      db.nights[key].cond = cond;
    }
    return db.nights[key];
  }

  function setNote(db, key, text, cond) {
    const n = ensureNight(db, key, cond);
    const wasEmpty = !n.note;
    n.note = text;
    if (wasEmpty && text) db.sinceExport = (db.sinceExport || 0) + 1;
    if (!text && !n.shots.length) delete db.nights[key];    // an emptied night leaves no trace
    return db;
  }

  /* A shot begins with nothing but a time, which is the point: at two in the morning the only
     thing worth capturing reliably is that this happened, and when. */
  function addShot(db, key, cond) {
    const n = ensureNight(db, key, cond);
    const s = { id: id(), at: Date.now(), type: '', pano: false, desc: '', sky: {}, fore: {}, extra: {}, free: '' };
    n.shots.push(s);
    db.sinceExport = (db.sinceExport || 0) + 1;
    return s;
  }

  function updateShot(db, key, sid, patch) {
    const n = db.nights[key];
    if (!n) return db;
    const s = n.shots.find(x => x.id === sid);
    if (!s) return db;
    Object.keys(patch).forEach(k => {
      if (k === 'at' || k === 'id') return;                 // the stamp is not editable, by design
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) s[k] = Object.assign({}, s[k], patch[k]);
      else s[k] = patch[k];
    });
    return db;
  }

  function deleteShot(db, key, sid) {
    const n = db.nights[key];
    if (!n) return db;
    n.shots = n.shots.filter(x => x.id !== sid);
    if (!n.shots.length && !n.note) delete db.nights[key];
    return db;
  }

  function deleteNight(db, key) { delete db.nights[key]; return db; }

  /* Complete means a time and a sentence. The settings are a bonus, so a shot is never nagged
     about an empty aperture: the counter exists to help you finish a thought, not to mark homework.
     Which fields count as settings depends on the type, since a timelapse has an interval and a
     single frame has no foreground pass to speak of. */
  const SKY_FIELDS = ['camera', 'focal', 'aperture', 'exposure', 'iso', 'shots'];
  function wanted(shot) {
    const t = shot.type || '';
    const out = { desc: true, sky: SKY_FIELDS.slice(), fore: t && t !== 'Single exposure' ? SKY_FIELDS.slice() : [], extra: [] };
    if (t === 'Timelapse') out.extra.push('interval');
    if (shot.pano) out.extra.push('frames');
    return out;
  }
  function missing(shot) {
    const w = wanted(shot);
    let n = 0;
    if (!String(shot.desc || '').trim()) n++;
    w.sky.forEach(f => { if (!String((shot.sky || {})[f] || '').trim()) n++; });
    w.fore.forEach(f => { if (!String((shot.fore || {})[f] || '').trim()) n++; });
    w.extra.forEach(f => { if (!String((shot.extra || {})[f] || '').trim()) n++; });
    return n;
  }
  function needsWords(shot) { return !String(shot.desc || '').trim(); }

  /* Values you have used before, most recent first, so the pickers grow into your kit without ever
     having asked you to set one up. The common list seeds them on a fresh install. */
  const COMMON = {
    focal: ['14mm', '20mm', '24mm', '35mm', '50mm'],
    aperture: ['f/1.4', 'f/1.8', 'f/2', 'f/2.8', 'f/4'],
    exposure: ['10s', '15s', '20s', '30s', '90s', '120s'],
    iso: ['400', '800', '1600', '3200', '6400'],
    interval: ['1s', '2s', '5s', '10s'],
  };
  function seen(db, field, limit) {
    const counts = new Map();
    Object.keys(db.nights).forEach(k => (db.nights[k].shots || []).forEach(s => {
      [s.sky, s.fore, s.extra].forEach(g => {
        const v = g && g[field];
        if (v && String(v).trim()) counts.set(String(v).trim(), (counts.get(String(v).trim()) || 0) + 1);
      });
    }));
    const mine = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const base = COMMON[field] || [];
    const out = [];
    mine.concat(base).forEach(v => { if (out.indexOf(v) < 0) out.push(v); });
    return out.slice(0, limit || 5);
  }

  function counts(db) {
    let nights = 0, shots = 0;
    Object.keys(db.nights).forEach(k => { nights++; shots += (db.nights[k].shots || []).length; });
    return { nights, shots, sinceExport: db.sinceExport || 0, exportedAt: db.exportedAt || 0 };
  }
  function dueBackup(db) { return (db.sinceExport || 0) >= BACKUP_EVERY; }
  function markExported(db) { db.exportedAt = Date.now(); db.sinceExport = 0; return db; }

  /* ---- getting a copy out ----
     The same text serves copying, emailing and printing, so it is written to be read rather than
     parsed. The one-line form is the second button, for anyone who wants it in a spreadsheet. */
  const pad = n => String(n).padStart(2, '0');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function longDate(key) {
    const p = key.split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }
  function clock(ms, tz) {
    const d = new Date(ms);
    const z = zoneLabel(tz);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + (z ? ' ' + z : '');
  }
  function settingsLine(g) {
    if (!g) return '';
    return SKY_FIELDS.map(f => g[f]).filter(v => v && String(v).trim()).join(' · ');
  }

  function nightText(key, n) {
    const L = [];
    L.push(longDate(key));
    const c = n.cond || {};
    /* Either may be missing: a named site with no fix, or a fix with no name yet. */
    if (c.place || c.coords) L.push([c.place, c.coords].filter(Boolean).join('  '));
    const facts = [];
    if (c.dark) facts.push('Dark ' + c.dark);
    if (c.moon) facts.push('Moon ' + c.moon);
    if (c.level) facts.push(c.level);
    if (c.cloud) facts.push(c.cloud);
    if (c.bortle) facts.push('Bortle ' + c.bortle);
    if (facts.length) L.push(facts.join('  ·  '));
    if (n.note) { L.push(''); L.push(n.note); }
    (n.shots || []).slice().sort((a, b) => a.at - b.at).forEach(s => {
      L.push('');
      L.push(clock(s.at, n.tz) + '   ' + [s.type || 'Shot', s.pano ? 'panorama' : ''].filter(Boolean).join(', '));
      if (s.desc) L.push('  ' + s.desc);
      const sky = settingsLine(s.sky), fore = settingsLine(s.fore);
      const ex = Object.keys(s.extra || {}).filter(k => s.extra[k]).map(k => k + ' ' + s.extra[k]).join(' · ');
      if (sky && fore) { L.push('  Sky   ' + sky); L.push('  Fore  ' + fore); }
      else if (sky) L.push('  ' + sky);
      if (ex) L.push('  ' + ex);
      if (s.free) L.push('  ' + s.free);
    });
    return L.join('\n');
  }

  function toText(db, keys) {
    const ks = (keys || Object.keys(db.nights)).slice().sort().reverse();
    const head = 'Noctography night log\n' + ks.length + (ks.length === 1 ? ' night' : ' nights')
      + ', copied ' + longDate(nightKey(new Date(), 0)) + '\n';
    return head + '\n' + ks.map(k => nightText(k, db.nights[k])).join('\n\n' + '\u2500'.repeat(34) + '\n\n') + '\n';
  }

  /* One row per shot, tab separated, which pastes straight into a spreadsheet without anyone
     having to think about commas inside a sentence. */
  function toRows(db, keys) {
    const cols = ['Night', 'Time', 'Place', 'Type', 'Panorama', 'Description',
      'Sky camera', 'Sky focal', 'Sky aperture', 'Sky exposure', 'Sky ISO', 'Sky shots',
      'Fore camera', 'Fore focal', 'Fore aperture', 'Fore exposure', 'Fore ISO', 'Fore shots',
      'Interval', 'Frames', 'Notes', 'Night note'];
    const clean = v => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim();
    const ks = (keys || Object.keys(db.nights)).slice().sort().reverse();
    const rows = [cols.join('\t')];
    ks.forEach(k => {
      const n = db.nights[k], c = n.cond || {};
      const list = (n.shots || []).slice().sort((a, b) => a.at - b.at);
      if (!list.length) { rows.push([k, '', clean(c.place), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', clean(n.note)].join('\t')); return; }
      list.forEach(s => {
        rows.push([k, clock(s.at, n.tz), clean(c.place), clean(s.type), s.pano ? 'yes' : '', clean(s.desc),
          clean(s.sky.camera), clean(s.sky.focal), clean(s.sky.aperture), clean(s.sky.exposure), clean(s.sky.iso), clean(s.sky.shots),
          clean(s.fore.camera), clean(s.fore.focal), clean(s.fore.aperture), clean(s.fore.exposure), clean(s.fore.iso), clean(s.fore.shots),
          clean((s.extra || {}).interval), clean((s.extra || {}).frames), clean(s.free), clean(n.note)].join('\t'));
      });
    });
    return rows.join('\n');
  }

  /* Email is the awkward one. A phone will only carry so much text in a pre-filled message before
     it truncates or simply refuses to open, and a year of nights is far past that. So the message
     itself is a short covering note and the log travels as a file the user attaches, which is the
     only route that survives a long log on every phone. Under the limit, the whole thing goes in
     the body and there is nothing to attach. */
  const MAILTO_MAX = 1600;
  function mailto(db, keys) {
    const body = toText(db, keys);
    const c = counts(db);
    const subject = 'Noctography night log' + (keys && keys.length === 1 ? ', ' + longDate(keys[0]) : '');
    if (body.length <= MAILTO_MAX) return { href: 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), attach: false, body };
    const stub = 'My night log from Noctography: ' + c.nights + ' nights, ' + c.shots + ' shots.\n\n'
      + 'The log itself is too long to fit in a message, so it is attached as a text file.\n';
    return { href: 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(stub), attach: true, body };
  }

  function download(text, filename) {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) { return false; }
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) { return false; }
    }
  }

  /* Month grid for the calendar. Weeks start on Monday, and a square only lights up if something
     was written that night. */
  function monthGrid(db, year, month) {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const key = year + '-' + pad(month + 1) + '-' + pad(d);
      const n = db.nights[key];
      cells.push({ d, key, has: !!n, shots: n ? (n.shots || []).length : 0, note: !!(n && n.note) });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  window.NoctoLog = {
    load, save, blank, nightKey, ensureNight, night, setNote, addShot, updateShot, deleteShot,
    deleteNight, missing, needsWords, wanted, seen, counts, dueBackup, markExported,
    toText, toRows, mailto, download, copy, monthGrid, longDate, clock, zoneNow, zoneLabel,
    SKY_FIELDS, COMMON, BACKUP_EVERY,
  };
})();
