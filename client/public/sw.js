const CACHE_VERSION = 'v4';
const STATIC_CACHE = `pressstart-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `pressstart-dynamic-${CACHE_VERSION}`;
const FONT_CACHE = `pressstart-fonts-${CACHE_VERSION}`;
const APP_SHELL_CACHE = `pressstart-shell-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/logo-dark.png',
  '/logo-light.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/offline.html',
  '/og-image.png'
];

const ICON_CACHE = `pressstart-icons-${CACHE_VERSION}`;
const SVG_CACHE = `pressstart-svg-${CACHE_VERSION}`;

const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

const EXCLUDED_EXTENSIONS = ['.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a'];

const DB_NAME = 'pressstart-offline';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_QUEUE = 'syncQueue';

function shouldExcludeFromCache(url) {
  const pathname = url.pathname.toLowerCase();
  return EXCLUDED_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

function isValidCacheResponse(response) {
  return response && response.status === 200 && response.type !== 'opaque';
}

function isAppShellRequest(url) {
  const ext = url.pathname.split('.').pop();
  return ['js', 'css', 'woff', 'woff2', 'ttf', 'otf'].includes(ext) && url.origin === self.location.origin;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Some static assets failed to cache:', err);
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
          .filter((name) => {
            return name.startsWith('pressstart-') && 
                   !name.includes(CACHE_VERSION);
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') return;

  if (shouldExcludeFromCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (FONT_ORIGINS.some(origin => request.url.startsWith(origin))) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (isValidCacheResponse(response)) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
        });
      })
    );
    return;
  }

  if (isAppShellRequest(url)) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (isValidCacheResponse(response)) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          return new Response(JSON.stringify({ 
            error: 'Offline', 
            message: 'You appear to be offline. Changes will sync when you reconnect.',
            offline: true
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  if (url.pathname.endsWith('.svg') && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SVG_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (isValidCacheResponse(response)) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
        });
      })
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (isValidCacheResponse(response)) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isValidCacheResponse(response)) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/') || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      
      return fetch(request).then((response) => {
        if (isValidCacheResponse(response) && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('/') || caches.match('/offline.html');
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'cacheAppShell') {
    event.waitUntil(
      caches.open(APP_SHELL_CACHE).then(async (cache) => {
        const response = await fetch('/');
        const html = await response.text();
        const assetUrls = [];
        const scriptMatches = html.matchAll(/src="([^"]+\.(js|css))"/g);
        const linkMatches = html.matchAll(/href="([^"]+\.css)"/g);
        for (const match of scriptMatches) assetUrls.push(match[1]);
        for (const match of linkMatches) assetUrls.push(match[1]);
        await cache.addAll(assetUrls.filter(u => u.startsWith('/'))).catch(() => {});
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-projects') {
    event.waitUntil(syncOfflineProjects());
  }
});

async function syncOfflineProjects() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.getAll();
    const items = await promisifyRequest(request);
    
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
          credentials: 'include'
        });
        const deleteTx = db.transaction(STORE_QUEUE, 'readwrite');
        deleteTx.objectStore(STORE_QUEUE).delete(item.id);
      } catch {
        break;
      }
    }
    db.close();
  } catch {}
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('syncMeta')) {
        db.createObjectStore('syncMeta', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
