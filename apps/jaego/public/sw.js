// 오늘재고 Service Worker - 재고부족 푸시 알림 처리
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || '오늘재고'
  const options = {
    body: data.body || '재고를 확인해주세요',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/stock-status' },
    actions: [
      { action: 'open',  title: '재고 확인' },
      { action: 'close', title: '나중에' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return
  const url = event.notification.data?.url || '/stock-status'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
