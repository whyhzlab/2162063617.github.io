// Service Worker - v20260624101428
// Auto-generated. Do not edit by hand.

const CACHE_VERSION = '20260624101428';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/offline/",
  "/manifest.webmanifest"
];

function getContentType(response) {
  return (response.headers.get('content-type') || '').toLowerCase();
}

function getPathname(request) {
  try {
    return new URL(request.url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function isCacheablePrecacheResponse(url, response) {
  if (!response.ok || response.status !== 200) {
    return false;
  }

  const contentType = getContentType(response);
  if (url === '/offline/') {
    return contentType.includes('text/html');
  }

  if (url === '/manifest.webmanifest') {
    return contentType.includes('application/manifest+json') || contentType.includes('application/json');
  }

  return false;
}

function isCacheableAssetResponse(request, response) {
  if (!response.ok || response.status !== 200) {
    return false;
  }

  const contentType = getContentType(response);
  const destination = request.destination || '';
  const pathname = getPathname(request);

  if (destination === 'image' || /\.(avif|webp|png|jpe?g|gif|svg|bmp|ico)$/i.test(pathname)) {
    return contentType.startsWith('image/');
  }

  if (destination === 'style' || pathname.endsWith('.css')) {
    return contentType.includes('text/css');
  }

  if (destination === 'script' || pathname.endsWith('.js')) {
    return contentType.includes('javascript') || contentType.includes('ecmascript');
  }

  if (destination === 'font' || /\.(woff2?|ttf|otf|eot)$/i.test(pathname)) {
    return contentType.startsWith('font/') || contentType.includes('font/');
  }

  if (destination === 'audio' || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(pathname)) {
    return contentType.startsWith('audio/');
  }

  if (destination === 'video' || /\.(mp4|webm|mov|m4v|ogv)$/i.test(pathname)) {
    return contentType.startsWith('video/');
  }

  if (destination === 'manifest' || pathname.endsWith('.webmanifest')) {
    return contentType.includes('application/manifest+json') || contentType.includes('application/json');
  }

  if (pathname.endsWith('.json')) {
    return contentType.includes('application/json') || contentType.includes('text/json');
  }

  // Never cache HTML shells under asset URLs. Front-door challenge pages use 200 + text/html
  // and would otherwise poison image/font/data requests, which is what leads to alt text.
  return !contentType.includes('text/html');
}

async function cacheResponse(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function precacheResources() {
  const cache = await caches.open(PRECACHE_NAME);

  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        const request = new Request(url, { cache: 'reload' });
        const response = await fetch(request);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        if (!isCacheablePrecacheResponse(url, response)) {
          throw new Error(`Unexpected content-type: ${getContentType(response)}`);
        }

        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('[SW] Skipping precache for', url, error);
      }
    })
  );
}

self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);

  event.waitUntil(
    precacheResources().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== PRECACHE_NAME && name !== RUNTIME_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Let the browser handle third-party requests directly so CSP only applies
  // to the resource type itself instead of our Fetch API proxy.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return caches.match('/offline/').then((offlineResponse) => offlineResponse || Response.error());
        }))
    );
    return;
  }

  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request));
    return;
  }

  const networkFirstPaths = ['/scss/', '/ts/', '/vendor/', '/js/'];
  const useNetworkFirst = networkFirstPaths.some((prefix) => url.pathname.startsWith(prefix))
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js');

  if (url.origin === self.location.origin) {
    if (useNetworkFirst) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (isCacheableAssetResponse(request, response)) {
              cacheResponse(RUNTIME_NAME, request, response);
            }
            return response;
          })
          .catch(() => caches.match(request).then((cached) => cached || Response.error()))
      );
      return;
    }

    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse && isCacheableAssetResponse(request, cachedResponse)) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (isCacheableAssetResponse(request, response)) {
                cacheResponse(RUNTIME_NAME, request, response);
              }

              return response;
            });
        })
    );
    return;
  }

}); 

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v20260624101428 loaded');
