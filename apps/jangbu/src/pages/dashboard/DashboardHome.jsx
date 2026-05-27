import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

function won(n) { return '₩ ' + (n ?? 0).toLocaleString('ko-KR') }
function pad(n) { return String(n).padStart(2, '0') }

export default function DashboardHome() {
  const now = new Date()
  const [loading, setLoading] = useState(true)
  const [todaySales,     setTodaySales]     = useState(0)
  const [monthSales,     setMonthSales]     = useState(0)
  const [lastMonthSales, setLastMonthSales] = useState(0)
  const [monthPurchase,  setMonthPurchase]  = useState(0)
  const [recentDays,     setRecentDays]     = useState([])
  const [lowStock,       setLowStock]       = useState([])
  const [shopName,       setShopName]       = useState('')
  const [monthlyTarget,  setMonthlyTarget]  = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
      const todayStr   = `${y}-${pad(m)}-${pad(d)}`
      const monthStart = `${y}-${pad(m)}-01`
      const monthEnd   = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`
      const lastM = m === 1 ? 12 : m - 1
      const lastY = m === 1 ? y - 1 : y
      const lastMonthStart = `${lastY}-${pad(lastM)}-01`
      const lastMonthEnd   = `${lastY}-${pad(lastM)}-${pad(new Date(lastY, lastM, 0).getDate())}`
      const ago7 = new Date(now); ago7.setDate(d - 6)
      const ago7Str = `${ago7.getFullYear()}-${pad(ago7.getMonth()+1)}-${pad(ago7.getDate())}`

      const [
        { data: todayRow },
        { data: todayItemRows },
        { data: monthRows },
        { data: monthItemRows },
        { data: lastMonthRows },
        { data: lastMonthItemRows },
        { data: purchaseRows },
        { data: recentRows },
        { data: stockRows },
        { data: profileRow },
      ] = await Promise.all([
        supabase.from('sales').select('total').eq('user_id', user.id).eq('sale_date', todayStr).maybeSingle(),
        supabase.from('sales_items').select('total_amount').eq('user_id', user.id).eq('sale_date', todayStr),
        supabase.from('sales').select('total').eq('user_id', user.id).gte('sale_date', monthStart).lte('sale_date', monthEnd),
        supabase.from('sales_items').select('total_amount').eq('user_id', user.id).gte('sale_date', monthStart).lte('sale_date', monthEnd),
        supabase.from('sales').select('total').eq('user_id', user.id).gte('sale_date', lastMonthStart).lte('sale_date', lastMonthEnd),
        supabase.from('sales_items').select('total_amount').eq('user_id', user.id).gte('sale_date', lastMonthStart).lte('sale_date', lastMonthEnd),
        supabase.from('purchases').select('total_amount').eq('user_id', user.id).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
        supabase.from('sales').select('sale_date, total').eq('user_id', user.id).gte('sale_date', ago7Str).order('sale_date'),
        supabase.from('stock').select('quantity, products(name, min_quantity)').eq('user_id', user.id),
        supabase.from('profiles').select('shop_name, monthly_target').eq('user_id', user.id).maybeSingle(),
      ])

      const todayItemSum     = (todayItemRows     ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0)
      const monthItemSum     = (monthItemRows     ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0)
      const lastMonthItemSum = (lastMonthItemRows ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0)

      setTodaySales((todayRow?.total ?? 0) + todayItemSum)
      setMonthSales((monthRows ?? []).reduce((a, r) => a + (r.total ?? 0), 0) + monthItemSum)
      setLastMonthSales((lastMonthRows ?? []).reduce((a, r) => a + (r.total ?? 0), 0) + lastMonthItemSum)
      setMonthPurchase((purchaseRows ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0))
      setRecentDays(recentRows ?? [])
      setLowStock((stockRows ?? []).filter(s =>
        (s.products?.min_quantity ?? 0) > 0 && s.quantity <= s.products.min_quantity
      ))
      setShopName(profileRow?.shop_name ?? '')
      setMonthlyTarget(profileRow?.monthly_target ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const monthProfit  = monthSales - monthPurchase
  const growthRate   = lastMonthSales > 0
    ? Math.round(((monthSales - lastMonthSales) / lastMonthSales) * 100)
    : null
  const maxBar = Math.max(...recentDays.map(r => r.total ?? 0), 1)

  // 월 목표 계산
  const targetProgress   = monthlyTarget > 0 ? Math.min(Math.round((monthSales / monthlyTarget) * 100), 100) : 0
  const daysInMonth      = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays    = daysInMonth - now.getDate() + 1
  const requiredDaily    = monthlyTarget > monthSales && remainingDays > 0
    ? Math.ceil((monthlyTarget - monthSales) / remainingDays)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        불러오는 중...
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">대시보드</h2>
          {shopName && (
            <p className="text-sm text-gray-400 mt-0.5">{shopName}</p>
          )}
        </div>
        <p className="text-sm text-gray-400">
          {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
        </p>
      </div>

      {/* 재고부족 배너 */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm font-bold text-amber-700">
            ⚠️ 재고부족 {lowStock.length}개
            <span className="font-normal text-amber-600 ml-2">
              {lowStock.slice(0, 3).map(s => s.products?.name).join(', ')}
              {lowStock.length > 3 ? ` 외 ${lowStock.length - 3}개` : ''}
            </span>
          </span>
          <a
            href="https://oneul-jaego.vercel.app/stock-status"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-600 font-semibold hover:underline whitespace-nowrap ml-4"
          >
            재고앱 →
          </a>
        </div>
      )}

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">오늘 매출</p>
          <p className="text-2xl font-bold text-brand">{won(todaySales)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">이번달 매출</p>
          <p className="text-2xl font-bold text-gray-800">{won(monthSales)}</p>
          {growthRate !== null && (
            <p className={`text-xs mt-1.5 font-medium ${growthRate >= 0 ? 'text-green-500' : 'text-red-400'}`}>
              지난달 대비 {growthRate >= 0 ? '+' : ''}{growthRate}%
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">이번달 매입</p>
          <p className="text-2xl font-bold text-gray-800">{won(monthPurchase)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">이번달 순이익</p>
          <p className={`text-2xl font-bold ${monthProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {monthProfit >= 0 ? '+' : ''}{won(monthProfit)}
          </p>
          {monthSales > 0 && (
            <p className="text-xs mt-1.5 text-gray-400">
              마진율 {Math.round((monthProfit / monthSales) * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* 월 매출 목표 진행률 */}
      {monthlyTarget > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">이달 매출 목표</p>
            <p className="text-sm text-gray-400">
              {monthSales >= 10000 ? `${Math.round(monthSales / 10000)}만` : monthSales.toLocaleString()}원
              {' / '}
              {monthlyTarget >= 10000 ? `${Math.round(monthlyTarget / 10000)}만` : monthlyTarget.toLocaleString()}원
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2.5 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${targetProgress}%`,
                background: targetProgress >= 100 ? '#16A34A' : 'var(--color-brand, #F97316)',
              }}
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-orange-500">{targetProgress}% 달성</span>
            <span className="text-gray-400">
              {monthSales >= monthlyTarget
                ? '🎉 목표 달성!'
                : `남은 ${remainingDays}일 · 하루 ${requiredDaily >= 10000 ? `${Math.round(requiredDaily / 10000)}만` : requiredDaily.toLocaleString()}원 더!`}
            </span>
          </div>
        </div>
      )}

      {/* 최근 7일 바 차트 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-5">최근 7일 매출</p>
        <div className="flex items-end gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const day = new Date(now)
            day.setDate(day.getDate() - (6 - i))
            const dateStr = `${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}`
            const row = recentDays.find(r => r.sale_date === dateStr)
            const val = row?.total ?? 0
            const barH = val > 0 ? Math.max((val / maxBar) * 80, 6) : 3
            const isToday = i === 6
            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-500 h-4 text-center leading-4">
                  {val > 0 ? (val >= 10000 ? `${Math.round(val / 10000)}만` : val.toLocaleString()) : ''}
                </span>
                <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                  <div
                    className={`w-full rounded-t-md ${isToday ? 'bg-brand' : 'bg-orange-100'}`}
                    style={{ height: barH, opacity: val > 0 ? 1 : 0.35 }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'font-bold text-brand' : 'text-gray-400'}`}>
                  {pad(day.getDate())}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '✏️', label: '매출 입력',   href: '/dashboard/input' },
          { emoji: '📦', label: '매입 내역',   href: '/dashboard/purchases' },
          { emoji: '📊', label: '월별 손익',   href: '/dashboard/report' },
        ].map(({ emoji, label, href }) => (
          <a
            key={href}
            href={href}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-center block"
          >
            <p className="text-2xl mb-2">{emoji}</p>
            <p className="text-sm font-semibold text-gray-700">{label}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
