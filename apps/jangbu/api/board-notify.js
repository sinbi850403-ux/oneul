// Vercel Serverless Function
// Supabase DB Webhook → POST /api/board-notify
// 새 게시글 INSERT 시 관리자에게 푸시 알림 발송

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY  = 'BD3CmEkjrqDgF8nKEpQePWMuN8v3AQTytTHKl8FNkhpmbgEAkd0Zuu0BOQchBMf0INgs2i3-lk_QjgBk7_xfg20'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const WEBHOOK_SECRET    = process.env.WEBHOOK_SECRET
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const CAT_LABEL = { bug: '버그신고', feature: '기능요청', free: '자유' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 웹훅 시크릿 검증
  const secret = req.headers['x-webhook-secret']
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const post = req.body?.record
    if (!post) return res.status(400).json({ error: 'No record' })

    webpush.setVapidDetails('mailto:sinbi850403@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 관리자 push 구독 조회
    const { data: adminProfiles } = await supabase
      .from('profiles').select('user_id').eq('is_admin', true)

    if (!adminProfiles?.length) {
      return res.status(200).json({ message: '관리자 없음' })
    }

    const adminIds = adminProfiles.map(p => p.user_id)
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', adminIds)

    if (!subs?.length) {
      return res.status(200).json({ message: '관리자 구독 없음' })
    }

    const payload = JSON.stringify({
      title: `📬 새 게시글 — ${CAT_LABEL[post.category] || '게시판'}`,
      body: `${post.nickname}: ${post.title}`,
      url: '/dashboard/board',
    })

    let success = 0
    for (const row of subs) {
      try {
        await webpush.sendNotification(JSON.parse(row.subscription), payload)
        success++
      } catch (err) {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', row.user_id)
        }
      }
    }

    return res.status(200).json({ success, total: subs.length })
  } catch (err) {
    console.error('board-notify error:', err)
    return res.status(500).json({ error: err.message })
  }
}
