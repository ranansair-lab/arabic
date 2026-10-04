// Offline support: network-first for the app shell and manifest (so new
// recordings appear), cache-first for hashed assets, fonts and audio.
const CACHE = 'arabic-reading-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  const networkFirst = req.mode === 'navigate' || url.pathname.endsWith('manifest.json') || url.pathname.endsWith('/');
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (networkFirst) {
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      }
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })(),
  );
});
