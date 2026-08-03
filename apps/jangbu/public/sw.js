// 오늘장부 Service Worker — 푸시 알림 + 오프라인 셸
//
// 캐시 이름에 버전을 박는다. 배포할 때 이 값을 올리면 activate 에서 옛 캐시를
// 통째로 버린다. 캐싱 규칙을 바꿀 때마다 올릴 것.
const VERSION = 'v1'
const SHELL = `oneul-shell-${VERSION}`
const ASSETS = `oneul-assets-${VERSION}`

// 앱을 띄우는 데 최소한으로 필요한 것. 여기 없는 JS/CSS 는 첫 방문 때
// 네트워크로 받으면서 ASSETS 캐시에 쌓인다(파일명에 해시가 있어 안전).
const SHELL_FILES = ['/', '/manifest.json', '/icons/icon-192.png']

// ── 푸시 알림 ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || '오늘장부'
  const options = {
    body: data.body || '오늘 매출 기록하셨나요? 30초면 끝!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '기록하기' },
      { action: 'close', title: '나중에' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return
  const target = event.notification.data?.url || '/input'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 이미 열려 있는 창이 있으면 새 창을 띄우지 않고 그쪽으로 보낸다.
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(target)
    })
  )
})

// ── 설치 · 정리 ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // 하나라도 실패하면 addAll 은 통째로 실패하고 설치가 죽는다.
      // 오프라인은 부가 기능이므로 실패해도 그냥 넘어간다.
      .then((c) => c.addAll(SHELL_FILES))
      .catch(() => {})
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  )
})

// ── 오프라인 ─────────────────────────────────────────────────
//
// 저장·조회는 Supabase 로 나가는 교차 출처 요청이라 여기서 건드리지 않는다.
// 매출 금액을 캐시에서 내주면 지난 데이터를 오늘 것처럼 보여주게 된다.
// 오프라인에서 되는 건 "앱이 열리는 것"까지다.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 블로그·계산기는 정적 페이지고 하루 3편씩 갱신된다. 캐시가 끼면 새 글이
  // 안 보이므로 통째로 네트워크에 맡긴다.
  if (url.pathname.startsWith('/blog') || url.pathname.startsWith('/tools')) return

  // 화면 이동: 네트워크 우선. 끊겼을 때만 캐시된 셸로 앱을 띄운다.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  // 빌드 산출물은 파일명에 해시가 있어 내용이 바뀌면 이름도 바뀐다.
  // 캐시 우선으로 줘도 오래된 걸 보게 될 일이 없다.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(ASSETS).then((c) => c.put(request, copy))
            }
            return res
          })
      )
    )
    return
  }

  // 아이콘·매니페스트 등 나머지 정적 파일
  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)))
  }
})
