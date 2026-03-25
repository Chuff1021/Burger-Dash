const CACHE_NAME = 'burger-dash-v1';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './js/characters.js',
  './js/player.js',
  './js/world.js',
  './js/obstacles.js',
  './js/collectibles.js',
  './js/ui.js',
  './js/audio.js',
  './js/effects.js',
  './js/save.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.url.includes('cdn.jsdelivr.net')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
