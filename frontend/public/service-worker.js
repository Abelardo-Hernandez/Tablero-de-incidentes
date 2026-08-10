const CACHE_NAME = 'tablero-incidentes-v1';
const APP_SHELL = [
    '/',
    '/incidencias',
    '/manifest.webmanifest',
    '/logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    if (new URL(request.url).pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copia = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, copia);
                });

                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) =>
                    cached || caches.match('/')
                )
            )
    );
});

self.addEventListener('push', (event) => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {
            title: 'Nueva incidencia',
            body: event.data?.text() || ''
        };
    }

    const title = data.title || 'Nueva incidencia';
    const options = {
        body: data.body || 'Se registro una nueva incidencia.',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: data.prioridad === 'critica'
            ? 'incidencia-critica'
            : 'incidencia-nueva',
        renotify: true,
        data: {
            url: data.url || '/incidencias'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = new URL(
        event.notification.data?.url || '/incidencias',
        self.location.origin
    ).href;

    event.waitUntil(
        self.clients
            .matchAll({
                type: 'window',
                includeUncontrolled: true
            })
            .then((clients) => {
                const abierta = clients.find((client) =>
                    client.url.includes('/incidencias')
                );

                if (abierta) {
                    abierta.focus();
                    abierta.navigate(url);
                    return;
                }

                return self.clients.openWindow(url);
            })
    );
});
