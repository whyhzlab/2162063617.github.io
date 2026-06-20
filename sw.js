// Service Worker - v20260618003646
// 自动生成，请勿手动编辑

const CACHE_VERSION = '20260618003646';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `runtime-${CACHE_VERSION}`;

// 预缓存资源列表
const PRECACHE_URLS = [
  "/",
  "/offline/",
  "/manifest.webmanifest"
];

// 安装阶段：预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);

  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version', CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== PRECACHE_NAME && name !== RUNTIME_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 获取阶段：缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过浏览器扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // HTML: 网络优先，失败回退到缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存成功的响应
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败，尝试缓存
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 返回离线页面
              return caches.match('/offline/');
            });
        })
    );
    return;
  }

  // 静态资源：缓存优先
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // 缓存成功的响应
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

  // 第三方资源：网络优先
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的第三方资源
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 回退到缓存
        return caches.match(request);
      })
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v20260618003646 loaded');
