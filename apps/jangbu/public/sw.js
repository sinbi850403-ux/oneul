// 오늘장부 Service Worker - 푸시 알림 처리
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
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/input')
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
