/* Noctography offline store for Scout HD.

   Every map tile, height tile and surface answer fetched for a location is kept in the browser's
   Cache Storage under that location. The five most recent locations are kept; opening a sixth
   drops the oldest. A cached answer is always used first, so a saved location opens with no signal.

   NoctoOffline.begin(key)   start recording answers under this location
   NoctoOffline.get(url)     ArrayBuffer or null
   NoctoOffline.put(url, buf)
   NoctoOffline.list()       [{ key, name, at, count }] newest first
*/
(function(){
if (window.NoctoOffline) return;
const NAME = 'noctography-scout-v1', KEEP = 5, IDX = 'noctography.scoutOffline';
let cur = null, cacheP = null, pending = new Set();
const cache = () => cacheP || (cacheP = ('caches' in window ? caches.open(NAME) : Promise.reject()).catch(() => null));
const load = () => { try { return JSON.parse(localStorage.getItem(IDX) || '[]'); } catch (e) { return []; } };
const save = l => { try { localStorage.setItem(IDX, JSON.stringify(l)); } catch (e) {} };

async function evict(list){
  const c = await cache(); if (!c) return list;
  while (list.length > KEEP) {
    const old = list.pop();
    /* a URL shared with a kept location stays */
    const keep = new Set(list.flatMap(l => l.urls || []));
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

window.NoctoOffline = { begin, get, put, list, KEEP };
})();
