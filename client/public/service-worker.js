const CACHE_VERSION = 'dospresso-v19';
const STATIC_CACHE = CACHE_VERSION + '-static';
const API_CACHE = CACHE_VERSION + '-api';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
];

const API_CACHE_PATTERNS = [
  '/api/health',
  '/api/branches',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('[SW] Some static assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    const safeToCache = API_CACHE_PATTERNS.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));
    if (safeToCache) {
      event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    }
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
    return;
  }

  if (url.pathname === '/' || !url.pathname.includes('.')) {
    event.respondWith(networkFirstWithCache(event.request, STATIC_CACHE));
    return;
  }

  event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?|$)/.test(pathname);
}

async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'DOSPRESSO', message: event.data ? event.data.text() : 'Yeni bildirim' };
  }
  const options = {
    body: data.message || 'Yeni bildirim',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'dospresso-default',
    data: { url: data.link || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'DOSPRESSO', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      const indexCached = await caches.match('/');
      if (indexCached) return indexCached;
    }

    return new Response(
      JSON.stringify({ error: 'offline', message: 'Çevrimdışı — bu veri şu an kullanılamıyor' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
