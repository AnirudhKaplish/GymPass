// Minimal service worker so GymPass can be installed as an app.
// It never caches API calls or pages, so members always see live data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
