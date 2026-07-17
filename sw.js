// Service Worker - v85d95adf
// Auto-generated. Do not edit by hand.

const CACHE_VERSION = '85d95adf';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `pages-${CACHE_VERSION}`;
const ASSET_CACHE_NAME = `assets-${CACHE_VERSION}`;
const CACHE_TIMESTAMP_HEADER = 'x-stack-cache-time';

const SAME_ORIGIN = self.location.origin;
const BASE_URL = new URL('./', self.location.href);
const SW_URL = new URL(self.location.href);
const SW_PATHNAME = SW_URL.pathname;
const OFFLINE_URL = new URL('offline/', BASE_URL).pathname;
const MANIFEST_URL = new URL('manifest.webmanifest', BASE_URL).pathname;
const MAX_PAGE_ENTRIES = 40;
// Asset cache holds both fingerprinted (immutable, long-lived) and
// non-fingerprinted entries (scss/ts/vendor roots, json, images). 300 keeps a
// comfortable headroom so frequent deploys don't evict still-useful entries;
// lowering it (e.g. 150) risks re-fetching assets that were already cached.
const MAX_ASSET_ENTRIES = 300;
const MAX_PAGE_AGE_MS = 4 * 60 * 60 * 1000;

const PRECACHE_URLS = [
  OFFLINE_URL,
  MANIFEST_URL
];

function resolveBasePath(relativePath) {
  return new URL(relativePath, BASE_URL).pathname;
}

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

  if (url === MANIFEST_URL) {
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
  return pathname === MANIFEST_URL
    || pathname === resolveBasePath('favicon.ico')
    || pathname.startsWith(resolveBasePath('scss/'))
    || pathname.startsWith(resolveBasePath('ts/'))
    || pathname.startsWith(resolveBasePath('vendor/'))
    || pathname.startsWith(resolveBasePath('generated/'))
    || pathname.startsWith(resolveBasePath('images/'))
    || pathname.startsWith(resolveBasePath('img/'))
    || pathname.startsWith(resolveBasePath('fonts/'))
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

function getCachedResponseAge(response) {
  const cachedAt = Number(response.headers.get(CACHE_TIMESTAMP_HEADER));
  if (Number.isFinite(cachedAt) && cachedAt > 0) {
    return Math.max(0, Date.now() - cachedAt);
  }

  const dateHeader = response.headers.get('date');
  if (!dateHeader) {
    return -1;
  }
  const timestamp = Date.parse(dateHeader);
  if (!Number.isFinite(timestamp)) {
    return -1;
  }
  return Date.now() - timestamp;
}

function withCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHE_TIMESTAMP_HEADER, String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function trimCache(cacheName, maxEntries, maxAgeMs = 0) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length === 0) {
    return;
  }

  // Fast path: no TTL eviction and under the count limit.
  if (maxAgeMs <= 0 && keys.length <= maxEntries) {
    return;
  }

  const staleKeys = [];
  const freshKeys = [];

  for (const key of keys) {
    if (maxAgeMs > 0) {
      try {
        const response = await cache.match(key);
        if (response && getCachedResponseAge(response) >= maxAgeMs) {
          staleKeys.push(key);
          continue;
        }
      } catch {
        // If we can't inspect the entry, treat it as fresh to avoid premature eviction.
      }
    }
    freshKeys.push(key);
  }

  await Promise.all(staleKeys.map((key) => cache.delete(key)));

  if (freshKeys.length <= maxEntries) {
    return;
  }

  const excessKeys = freshKeys.slice(0, freshKeys.length - maxEntries);
  await Promise.all(excessKeys.map((key) => cache.delete(key)));
}

async function cacheResponse(cacheName, request, response, maxEntries, maxAgeMs = 0) {
  const cache = await caches.open(cacheName);
  await cache.put(request, withCacheTimestamp(response));
  await trimCache(cacheName, maxEntries, maxAgeMs);
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
      await cacheResponse(ASSET_CACHE_NAME, request, response.clone(), MAX_ASSET_ENTRIES);
    }
  } catch (error) {
    console.warn('[SW] Asset refresh failed for', request.url, error);
  }
}

function fetchAndCachePage(event, request, cacheKey) {
  const responsePromise = fetch(request);
  const cachePromise = responsePromise.then((response) => {
    if (!isCacheablePageResponse(response)) {
      return undefined;
    }

    return cacheResponse(
      PAGE_CACHE_NAME,
      cacheKey,
      response.clone(),
      MAX_PAGE_ENTRIES,
      MAX_PAGE_AGE_MS
    );
  });

  // Register the cache write while the fetch event is active, but return the
  // network response without waiting for Cache Storage I/O or cache trimming.
  event.waitUntil(cachePromise.catch(() => undefined));
  return responsePromise;
}

async function handleNavigationRequest(event) {
  const { request } = event;
  const cacheKey = normalizePageUrl(request);
  const cachedResponse = await matchCachedPage(request);

  if (cachedResponse) {
    const cachedAge = getCachedResponseAge(cachedResponse);

    if (cachedAge < 0 || cachedAge < MAX_PAGE_AGE_MS) {
      // Fresh cached HTML is served immediately and refreshed in the background.
      fetchAndCachePage(event, request, cacheKey).catch(() => {});
      return cachedResponse;
    }

    // Stale cached HTML goes network-first; keep it as an offline fallback.
    try {
      return await fetchAndCachePage(event, request, cacheKey);
    } catch {
      return cachedResponse;
    }
  }

  // No cached HTML — go to network, cache a successful response, return it.
  try {
    return await fetchAndCachePage(event, request, cacheKey);
  } catch {
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || Response.error();
  }
}

async function handleNetworkFirstAsset(event) {
  const { request } = event;

  try {
    const response = await fetch(request);

    if (isCacheableAssetResponse(request, response)) {
      event.waitUntil(cacheResponse(ASSET_CACHE_NAME, request, response.clone(), MAX_ASSET_ENTRIES));
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function handleCacheFirstAsset(event) {
  const { request } = event;
  const cachedResponse = await caches.match(request);

  if (cachedResponse && isCacheableAssetResponse(request, cachedResponse)) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (isCacheableAssetResponse(request, response)) {
      event.waitUntil(cacheResponse(ASSET_CACHE_NAME, request, response.clone(), MAX_ASSET_ENTRIES));
    }

    return response;
  } catch {
    return Response.error();
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
      event.waitUntil(cacheResponse(ASSET_CACHE_NAME, request, response.clone(), MAX_ASSET_ENTRIES));
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

  if (url.pathname === SW_PATHNAME) {
    event.respondWith(fetch(request));
    return;
  }

  // Hugo 生产环境通过 resources.Fingerprint "sha256" 对 JS/CSS 做指纹化；
  // 预生成图片的内容摘要位于 /generated/image-variants/<source>/<digest>/。
  // 这些 URL 内容寻址且不可变，直接 cache-first，避免每次命中后重复 fetch
  // 和 Cache.put。无指纹入口仍走 network-first 以保证更新及时生效。
  const fingerprintPattern = /[.-][a-f0-9]{8,}\.(js|css|mjs)$/i;
  const isFingerprinted = fingerprintPattern.test(url.pathname);
  const isGeneratedImageVariant = url.pathname.startsWith(resolveBasePath('generated/image-variants/'));

  if (isFingerprinted || isGeneratedImageVariant) {
    event.respondWith(handleCacheFirstAsset(event));
    return;
  }

  const networkFirstPaths = [
    resolveBasePath('scss/'),
    resolveBasePath('ts/'),
    resolveBasePath('vendor/'),
    resolveBasePath('js/')
  ];
  const isNetworkFirstCandidate = networkFirstPaths.some((prefix) => url.pathname.startsWith(prefix))
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.mjs')
    || url.pathname.endsWith('.json')
    || url.pathname.endsWith('.webmanifest');

  if (isNetworkFirstCandidate) {
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

console.log('[SW] Service Worker v85d95adf loaded');
