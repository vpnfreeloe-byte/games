// قمنا بتغيير الإصدار ليتم تحديث الكاش
const CACHE_NAME = 'game-cube-v2';

// قائمة بالملفات التي يجب تخزينها مؤقتًا للعمل دون اتصال
const urlsToCache = [
  // ملفات اللعبة الأساسية (من مجلد /games/)
  // هذه المسارات صحيحة بناءً على الكود الخاص بك
  '/games/',
  '/games/index.html',
  '/games/manifest.json',
  
  // ملفات الأيقونات
  '/games/icon72.png',
  '/games/icon192.png',
  '/games/icon512.png',
  
  // --- الإضافة الجديدة: ملفات الـ CDN الخارجية ---
  // سيقوم بتخزين ملف التصميم
  'https://cdn.tailwindcss.com',
  // سيقوم بتخزين ملف الخطوط
  'https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap'
  
  // ملاحظة: ملفات الخطوط (woff2) التي يطلبها الرابط أعلاه
  // سيتم تخزينها تلقائيًا في المرة الأولى عند جلبها (انظر منطق 'fetch' بالأسفل)
];

// حدث التثبيت: يتم تخزين الملفات الأساسية مؤقتًا
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and adding core files...');
        // استخدام addAll يضمن تخزين كل الملفات أو فشل التثبيت
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // تفعيل الـ Service Worker الجديد فوراً
  );
});

// حدث التفعيل: يتم حذف أي إصدارات قديمة من الذاكرة المؤقتة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // احذف كل الكاش القديم الذي لا يطابق الاسم الجديد
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// حدث الجلب: (هذا هو المنطق المحسّن للعمل بدون نت)
// 1. نبحث في الكاش أولاً
// 2. إذا لم نجد، نذهب للشبكة
// 3. إذا نجح طلب الشبكة، نخزنه في الكاش للمرة القادمة ونرجعه
// 4. إذا فشل طلب الشبكة (offline)، نكون قد جربنا الكاش بالفعل
self.addEventListener('fetch', event => {
  // تخطي طلبات غير الـ GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. إذا كان الملف موجوداً في الذاكرة المؤقتة، يتم إرجاعه فوراً
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. إذا لم يكن في الكاش، اذهب للشبكة
        return fetch(event.request).then(
          networkResponse => {
            // 3. نجح الاتصال بالشبكة
            
            // تحقق من أن الرد سليم
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // هام: يجب نسخ الرد قبل استخدامه
            // لأن الرد "يُستهلك" عند قراءته مرة واحدة
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // 4. تخزين الرد الجديد في الكاش للمرات القادمة
                // هذا سيخزن ملفات الخطوط .woff2 تلقائيًا عند طلبها لأول مرة
                console.log('Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            // إرجاع الرد الأصلي للمتصفح
            return networkResponse;
          }
        ).catch(error => {
          // فشل الاتصال بالشبكة (أنت الآن offline)
          // بما أننا لم نجده في الكاش في الخطوة 1، وفشلنا في جلبه من الشبكة
          // فلا يوجد ما نرجعه.
          console.error('Fetch failed, no network and not in cache:', event.request.url);
          // (يمكن إرجاع صفحة "أنت غير متصل" هنا إذا أردت)
        });
      })
  );
});
