// Vercel Serverless Function
// Supabase DB Webhook → POST /api/board-notify
// 새 게시글 INSERT 시 관리자에게 푸시 알림 발송

import webpush from 'web-push'
import { select, remove } from './_supabase.js'

const VAPID_PUBLIC_KEY  = 'BD3CmEkjrqDgF8nKEpQePWMuN8v3AQTytTHKl8FNkhpmbgEAkd0Zuu0BOQchBMf0INgs2i3-lk_QjgBk7_xfg20'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const WEBHOOK_SECRET    = process.env.WEBHOOK_SECRET

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

    // 관리자 push 구독 조회
    const adminProfiles = await select('profiles', 'is_admin=eq.true&select=user_id')

    if (!adminProfiles?.length) {
      return res.status(200).json({ message: '관리자 없음' })
    }

    // 작성자 본인은 제외한다. 자기가 방금 쓴 글을 알림으로 다시 받을 이유가 없다.
    const adminIds = adminProfiles
      .map(p => p.user_id)
      .filter(id => id !== post.user_id)

    if (!adminIds.length) {
      return res.status(200).json({ message: '작성자 본인 외 받을 관리자 없음' })
    }

    const subs = await select(
      'push_subscriptions',
      `user_id=in.(${adminIds.join(',')})&select=user_id,subscription`,
    )

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
        // 410 = 구독 만료. 죽은 구독을 지워 다음 발송에서 다시 실패하지 않게 한다.
        if (err.statusCode === 410) {
          await remove('push_subscriptions', `user_id=eq.${encodeURIComponent(row.user_id)}`)
        }
      }
    }

    return res.status(200).json({ success, total: subs.length })
  } catch (err) {
    console.error('board-notify error:', err)
    return res.status(500).json({ error: err.message })
  }
}
