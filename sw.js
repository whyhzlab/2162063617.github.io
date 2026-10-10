// Service Worker - v95bdac97
// Auto-generated. Do not edit by hand.

const CACHE_VERSION = '95bdac97';
const CACHE_TIMESTAMP_HEADER = 'x-stack-cache-time';

const SAME_ORIGIN = self.location.origin;
const BASE_URL = new URL('./', self.location.href);
const CACHE_PREFIX = `stack:${encodeURIComponent(BASE_URL.pathname)}:`;
const PRECACHE_NAME = `${CACHE_PREFIX}precache-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const ASSET_CACHE_NAME = `${CACHE_PREFIX}assets-${CACHE_VERSION}`;
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
// Cache Storage keys() walks the complete cache. Batch writes so bursts of
// images/scripts do not repeat that O(n) scan after every cache.put(). A cache
// may temporarily exceed its target by at most one small batch.
const CACHE_TRIM_BATCH_SIZE = 8;
// A hover prefetch is commonly consumed within seconds. Revalidating that
// freshly cached page on click wastes a full HTML transfer without improving
// freshness, so defer background refreshes until the entry has aged a little.
const MIN_PAGE_REVALIDATE_AGE_MS = 30 * 1000;

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

function isWithinScope(url) {
  return url.origin === SAME_ORIGIN && url.pathname.startsWith(BASE_URL.pathname);
}

function forbidsOfflineCache(headers) {
  const policy = headers.get('cache-control') || '';
  return /(?:^|,)\s*(?:no-store|private|no-cache)\b/i.test(policy)
    || /\bno-cache\b/i.test(headers.get('pragma') || '');
}

function isPublicCacheResponse(response) {
  if (!response.ok || response.status !== 200 || response.redirected
      || !['basic', 'default'].includes(response.type)
      || forbidsOfflineCache(response.headers)) {
    return false;
  }
  // Timestamping constructs a new Response. Never promote a CORS or redirected
  // body into same-origin cached HTML, or persist credential-varying responses.
  const vary = (response.headers.get('vary') || '').toLowerCase().split(',').map(value => value.trim());
  if (vary.some(value => ['*', 'cookie', 'authorization'].includes(value))) return false;
  try {
    return !response.url || isWithinScope(new URL(response.url));
  } catch {
    return false;
  }
}

function getPathname(input) {
  try {
    const rawUrl = typeof input === 'string' ? input : input.url;
    return new URL(rawUrl, SAME_ORIGIN).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function isFingerprintedAssetPath(pathname) {
  const fingerprintPattern = /[.-][a-f0-9]{8,}\.(js|css|mjs)$/i;
  const hugoImagePattern = /_hu_[a-f0-9]{8,}\.(avif|webp|jpe?g|png)$/i;
  return fingerprintPattern.test(pathname) || hugoImagePattern.test(pathname);
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

function isHtmlNavigationRequest(request) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return true;
  }

  // Chromium exposes <link rel="prefetch" as="document"> with an empty
  // destination and Sec-Purpose: prefetch. Treat extensionless prefetches as
  // pages so the later Swup request can reuse the response from Cache Storage.
  const purpose = (request.headers.get('sec-purpose') || request.headers.get('purpose') || '').toLowerCase();
  if (purpose.includes('prefetch') && !isLikelyAssetPath(getPathname(request))) {
    return true;
  }

  const requestedWith = (request.headers.get('x-requested-with') || '').toLowerCase();
  const accept = (request.headers.get('accept') || '').toLowerCase();
  return requestedWith === 'swup' && accept.includes('text/html');
}

function isCacheablePrecacheResponse(url, response) {
  if (!isPublicCacheResponse(response)) {
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
  return isPublicCacheResponse(response)
    && getContentType(response).includes('text/html');
}

function isCacheableAssetResponse(request, response) {
  if (!isPublicCacheResponse(response)) {
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
    if (!isWithinScope(url)) {
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
  assetUrls.delete(MANIFEST_URL);
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

  // The cache is already bounded. TTL affects response freshness in
  // handleNavigationRequest; storage cleanup only needs to scan once the
  // entry limit is exceeded.
  if (keys.length <= maxEntries) {
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

const cacheWriteCounts = new Map();
const pendingCacheTrims = new Map();
// Service workers are routinely terminated between visits. Scan once on the
// first write of each worker lifetime so an over-limit persistent cache cannot
// evade trimming merely because every lifetime performs fewer than one batch.
const initializedCacheTrims = new Set();

function runScheduledCacheTrim(cacheName, maxEntries, maxAgeMs) {
  const pending = pendingCacheTrims.get(cacheName);
  if (pending) {
    return pending;
  }

  cacheWriteCounts.set(cacheName, 0);
  let request;
  request = trimCache(cacheName, maxEntries, maxAgeMs).finally(() => {
    if (pendingCacheTrims.get(cacheName) === request) {
      pendingCacheTrims.delete(cacheName);
    }

    // Writes can finish while keys() is scanning. Preserve their count and
    // immediately run one follow-up batch only when they reach the threshold.
    if ((cacheWriteCounts.get(cacheName) || 0) >= CACHE_TRIM_BATCH_SIZE) {
      return runScheduledCacheTrim(cacheName, maxEntries, maxAgeMs);
    }
    return undefined;
  });
  pendingCacheTrims.set(cacheName, request);
  return request;
}

function scheduleCacheTrim(cacheName, maxEntries, maxAgeMs = 0) {
  const writeCount = (cacheWriteCounts.get(cacheName) || 0) + 1;
  cacheWriteCounts.set(cacheName, writeCount);
  if (!initializedCacheTrims.has(cacheName)) {
    initializedCacheTrims.add(cacheName);
    return runScheduledCacheTrim(cacheName, maxEntries, maxAgeMs);
  }
  if (writeCount < CACHE_TRIM_BATCH_SIZE) {
    return Promise.resolve();
  }

  return runScheduledCacheTrim(cacheName, maxEntries, maxAgeMs);
}

async function cacheResponse(cacheName, request, response, maxEntries, maxAgeMs = 0) {
  const cache = await caches.open(cacheName);
  await cache.put(request, withCacheTimestamp(response));
  await scheduleCacheTrim(cacheName, maxEntries, maxAgeMs);
}

async function cacheOfflineAssets(assetUrls, cache) {
  await Promise.all(
    assetUrls.map(async (url) => {
      try {
        const request = isFingerprintedAssetPath(getPathname(url))
          ? new Request(url)
          : new Request(url, { cache: 'reload' });
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

async function matchScopedCache(request, cacheNames, isValid) {
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const response = await cache.match(request);
    if (!response) continue;
    if (isValid(response)) return response;
    await cache.delete(request);
  }
  return undefined;
}

async function deleteScopedCache(request, cacheNames) {
  await Promise.all(cacheNames.map(async name => {
    const cache = await caches.open(name);
    await cache.delete(request);
  }));
}

function pageCacheKey(request) {
  return new Request(new URL(normalizePageUrl(request), SAME_ORIGIN), { headers: request.headers });
}

async function matchCachedPage(request) {
  return matchScopedCache(pageCacheKey(request), [PAGE_CACHE_NAME, PRECACHE_NAME], isCacheablePageResponse);
}

async function matchCachedAsset(request) {
  return matchScopedCache(request, [ASSET_CACHE_NAME, PRECACHE_NAME], response => isCacheableAssetResponse(request, response));
}

function updateAssetCache(request, response) {
  if (isCacheableAssetResponse(request, response)) {
    return cacheResponse(ASSET_CACHE_NAME, request, response.clone(), MAX_ASSET_ENTRIES);
  }
  return deleteScopedCache(request, [ASSET_CACHE_NAME, PRECACHE_NAME]);
}

async function refreshAssetCache(request) {
  try {
    const response = await fetch(request);
    await updateAssetCache(request, response);
  } catch (error) {
    console.warn('[SW] Asset refresh failed for', request.url, error);
  }
}

function fetchAndCachePage(event, request, cacheKey) {
  const responsePromise = fetch(request);
  const cachePromise = responsePromise.then((response) => {
    if (!isCacheablePageResponse(response)) {
      return deleteScopedCache(cacheKey, [PAGE_CACHE_NAME, PRECACHE_NAME]);
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
  const cacheKey = pageCacheKey(request);
  const cachedResponse = await matchCachedPage(request);

  if (cachedResponse) {
    const cachedAge = getCachedResponseAge(cachedResponse);

    if (cachedAge < 0 || cachedAge < MAX_PAGE_AGE_MS) {
      // Fresh cached HTML is served immediately and refreshed in the background.
      // A just-completed hover prefetch is already current; avoid fetching the
      // same document again when the user clicks it a moment later.
      if (cachedAge < 0 || cachedAge >= MIN_PAGE_REVALIDATE_AGE_MS) {
        fetchAndCachePage(event, request, cacheKey).catch(() => {});
      }
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
    const offlineResponse = await matchScopedCache(OFFLINE_URL, [PRECACHE_NAME], isCacheablePageResponse);
    return offlineResponse || Response.error();
  }
}

async function handleNetworkFirstAsset(event) {
  const { request } = event;

  try {
    const response = await fetch(request);

    event.waitUntil(updateAssetCache(request, response));

    return response;
  } catch {
    const cached = await matchCachedAsset(request);
    return cached || Response.error();
  }
}

async function handleCacheFirstAsset(event) {
  const { request } = event;
  const cachedResponse = await matchCachedAsset(request);

  if (cachedResponse && isCacheableAssetResponse(request, cachedResponse)) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    event.waitUntil(updateAssetCache(request, response));

    return response;
  } catch {
    return Response.error();
  }
}

async function handleStaleWhileRevalidateAsset(event) {
  const { request } = event;
  const cachedResponse = await matchCachedAsset(request);

  if (cachedResponse && isCacheableAssetResponse(request, cachedResponse)) {
    event.waitUntil(refreshAssetCache(request));
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    event.waitUntil(updateAssetCache(request, response));

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
          .filter((name) => name.startsWith(CACHE_PREFIX)
            && ![PRECACHE_NAME, PAGE_CACHE_NAME, ASSET_CACHE_NAME].includes(name))
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

  if (request.headers.has('authorization') || forbidsOfflineCache(request.headers)
      || ['no-store', 'no-cache', 'reload'].includes(request.cache)) {
    return;
  }

  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Let the browser handle third-party requests directly so CSP only applies
  // to the resource type itself instead of our Fetch API proxy.
  if (!isWithinScope(url)) {
    return;
  }

  if (isHtmlNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (url.pathname === SW_PATHNAME) {
    event.respondWith(fetch(request));
    return;
  }

  // Only static resources belong in the offline asset cache.
  if (!isLikelyAssetPath(url.pathname)) return;

  // Hugo 生产环境通过 resources.Fingerprint "sha256" 对 JS/CSS 做指纹化。
  // 原生 Hugo 图像处理资源带有 `_hu_<hash>`，同样是内容/转换寻址的不可变 URL。
  // 这些 URL 直接 cache-first，避免每次命中后重复 fetch 和 Cache.put；无指纹
  // 入口仍走 network-first 以保证更新及时生效。
  const fingerprintPattern = /[.-][a-f0-9]{8,}\.(js|css|mjs)$/i;
  // Hugo's hash is hexadecimal but its length is not a public fixed-width API.
  const hugoImagePattern = /_hu_[a-f0-9]{8,}\.(avif|webp|jpe?g|png)$/i;
  const isFingerprinted = fingerprintPattern.test(url.pathname);
  const isHugoProcessedImage = hugoImagePattern.test(url.pathname);

  if (isFingerprinted || isHugoProcessedImage) {
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

console.log('[SW] Service Worker v95bdac97 loaded');
