const CACHE_NAME = 'social-battery-v1';
const ASSETS = [
  '/social-battery/',
  '/social-battery/index.html',
  '/social-battery/css/style.css',
  '/social-battery/js/app.js',
  '/social-battery/js/i18n.js',
  '/social-battery/js/locales/ko.json',
  '/social-battery/js/locales/en.json',
  '/social-battery/js/locales/ja.json',
  '/social-battery/js/locales/zh.json',
  '/social-battery/js/locales/hi.json',
  '/social-battery/js/locales/ru.json',
  '/social-battery/js/locales/es.json',
  '/social-battery/js/locales/pt.json',
  '/social-battery/js/locales/id.json',
  '/social-battery/js/locales/tr.json',
  '/social-battery/js/locales/de.json',
  '/social-battery/js/locales/fr.json',
  '/social-battery/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
