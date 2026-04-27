const CACHE_VERSION = 'v3';
const STATIC_CACHE = `pg-manager-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `pg-manager-images-${CACHE_VERSION}`;

// Maximum number of entries in image cache
const MAX_IMAGE_CACHE_ITEMS = 100;

// Assets to cache on install (only non-HTML static resources)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper: Limit cache size by removing oldest entries
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
      }
    });
  });
}

// Helper: Check if a request is for a static asset (JS, CSS, fonts)
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf')
  );
}

// Helper: Check if a request is for an image
function isImage(url) {
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico')
  );
}

// Strategy: Cache-first (for static assets and images)
function cacheFirst(event, cacheName, maxItems) {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, responseClone);
            if (maxItems) {
              trimCache(cacheName, maxItems);
            }
          });
        }
        return response;
      });
    })
  );
}

// Strategy: Network-only (for HTML pages and Next.js RSC payloads)
// Never cache HTML — stale HTML + new JS causes React reconciliation crashes (removeChild errors)
// Static assets use content-hash filenames so cache-first is safe; HTML is not safe
function networkOnly(event) {
  event.respondWith(fetch(event.request));
}

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API requests and Supabase requests
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // Static assets (JS, CSS, fonts) - cache-first
  if (isStaticAsset(url)) {
    return cacheFirst(event, STATIC_CACHE);
  }

  // Images - cache-first with size limit
  if (isImage(url)) {
    return cacheFirst(event, IMAGE_CACHE, MAX_IMAGE_CACHE_ITEMS);
  }

  // HTML pages and Next.js RSC payloads - network-only, never cache
  return networkOnly(event);
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
