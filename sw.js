const CACHE_NAME = 'radio-khaled-v3'; // تغيير الرقم لـ 3
const assetsToCache = [ './', './index.html', './manifest.json' ];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // إجبار النسخة الجديدة على التفعيل فوراً
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(assetsToCache)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  return self.clients.claim(); // السيطرة على الصفحة فوراً
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('google-analytics.com')) return;
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
