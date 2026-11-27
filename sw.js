// Self-destructing service worker — clears itself and all caches on any install/activate.
// We deliberately removed the PWA caching layer because it was serving stale bundles.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
    try {
      const regs = await self.registration.unregister();
    } catch {}
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
// No fetch handler — let browser handle requests normally
