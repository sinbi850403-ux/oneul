// 주간 매출 리포트 이메일 발송 (매주 월요일 오전 9시 KST)
// Resend API 사용 (https://resend.com - 월 3,000건 무료)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function getLastWeekRange() {
  const now = new Date()
  // KST = UTC+9
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dayOfWeek = kstNow.getUTCDay() // 0=일, 1=월
  const monday = new Date(kstNow)
  monday.setUTCDate(kstNow.getUTCDate() - dayOfWeek - 6) // 지난주 월요일
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6) // 지난주 일요일
  sunday.setUTCHours(23, 59, 59, 999)

  const toDate = (d: Date) => d.toISOString().slice(0, 10)
  return { from: toDate(monday), to: toDate(sunday) }
}

Deno.serve(async () => {
  try {
    const { from, to } = getLastWeekRange()

    // 모든 유저 + 이메일 + 가게이름 조회
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('user_id, shop_name')

    if (usersErr) throw usersErr

    let sent = 0

    for (const user of users ?? []) {
      // 유저 이메일 조회
      const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      // 지난주 매출 조회
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_date, total')
        .eq('user_id', user.user_id)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date')

      if (!sales || sales.length === 0) continue

      const weekTotal = sales.reduce((sum, s) => sum + (s.total ?? 0), 0)
      const dailyAvg = Math.round(weekTotal / sales.length)
      const shopName = user.shop_name || '우리 가게'

      // 일별 매출 행
      const rows = sales.map(s =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.sale_date}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatKRW(s.total ?? 0)}</td></tr>`
      ).join('')

      const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,sans-serif;">
<div style="max-width:480px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#FF6B35;padding:28px 24px;">
    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">오늘장부 주간 리포트</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">${shopName}</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${from} ~ ${to}</p>
  </div>

  <div style="padding:24px;">
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;background:#fff7f4;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#999;">주간 총매출</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#FF6B35;">${formatKRW(weekTotal)}</p>
      </div>
      <div style="flex:1;background:#f8f8f8;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#999;">일평균 매출</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#333;">${formatKRW(dailyAvg)}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;border-bottom:2px solid #f0f0f0;">날짜</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#999;border-bottom:2px solid #f0f0f0;">매출</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <a href="https://xn--wh1bw0st1gbrb.kr" style="display:block;margin-top:20px;background:#FF6B35;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;">오늘장부 열기</a>
    <p style="text-align:center;font-size:11px;color:#ccc;margin-top:16px;">수신 거부는 앱 설정에서 할 수 있어요.</p>
  </div>
</div>
</body>
</html>`

      // Resend로 발송
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: '오늘장부 <report@xn--wh1bw0st1gbrb.kr>',
          to: email,
          subject: `[오늘장부] ${shopName} 주간 매출 리포트 (${from} ~ ${to})`,
          html,
        }),
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
