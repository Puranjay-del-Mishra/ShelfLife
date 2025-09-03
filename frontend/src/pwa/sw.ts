// Placeholder SW: add push listener later
self.addEventListener('install', () => self.skipWaiting?.());
self.addEventListener('activate', (event) => event.waitUntil(self.clients?.claim?.()));
