// Service worker cho Pích Cờ Bôn Phông Bạt PWA
// Tăng số này mỗi khi bạn deploy bản mới để buộc app cập nhật cache
const CACHE_VERSION = 'pcb-v2';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];

// Các thư viện tải từ CDN — cache lại để lần sau mở offline vẫn chạy được
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll([...APP_SHELL, ...CDN_ASSETS]))
      .catch(()=>{ /* nếu offline lúc cài lần đầu thì bỏ qua, không chặn install */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Dữ liệu real-time (Firebase) — luôn lấy mạng mới nhất, không cache
  if (url.includes('firebaseio.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // Còn lại (giao diện app + thư viện CDN): cache-first, có mạng thì âm thầm cập nhật cache
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => {
        // Không cache/serve lại response bị redirect (vd Vercel chuyển /index.html -> /)
        // vì Chrome sẽ báo lỗi ERR_FAILED khi dùng response redirected cho navigation.
        if (res && res.status === 200 && !res.redirected) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
