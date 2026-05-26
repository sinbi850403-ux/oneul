import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = 'BD3CmEkjrqDgF8nKEpQePWMuN8v3AQTytTHKl8FNkhpmbgEAkd0Zuu0BOQchBMf0INgs2i3-lk_QjgBk7_xfg20'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

webpush.setVapidDetails(
  'mailto:sinbi850403@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const MESSAGES = [
  { title: '오늘 매출 기록했나요? 📊', body: '30초면 충분해요. 지금 바로 입력하세요!' },
  { title: '오늘 하루 어떠셨나요? 💰', body: '매출 기록으로 한 달을 한눈에 봐요.' },
  { title: '마감 전 매출 입력 ✅', body: '오늘 수익 잊지 말고 기록해두세요!' },
  { title: '오늘장부 알림 🔔', body: '매일 기록하면 세금 신고도 간편해요.' },
  { title: '매출 입력 시간이에요 📝', body: '가게 문 닫기 전에 오늘 매출 정리해보세요.' },
]

function pickMessage() {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MESSAGES.length
  return MESSAGES[dayIndex]
}

async function main() {
  // service_role key로 모든 구독 조회 (RLS 우회)
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (error) {
    console.error('구독 조회 실패:', error.message)
    process.exit(1)
  }

  console.log(`총 ${subs.length}명에게 푸시 발송`)

  const msg = pickMessage()
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: '/input' })

  let success = 0
  let fail = 0
  const expiredIds = []

  for (const row of subs) {
    try {
      const sub = JSON.parse(row.subscription)
      await webpush.sendNotification(sub, payload)
      success++
    } catch (err) {
      fail++
      // 410 Gone = 구독 만료됨 → 삭제
      if (err.statusCode === 410) {
        expiredIds.push(row.user_id)
      } else {
        console.error(`발송 실패 (${row.user_id}):`, err.message)
      }
    }
  }

  // 만료된 구독 정리
  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('user_id', expiredIds)
    console.log(`만료 구독 ${expiredIds.length}건 삭제`)
  }

  console.log(`완료: 성공 ${success}건, 실패 ${fail}건`)
}

main()
