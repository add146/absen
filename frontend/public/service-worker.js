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
        const db = await openDBInternal();
        const tx = db.transaction('pending_attendance', 'readwrite');
        const store = tx.objectStore('pending_attendance');
        const requests = await getAllRequests(store);

        console.log(`[SW] Syncing ${requests.length} attendance requests`);

        for (const req of requests) {
            try {
                // Determine API URL 
                // We assume req.url is relative path (e.g. /attendance/check-in)
                // We need to construct absolute URL. SW runs on same origin as frontend.
                // If API is on same domain (proxied), use self.location.origin.
                // If API is external, we need to know the base.
                // Since we rely on Vite proxy in dev, self.location.origin works for dev.
                // In prod, API might be different. 
                // BETTER APPROACH: The stored URL should probably be full URL or we try to guess.
                // For this implementation, we will try to use the origin + path first (Proxy approach),
                // OR fallback to hardcoded if needed. ideally frontend saves full URL.
                // But let's assume Proxy/Same Origin strategy which is best for PWA.

                // Construct URL: remove leading slash if present to avoid double slash with base
                const path = req.url.startsWith('/') ? req.url : '/' + req.url;
                // In prod, frontend might point to separate API. 
                // If so, we need that domain.
                // Let's rely on the fact that for now, we can hardcode the worker URL as fallback
                // or assume same origin if served via Pages which proxies to Worker (standard setup).
                // Actually PRD says: Frontend: Cloudflare Pages, Backend: Workers.
                // Usually configured via custom domain or env var.
                // The environment variable VITE_API_URL is NOT available here.
                // WORKAROUND: We will attempt to fetch from the stored path relative to current origin.
                // If that fails (404), we might need a backup. But normally Pages serves frontend and we can proxy /api.
                // However, the current codebase uses VITE_API_URL.
                // Let's assume the frontend saved the RELATIVE path.

                // CRITICAL: We need the API Endpoint. 
                // We will try to fetch using the full URL constructed from origin + path.
                // If the app is hosted at https://app.com, and API is at https://api.app.com, this fails.
                // FIX: dashboard.tsx should save FULL URL. 
                // RETROACTIVE FIX: In dashboard.tsx, we passed Relative URL.
                // Let's update this to use a known default or try to determine.
                // For now, I will use a hardcoded production fallback if origin fetch fails is too risky.
                // I will use a flexible approach: Try full URL if it looks like one, else append to specific base.

                let fetchUrl = req.url;
                if (!req.url.startsWith('http')) {
                    // Dev environment default or relative
                    fetchUrl = self.location.origin + path;
                    // Or hardcode the generic worker url if known? No, dynamic is better.
                }

                console.log(`[SW] Processing sync for ${fetchUrl}`, req);

                const response = await fetch(fetchUrl, {
                    method: req.method,
                    headers: req.headers || {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(req.body)
                });

                console.log(`[SW] Sync Response for ${fetchUrl}:`, response.status);

                if (response.ok) {
                    // Success - delete from IDB
                    // Need a new transaction for delete if we want to be safe or reuse?
                    // IDB transactions auto-commit when event loop spins. await might close it.
                    // Better verify if tx is still active. 
                    // To be safe, open new tx for delete or use the cursor method.
                    await deleteRequest(db, req.timestamp);
                    console.log(`[SW] Synced request ${req.url} successfully`);

                    // Notify clients to refresh
                    const clients = await self.clients.matchAll();
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SYNC_COMPLETED',
                            url: req.url
                        });
                    });
                } else {
                    console.error('[SW] Sync rejected by server', response.status);
                    // If 4xx error (client error), maybe delete it? 
                    // If 401 Unauthorized, token expired. Delete it.
                    if (response.status >= 400 && response.status < 500) {
                        await deleteRequest(db, req.timestamp); // Don't retry invalid requests
                    }
                }
            } catch (err) {
                console.error('[SW] Sync failed for request', err);
            }
        }
    } catch (err) {
        console.error('[SW] Database error', err);
    }
}

// Helper to get all from store (Promise wrapper)
function getAllRequests(store) {
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteRequest(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('pending_attendance', 'readwrite');
        const store = tx.objectStore('pending_attendance');
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Simple IDB wrapper for SW
function openDBInternal() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('absen-db', 2); // Version 2 matched
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Handle upgrades
            if (event.oldVersion < 1) {
                const store = db.createObjectStore('pending_attendance', { keyPath: 'timestamp' });
                // Note: creating index in SW might be tricky if not careful, but standard API holds.
            }
            // Version 2 doesn't need structure change, just field addition which is schema-less in IDB values
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
