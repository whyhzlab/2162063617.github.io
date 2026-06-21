// Service Worker - v20260621200513
// Auto-generated. Do not edit by hand.

const CACHE_VERSION = '20260621200513';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/offline/",
  "/manifest.webmanifest"
];

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

        await cache.put(request, response);
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
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return caches.match('/offline/').then((offlineResponse) => offlineResponse || Response.error());
        }))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (response.ok && response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
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

console.log('[SW] Service Worker v20260621200513 loaded');
