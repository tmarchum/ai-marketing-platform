// AI Marketing Platform — Service Worker
// Strategy: network-first for app shell (HTML/JS/CSS), cache fallback only when offline.
// This guarantees users always get the latest deploy instead of stale cached bundles.
const CACHE = 'marketing-ai-v5';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never intercept API, short-links, or landing-page routes — always go to network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/') || url.pathname.startsWith('/l/')) return;

  // Network-first for everything else (HTML, JS, CSS, assets).
  // Falls back to cached copy only if the network fails (offline).
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200 && r.type !== 'opaque') {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
