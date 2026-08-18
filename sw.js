const APP_VERSION = '3.2.0';
const CACHE_NAME = 'mamali-orbit-v3.2.0';
const OFFLINE_DOCUMENT = './index.html';
const APP_SHELL = [
  './',
  OFFLINE_DOCUMENT,
  './assets/styles.css?v=3.2.0',
  './assets/app.js?v=3.2.0',
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
  // A new worker waits until the user confirms the update in Update Center.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
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

  // Update metadata must always prove a live connection. It never falls back
  // to Cache, so the interface can reliably become disabled while offline.
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Online-first app shell: newest network response online, cache only when
  // the device is offline or the network request genuinely fails.
  event.respondWith((async () => {
    try {
      const preload = request.mode === 'navigate' ? await event.preloadResponse : null;
      const response = preload || await fetch(request, { cache: 'no-cache' });
      if (response?.ok) {
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
