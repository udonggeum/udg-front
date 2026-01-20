// Service Worker for offline support
const CACHE_NAME = 'udg-v1';
const RUNTIME_CACHE = 'udg-runtime';

// 오프라인에서도 접근 가능해야 하는 기본 리소스
const PRECACHE_URLS = [
  '/',
  '/stores',
  '/community',
  '/prices',
  '/mypage',
];

// 설치 이벤트: 기본 페이지 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // 새로운 Service Worker를 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트: 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );
  // 모든 클라이언트를 즉시 제어
  return self.clients.claim();
});

// Fetch 이벤트: Network First, fallback to Cache 전략
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 캐싱하지 않음
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Chrome extension이나 다른 도메인 요청은 무시
  if (url.origin !== location.origin) {
    return;
  }

  // GET 요청만 처리
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Network First 전략: 네트워크 먼저 시도, 실패하면 캐시 사용
    fetch(request)
      .then((response) => {
        // 성공한 응답은 런타임 캐시에 저장
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 찾기
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // 캐시에도 없으면 오프라인 페이지 표시
          if (request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('오프라인 상태입니다.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});
