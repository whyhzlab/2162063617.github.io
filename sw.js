// Service Worker - v20260627221743
// Auto-generated. Do not edit by hand.

const CACHE_VERSION = '20260627221743';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `pages-${CACHE_VERSION}`;
const ASSET_CACHE_NAME = `assets-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline/';
const SAME_ORIGIN = self.location.origin;
const MAX_PAGE_ENTRIES = 40;
const MAX_ASSET_ENTRIES = 180;

const PRECACHE_URLS = [
  "/offline/",
  "/manifest.webmanifest"
];

function getContentType(response) {
  return (response.headers.get('content-type') || '').toLowerCase();
}

function getPathname(input) {
  try {
    const rawUrl = typeof input === 'string' ? input : input.url;
    return new URL(rawUrl, SAME_ORIGIN).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function normalizePageUrl(input) {
  try {
    const rawUrl = typeof input === 'string' ? input : input.url;
    const url = new URL(rawUrl, SAME_ORIGIN);
    url.hash = '';

    if (url.pathname && !url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      url.pathname = `${url.pathname}/`;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return typeof input === 'string' ? input : input.url;
  }
}

function isCacheablePrecacheResponse(url, response) {
  if (!response.ok || response.status !== 200) {
    return false;
  }

  const contentType = getContentType(response);
  if (url === OFFLINE_URL) {
    return contentType.includes('text/html');
  }

  if (url === '/manifest.webmanifest') {
    return contentType.includes('application/manifest+json') || contentType.includes('application/json');
  }

  return false;
}

function isCacheablePageResponse(response) {
  return response.ok
    && response.status === 200
    && getContentType(response).includes('text/html');
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

  if (destination === 'script' || pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
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

function isLikelyAssetPath(pathname) {
  return pathname === '/manifest.webmanifest'
    || pathname === '/favicon.ico'
    || pathname.startsWith('/scss/')
    || pathname.startsWith('/ts/')
    || pathname.startsWith('/vendor/')
    || pathname.startsWith('/generated/')
    || pathname.startsWith('/images/')
    || pathname.startsWith('/img/')
    || pathname.startsWith('/fonts/')
    || /\.(css|js|mjs|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i.test(pathname);
}

function normalizeSameOriginAssetUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, SAME_ORIGIN);
    if (url.origin !== SAME_ORIGIN) {
      return '';
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return '';
  }
}

function extractSrcsetUrls(value) {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractOfflineAssetUrls(html) {
  const assetUrls = new Set();
  const pushAsset = (rawUrl) => {
    const normalizedUrl = normalizeSameOriginAssetUrl(rawUrl);
    if (!normalizedUrl) {
      return;
    }

    if (isLikelyAssetPath(getPathname(normalizedUrl))) {
      assetUrls.add(normalizedUrl);
    }
  };

  const linkPattern = /<link\b[^>]+href=["']([^"']+)["']/gi;
  const scriptPattern = /<script\b[^>]+src=["']([^"']+)["']/gi;
  const imgPattern = /<img\b[^>]+src=["']([^"']+)["']/gi;
  const sourcePattern = /<source\b[^>]+srcset=["']([^"']+)["']/gi;
  const imageSrcsetPattern = /<img\b[^>]+srcset=["']([^"']+)["']/gi;

  for (const pattern of [linkPattern, scriptPattern, imgPattern]) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      pushAsset(match[1]);
    }
  }

  for (const pattern of [sourcePattern, imageSrcsetPattern]) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      extractSrcsetUrls(match[1]).forEach(pushAsset);
    }
  }

  assetUrls.delete(OFFLINE_URL);
  return [...assetUrls];
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) {
    return;
  }

  const staleKeys = keys.slice(0, keys.length - maxEntries);
  await Promise.all(staleKeys.map((key) => cache.delete(key)));
}

async function cacheResponse(cacheName, request, response, maxEntries) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cacheName, maxEntries);
}

async function cacheOfflineAssets(assetUrls, cache) {
  await Promise.all(
    assetUrls.map(async (url) => {
      try {
        const request = new Request(url, { cache: 'reload' });
        const response = await fetch(request);

        if (!isCacheableAssetResponse(request, response) && !isCacheablePrecacheResponse(url, response)) {
          throw new Error(`Unexpected content-type: ${getContentType(response)}`);
        }

        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('[SW] Skipping offline asset precache for', url, error);
      }
    })
  );
}

async function precacheResources() {
  const cache = await caches.open(PRECACHE_NAME);
  const offlineAssetUrls = new Set();

  for (const url of PRECACHE_URLS) {
    try {
      const request = new Request(url, { cache: 'reload' });
      const response = await fetch(request);

      if (!isCacheablePrecacheResponse(url, response)) {
        throw new Error(`Unexpected content-type: ${getContentType(response)}`);
      }

      await cache.put(request, response.clone());

      if (url === OFFLINE_URL) {
        const html = await response.clone().text();
        extractOfflineAssetUrls(html).forEach((assetUrl) => offlineAssetUrls.add(assetUrl));
      }
    } catch (error) {
      console.warn('[SW] Skipping precache for', url, error);
    }
  }

  if (offlineAssetUrls.size > 0) {
    await cacheOfflineAssets([...offlineAssetUrls], cache);
  }
}

async function matchCachedPage(request) {
  return caches.match(normalizePageUrl(request));
}

async function refreshAssetCache(request) {
  try {
    const response = await fetch(request);
    if (isCacheableAssetResponse(request, response)) {
      await cacheResponse(ASSET_CACHE_NAME, request, response, MAX_ASSET_ENTRIES);
    }
  } catch (error) {
    console.warn('[SW] Asset refresh failed for', request.url, error);
  }
}

async function handleNavigationRequest(event) {
  const { request } = event;
  const cacheKey = normalizePageUrl(request);

  try {
    const response = await fetch(request);

    if (isCacheablePageResponse(response)) {
      event.waitUntil(cacheResponse(PAGE_CACHE_NAME, cacheKey, response, MAX_PAGE_ENTRIES));
    }

    return response;
  } catch {
    const cachedResponse = await matchCachedPage(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || Response.error();
  }
}

async function handleNetworkFirstAsset(event) {
  const { request } = event;

  try {
    const response = await fetch(request);

    if (isCacheableAssetResponse(request, response)) {
      event.waitUntil(cacheResponse(ASSET_CACHE_NAME, request, response, MAX_ASSET_ENTRIES));
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function handleStaleWhileRevalidateAsset(event) {
  const { request } = event;
  const cachedResponse = await caches.match(request);

  if (cachedResponse && isCacheableAssetResponse(request, cachedResponse)) {
    event.waitUntil(refreshAssetCache(request));
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (isCacheableAssetResponse(request, response)) {
      event.waitUntil(cacheResponse(ASSET_CACHE_NAME, request, response, MAX_ASSET_ENTRIES));
    }

    return response;
  } catch {
    return cachedResponse || Response.error();
  }
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
          .filter((name) => ![PRECACHE_NAME, PAGE_CACHE_NAME, ASSET_CACHE_NAME].includes(name))
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

  if (request.headers.has('range')) {
    return;
  }

  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Let the browser handle third-party requests directly so CSP only applies
  // to the resource type itself instead of our Fetch API proxy.
  if (url.origin !== SAME_ORIGIN) {
    return;
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request));
    return;
  }

  const networkFirstPaths = ['/scss/', '/ts/', '/vendor/', '/js/'];
  const useNetworkFirst = networkFirstPaths.some((prefix) => url.pathname.startsWith(prefix))
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.mjs')
    || url.pathname.endsWith('.json')
    || url.pathname.endsWith('.webmanifest');

  if (useNetworkFirst) {
    event.respondWith(handleNetworkFirstAsset(event));
    return;
  }

  event.respondWith(handleStaleWhileRevalidateAsset(event));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v20260627221743 loaded');
