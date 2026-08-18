const CACHE_NAME = 'mamali-orbit-v2.2.0';
const OFFLINE_DOCUMENT = './index.html';
const APP_SHELL = [
  './',
  OFFLINE_DOCUMENT,
  './assets/styles.css?v=2.2.0',
  './assets/app.js?v=2.2.0',
  './assets/favicon.svg',
  './assets/social-preview.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Online-first: always revalidate with the network. The cache is only the
  // resilience layer used when the device is offline or the network fails.
  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok) {
        const update = caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        event.waitUntil(update);
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const offlineDocument = await caches.match(OFFLINE_DOCUMENT);
        if (offlineDocument) return offlineDocument;
      }
      return Response.error();
    }
  })());
});
