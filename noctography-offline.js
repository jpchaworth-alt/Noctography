/* Noctography offline store for Scout HD.

   Every map tile, height tile and surface answer fetched for a location is kept in the browser's
   Cache Storage under that location. The five most recent locations are kept; opening a sixth
   drops the oldest. A cached answer is always used first, so a saved location opens with no signal.

   NoctoOffline.begin(key)   start recording answers under this location
   NoctoOffline.get(url)     ArrayBuffer or null
   NoctoOffline.put(url, buf)
   NoctoOffline.list()       [{ key, name, at, count }] newest first

   Saved areas sit beside those and are never dropped to make room:
   NoctoOffline.saveArea({ name, box }, urls, onProgress, isCancelled)  fetches what is missing
   NoctoOffline.areas()      [{ id, name, box, at, count, bytes }]
   NoctoOffline.dropArea(id)
   NoctoOffline.covers(lat, lon)  the saved area or spot that has this place, or null
*/
(function(){
if (window.NoctoOffline) return;
const NAME = 'noctography-scout-v1', KEEP = 5, IDX = 'noctography.scoutOffline';
let cur = null, cacheP = null, pending = new Set();
const cache = () => cacheP || (cacheP = ('caches' in window ? caches.open(NAME) : Promise.reject()).catch(() => null));
const load = () => { try { return JSON.parse(localStorage.getItem(IDX) || '[]'); } catch (e) { return []; } };
const save = l => { try { localStorage.setItem(IDX, JSON.stringify(l)); } catch (e) {} };
const AIDX = 'noctography.scoutAreas';
const aload = () => { try { return JSON.parse(localStorage.getItem(AIDX) || '[]'); } catch (e) { return []; } };
const asave = l => { try { localStorage.setItem(AIDX, JSON.stringify(l)); } catch (e) {} };
/* the URL lists live in the cache too, not in localStorage, which has only a few megabytes */
const LISTS = 'https://offline.noctography.net/area-list/';
async function areaUrls(id){ const c = await cache(); if (!c) return []; const r = await c.match(LISTS + id).catch(() => null); return r ? r.json().catch(() => []) : []; }

async function evict(list){
  const c = await cache(); if (!c) return list;
  while (list.length > KEEP) {
    const old = list.pop();
    /* a URL shared with a kept location stays */
    const keep = new Set(list.flatMap(l => l.urls || []));
    for (const a of aload()) (await areaUrls(a.id)).forEach(u => keep.add(u));
    await Promise.all((old.urls || []).filter(u => !keep.has(u)).map(u => c.delete(u)));
  }
  return list;
}
function begin(key, name){
  let list = load().filter(l => l.key !== key);
  const prev = load().find(l => l.key === key);
  cur = { key, name: name || key, at: Date.now(), urls: prev ? prev.urls : [] };
  pending = new Set(cur.urls);
  list.unshift(cur);
  evict(list).then(save);
}
function note(url){
  if (!cur || pending.has(url)) return;
  pending.add(url); cur.urls.push(url);
  clearTimeout(note.t);
  note.t = setTimeout(() => { const list = load(); const i = list.findIndex(l => l.key === cur.key); if (i >= 0) { list[i] = cur; save(list); } }, 1500);
}
async function get(url){
  const c = await cache(); if (!c) return null;
  const r = await c.match(url).catch(() => null);
  if (!r) return null;
  note(url);
  return r.arrayBuffer();
}
async function put(url, buf){
  const c = await cache(); if (!c || !buf) return;
  note(url);
  c.put(url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } })).catch(() => {});
}
function list(){ return load().map(l => ({ key: l.key, name: l.name, at: l.at, count: (l.urls || []).length })); }

async function saveArea(meta, urls, onProgress, cancelled){
  const c = await cache(); if (!c) throw new Error('This browser cannot keep files offline.');
  const id = 'a' + Date.now().toString(36);
  let done = 0, bytes = 0, failed = 0;
  const jobs = urls.slice();
  const run = async () => {
    while (jobs.length) {
      if (cancelled && cancelled()) return;
      const u = jobs.shift();
      try {
        let r = await c.match(u);
        if (!r) {
          const f = await fetch(u); if (!f.ok) throw new Error(f.status);
          const buf = await f.arrayBuffer(); bytes += buf.byteLength;
          await c.put(u, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } }));
        } else { const b = await r.clone().arrayBuffer().catch(() => null); if (b) bytes += b.byteLength; }
      } catch (e) { failed++; }
      done++; if (onProgress) onProgress(done, urls.length, bytes);
    }
  };
  await Promise.all(Array.from({ length: 6 }, run));
  if (cancelled && cancelled()) return null;
  await c.put(LISTS + id, new Response(JSON.stringify(urls), { headers: { 'Content-Type': 'application/json' } }));
  const a = { id, name: meta.name || 'Saved area', box: meta.box, at: Date.now(), count: urls.length, bytes, failed };
  const l = aload(); l.unshift(a); asave(l);
  return a;
}
async function dropArea(id){
  const c = await cache(); const l = aload(), a = l.find(x => x.id === id); if (!a) return;
  asave(l.filter(x => x.id !== id));
  if (!c) return;
  const mine = await areaUrls(id), keep = new Set(load().flatMap(x => x.urls || []));
  for (const b of aload()) (await areaUrls(b.id)).forEach(u => keep.add(u));
  await Promise.all(mine.filter(u => !keep.has(u)).map(u => c.delete(u)));
  await c.delete(LISTS + id);
}
function areas(){ return aload(); }
function covers(lat, lon){
  const a = aload().find(x => x.box && lat <= x.box.n && lat >= x.box.s && lon >= x.box.w && lon <= x.box.e);
  if (a) return { kind: 'area', name: a.name };
  const k = load().find(x => { const p = (x.key || '').split(',').map(Number); return p.length === 2 && Math.abs(p[0] - lat) < 0.01 && Math.abs(p[1] - lon) < 0.015; });
  return k ? { kind: 'spot', name: k.name } : null;
}

window.NoctoOffline = { begin, get, put, list, KEEP, saveArea, areas, dropArea, covers };
})();
