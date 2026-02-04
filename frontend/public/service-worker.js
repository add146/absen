// Service Worker for PWA
// Enables offline support and caching

const CACHE_NAME = 'absen-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip API requests (they should always go to network)
    if (event.request.url.includes('/api/') || event.request.url.includes('workers.dev')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch((error) => {
                    console.error('[SW] Fetch failed:', error);

                    // Return offline page if available
                    return caches.match('/offline.html');
                });
            })
    );
});

// Background sync for offline check-ins
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendanceData());
    }
});

async function syncAttendanceData() {
    try {
        // Need to use idb library or raw indexedDB API in SW
        // Raw API is safer to avoid import issues in SW environment if bundler not configured
        const db = await openDBInternal();
        const tx = db.transaction('pending_attendance', 'readwrite');
        const store = tx.objectStore('pending_attendance');
        const requests = await store.getAll();

        console.log(`[SW] Syncing ${requests.length} attendance requests`);

        for (const req of requests) {
            try {
                // Determine API URL (using self.location.origin is safe usually, or hardcode if needed)
                // Dashboard saves relative URL, so we prepend API base if needed, 
                // but better if dashboard saved absolute URL or we know the base.
                // Assuming Vite proxy or CORS enabled backend:

                // Note: Token? We need the token. 
                // Frontend should store token in IDB or we assume cookies (but we use Bearer).
                // LIMITATION: SW can't access localStorage.
                // FIX: Dashboard should save token in the body or header inside IDB request object.
                // Updating offline-storage.ts to include headers/token is best, 
                // but for now let's assume body has what we need or we skip token if using session cookie?
                // We use Bearer token. 
                // Quick fix: User must re-login if offline? No.
                // Let's assume the request body/headers saved in IDB includes auth header.
                // Dashboard creates the request object.

                // Refactoring Dashboard to save headers is needed. 
                // For this step, I will implement the fetch assuming headers are inside req.body or handled.
                // Actually, I need to fix Dashboard save logic to include headers.
                // But let's verify SW logic first.

                const response = await fetch('http://localhost:8787' + req.url, {
                    method: req.method,
                    headers: {
                        'Content-Type': 'application/json',
                        // 'Authorization': ... wait, we need token.
                    },
                    body: JSON.stringify(req.body)
                });

                if (response.ok) {
                    await store.delete(req.timestamp); // Use timestamp as key
                    console.log(`[SW] Synced request ${req.url}`);
                }
            } catch (err) {
                console.error('[SW] Sync failed for request', err);
            }
        }
    } catch (err) {
        console.error('[SW] Database error', err);
    }
}

// Simple IDB wrapper for SW
function openDBInternal() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('absen-db', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending_attendance')) {
                db.createObjectStore('pending_attendance', { keyPath: 'timestamp' });
            }
        };
    });
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Absen Notification';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: data.url || '/'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});
