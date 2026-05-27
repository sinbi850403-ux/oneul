import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const VAPID_PUBLIC_KEY = 'BBPjiiXzmJ3Pt5J12hAlbqKhHrracrRqZl9BXUHkIKvfRkJxzBWY1omSpyVXl2KCpQlWukn6pKFecLZEVwt_FUw'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePush() {
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function subscribe(userId) {
    try {
      // 서비스 워커 등록
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 푸시 구독
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setPermission('granted')
      setSubscribed(true)

      // Supabase에 구독 정보 저장
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: JSON.stringify(sub),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      return true
    } catch (err) {
      console.error('푸시 구독 실패:', err)
      return false
    }
  }

  async function unsubscribe(userId) {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    setSubscribed(false)
  }

  return { permission, subscribed, subscribe, unsubscribe }
}
