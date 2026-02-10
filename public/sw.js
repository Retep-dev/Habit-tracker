// Service Worker for Tempo PWA
const CACHE_NAME = 'tempo-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const action = event.action;
    const data = event.notification.data || {};

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            const url = action === 'clock-in'
                ? `/?clockIn=${data.activityId}`
                : action === 'view-report'
                    ? '/reports/daily'
                    : '/';

            if (clients.length > 0) {
                clients[0].focus();
                clients[0].postMessage({ type: 'NOTIFICATION_ACTION', action, data });
                return;
            }
            return self.clients.openWindow(url);
        })
    );
});
