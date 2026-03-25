// Service worker disabled during development - forces fresh loads
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  // Delete ALL old caches immediately
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});
// No fetch handler = no caching = always fresh files
