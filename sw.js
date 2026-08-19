const APP_VERSION = '3.8.0';
const CACHE_NAME = 'mamali-orbit-v3.8.0';
const OFFLINE_DOCUMENT = './index.html';
const APP_SHELL = [
  './',
  OFFLINE_DOCUMENT,
  './assets/styles.css?v=3.8.0',
  './assets/app.js?v=3.8.0',
  './assets/favicon.svg',
  './assets/social-preview.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    } catch {}
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('mamali-orbit-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION' && event.ports[0]) {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (url.pathname.includes('oauth') || url.hostname.includes('google')) return;

  event.respondWith((async () => {
    try {
      const preload = request.mode === 'navigate' ? await event.preloadResponse : null;
      const response = preload || await fetch(request, { cache: 'no-cache' });
      if (response?.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(()=>{});
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
