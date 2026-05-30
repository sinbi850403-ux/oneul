// 게시판 새 글 → 관리자 푸시 알림
// 실행: node boardnotify.js
// 크론 예시: */5 * * * * node /path/to/boardnotify.js

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY  = 'BD3CmEkjrqDgF8nKEpQePWMuN8v3AQTytTHKl8FNkhpmbgEAkd0Zuu0BOQchBMf0INgs2i3-lk_QjgBk7_xfg20'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

webpush.setVapidDetails('mailto:sinbi850403@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CAT_LABEL = { bug: '버그신고', feature: '기능요청', free: '자유' }

async function main() {
  // 최근 6분 내 새 게시글 확인
  const since = new Date(Date.now() - 6 * 60 * 1000).toISOString()
  const { data: newPosts } = await supabase
    .from('board_posts')
    .select('id, title, nickname, category')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!newPosts || newPosts.length === 0) {
    console.log('새 게시글 없음')
    return
  }

  console.log(`새 게시글 ${newPosts.length}건`)

  // 관리자 push 구독 조회
  const { data: adminProfiles } = await supabase
    .from('profiles').select('user_id').eq('is_admin', true)

  if (!adminProfiles?.length) {
    console.log('관리자 계정 없음')
    return
  }

  const adminIds = adminProfiles.map(p => p.user_id)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', adminIds)

  if (!subs?.length) {
    console.log('관리자 푸시 구독 없음 (설정 > 알림에서 구독 필요)')
    return
  }

  const post = newPosts[0]
  const payload = JSON.stringify({
    title: `📬 새 게시글 — ${CAT_LABEL[post.category] || post.category}`,
    body: `${post.nickname}: ${post.title}${newPosts.length > 1 ? ` 외 ${newPosts.length - 1}건` : ''}`,
    url: '/dashboard/board',
  })

  for (const row of subs) {
    try {
      await webpush.sendNotification(JSON.parse(row.subscription), payload)
      console.log('관리자 알림 발송 완료')
    } catch (err) {
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id)
        console.log('만료 구독 삭제')
      } else {
        console.error('발송 실패:', err.message)
      }
    }
  }
}

main()
