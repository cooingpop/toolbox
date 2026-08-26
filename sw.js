// DevTools Hub 서비스 워커 — 오프라인 지원
// 전략: 같은 출처 GET은 네트워크 우선(성공 시 캐시에 복사), 실패하면 캐시 폴백.
// 네트워크 우선이라 새 배포가 즉시 반영되고, 캐시는 오프라인일 때만 쓰인다.
const CACHE_NAME = 'devtools-hub-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // 네트워크 우선이라도 브라우저 HTTP 캐시(GitHub Pages의 max-age)를 타면
      // 새 배포가 한동안 안 보인다 → 항상 서버에 재검증(ETag)하도록 no-cache.
      // navigate 요청은 Request 재구성 시 mode가 바뀔 수 있어 그대로 둔다(리로드 시 어차피 재검증).
      const response = event.request.mode === 'navigate'
        ? await fetch(event.request)
        : await fetch(event.request, { cache: 'no-cache' });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request, { ignoreSearch: false });
      if (cached) return cached;
      // 내비게이션 요청이면 셸로 폴백
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
