const CACHE_NAME = 'game-cube-v1';
// قائمة بالملفات التي يجب تخزينها مؤقتًا للعمل دون اتصال
const urlsToCache = [
  // ملفات اللعبة الأساسية
  '/games/',             // المسار الرئيسي للمشروع (هام لـ GitHub Pages)
  '/games/index.html',
  '/games/manifest.json',
  
  // ملفات الأيقونات (تأكد من وجودها بهذه الأسماء في نفس المجلد)
  '/games/icon72.png',
  '/games/icon192.png',
  '/games/icon512.png',
  
  // ملاحظة: ملفات CDN (مثل Tailwind و Cairo) لن يتم تخزينها
  // مؤقتًا بهذا الكود. ستحتاج لتحميلها محليًا أو استخدام
  // استراتيجية تخزين مختلفة لضمان عملها دون إنترنت.
];

// حدث التثبيت: يتم تخزين الملفات الأساسية مؤقتًا
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// حدث الجلب: يتم محاولة جلب الموارد من الذاكرة المؤقتة أولاً
self.addEventListener('fetch', event => {
  // تخطي طلبات غير الـ GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا كان الملف موجوداً في الذاكرة المؤقتة، يتم إرجاعه
        if (response) {
          return response;
        }
        // وإلا، يتم طلبه من الشبكة
        return fetch(event.request);
      })
  );
});

// حدث التفعيل: يتم حذف أي إصدارات قديمة من الذاكرة المؤقتة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});
