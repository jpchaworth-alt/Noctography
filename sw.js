/* Noctography service worker: keeps the app and Scout themselves, so they open with no signal.
   Pages: the network first, the kept copy when there is none. Scripts and pictures: the kept copy at
   once, refreshed behind it. The ground tiles are Scout's own store (noctography-scout-v1), read here
   too so a saved area draws offline. Forecasts and other live answers are never kept. */
const SHELL = 'noctography-shell-2.0.3-b19';
const TILES = 'noctography-scout-v1';
const PRE = ["app/","app/index.html","scout/","scout/index.html","support.js","favicon.png","manifest.webmanifest","assets/noctography-icon-graded.png","assets/noctography-icon-128.png","assets/logo/obsidian.png","assets/logo-roundel.png","scout-ds/fonts.css","scout-ds/_ds_bundle.js","noctography-engine.js","noctography-sat.js","noctography-plan.js","noctography-ar.js","noctography-log.js","noctography-terrain.js","noctography-scout.js","noctography-comp.js","noctography-sightings.js","noctography-backup.js","noctography-sync.js","noctography-eclipse-data.js","noctography-eclipse.js","noctography-offline.js","noctography-surfaces.js","noctography-scout-hd.js"];
const KEEP_HOSTS = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdn\.jsdelivr\.net)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRE.map(p => c.add(new Request(new URL(p, self.registration.scope), { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('noctography-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req){
  const c = await caches.open(SHELL);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    return (await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || Response.error();
  }
}
async function keptFirst(req){
  const c = await caches.open(SHELL);
  const hit = (await c.match(req)) || null;
  const fresh = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) return hit;
  const r = await fresh;
  return r || (await c.match(req, { ignoreSearch: true })) || Response.error();
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    const page = req.mode === 'navigate' || /\.html?$/.test(u.pathname) || u.pathname.endsWith('/');
    e.respondWith(page ? networkFirst(req) : keptFirst(req));
    return;
  }
  if (KEEP_HOSTS.test(u.hostname)) { e.respondWith(keptFirst(req)); return; }
  /* ground tiles: Scout's own store, if it has them; otherwise straight to the network */
  e.respondWith(caches.open(TILES).then(c => c.match(req.url)).then(hit => hit || fetch(req)).catch(() => fetch(req)));
});
