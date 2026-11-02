// Simple Service Worker for PWA compliance
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle fetches as normal
});
