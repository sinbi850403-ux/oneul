import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'

const FIELDS = [
  { key: 'card',  label: '카드' },
  { key: 'cash',  label: '현금영수증' },
  { key: 'bank',  label: '무통장입금' },
  { key: 'vbank', label: '가상계좌' },
  { key: 'phone', label: '휴대폰결제' },
  { key: 'npay',  label: '네이버페이' },
  { key: 'kpay',  label: '카카오페이' },
  { key: 'etc',   label: '기타' },
]

function won(n) {
  return '₩ ' + (n ?? 0).toLocaleString('ko-KR')
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/* ── 일별 막대 차트 ── */
function DailyChart({ year, month, salesRows, salesItemsRows }) {
  const [hovered, setHovered] = useState(null)  // { day, total, manual, items, barH, x }
  const scrollRef = useRef(null)
  const daysInMonth = new Date(year, month, 0).getDate()

  // 날짜별 합산: sales(manual) + sales_items(재고앱)
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dateStr = `${year}-${pad(month)}-${pad(d)}`
    const manual  = salesRows.find(r => r.sale_date === dateStr)?.total ?? 0
    const items   = salesItemsRows
      .filter(r => r.sale_date === dateStr)
      .reduce((a, r) => a + (r.total_amount ?? 0), 0)
    return { day: d, dateStr, manual, items, total: manual + items }
  })

  const maxVal = Math.max(...dailyData.map(d => d.total), 1)
  const today  = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDay = isCurrentMonth ? today.getDate() : -1

  const totalSales = dailyData.reduce((a, d) => a + d.total, 0)
  const salesDays  = dailyData.filter(d => d.total > 0).length

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">일별 매출 현황</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-brand opacity-80" />수동
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-200" />재고앱
          </span>
        </div>
      </div>

      {/* 차트 영역 — 툴팁은 스크롤 div 밖(wrapper)에 위치 */}
      <div style={{ position: 'relative' }}>
        {/* 툴팁: scrollRef 기준 절대 위치 */}
        {hovered && (
          <div style={{
            position: 'absolute',
            left: Math.max(0, Math.min(
              hovered.x,
              (scrollRef.current?.offsetWidth ?? 320) - 130
            )),
            bottom: 20 + hovered.barH + 8,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '6px 12px',
            pointerEvents: 'none',
            zIndex: 20,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 1 }}>
              {month}월 {hovered.day}일 매출
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1F2937' }}>
              {hovered.total >= 10000
                ? `${(hovered.total / 10000).toFixed(1)}만원`
                : `${hovered.total.toLocaleString()}원`}
            </div>
            {hovered.manual > 0 && hovered.items > 0 && (
              <div style={{ fontSize: 10, color: '#D1D5DB', marginTop: 2, display: 'flex', gap: 6 }}>
                <span>수동 {hovered.manual >= 10000 ? `${(hovered.manual/10000).toFixed(1)}만` : hovered.manual.toLocaleString()}</span>
                <span>재고앱 {hovered.items >= 10000 ? `${(hovered.items/10000).toFixed(1)}만` : hovered.items.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* 스크롤 컨테이너 */}
        <div ref={scrollRef} style={{ overflowX: 'auto' }}>
          <div
            style={{ minWidth: Math.max(daysInMonth * 28, 320), display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}
            onMouseLeave={() => setHovered(null)}
          >
            {dailyData.map(({ day, total, manual, items }) => {
              if (total === 0) {
                return (
                  <div
                    key={day}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end', cursor: 'default' }}
                    onMouseEnter={() => setHovered(null)}
                  >
                    <div style={{ width: '100%', height: 3, background: '#F3F4F6', borderRadius: 2 }} />
                    <span style={{ fontSize: 9, color: day === todayDay ? '#F97316' : '#D1D5DB', fontWeight: day === todayDay ? 700 : 400 }}>
                      {pad(day)}
                    </span>
                  </div>
                )
              }
              const barH    = Math.max((total / maxVal) * 76, 6)
              const manualH = items > 0 ? Math.round((manual / total) * barH) : barH
              const itemsH  = barH - manualH
              const isToday = day === todayDay
              const isHov   = hovered?.day === day
              return (
                <div
                  key={day}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    // getBoundingClientRect: 스크롤과 무관하게 현재 화면 기준 위치 계산
                    const barRect = e.currentTarget.getBoundingClientRect()
                    const containerRect = scrollRef.current.getBoundingClientRect()
                    const x = barRect.left - containerRect.left + barRect.width / 2 - 55
                    setHovered({ day, total, manual, items, barH, x })
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', transition: 'opacity 0.1s', opacity: isHov ? 0.8 : 1 }}>
                    {/* 재고앱 (위) */}
                    {itemsH > 0 && (
                      <div style={{ width: '100%', height: itemsH, background: isToday || isHov ? '#fed7aa' : '#FEF3C7', borderRadius: '2px 2px 0 0' }} />
                    )}
                    {/* 수동 (아래) */}
                    {manualH > 0 && (
                      <div style={{
                        width: '100%', height: manualH,
                        background: isToday || isHov ? 'var(--color-brand, #F97316)' : '#FDBA74',
                        borderRadius: itemsH > 0 ? 0 : '2px 2px 0 0',
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? '#F97316' : isHov ? '#374151' : '#9CA3AF', fontWeight: isToday || isHov ? 700 : 400 }}>
                    {pad(day)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 요약 */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>영업일 <strong className="text-gray-700">{salesDays}일</strong></span>
        <span>일평균 <strong className="text-gray-700">{salesDays > 0 ? (totalSales / salesDays / 10000).toFixed(1) : 0}만원</strong></span>
        {(() => {
          const best = dailyData.reduce((a, b) => b.total > a.total ? b : a, dailyData[0])
          if (best.total > 0) return (
            <span>최고 <strong className="text-brand">{best.day}일 {(best.total / 10000).toFixed(1)}만원</strong></span>
          )
          return null
        })()}
      </div>
    </div>
  )
}

export default function MonthlyReport() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState([])

  const [purchaseTotal,    setPurchaseTotal]    = useState(0)
  const [salesItemsRows,   setSalesItemsRows]   = useState([])
  const [taxType,          setTaxType]          = useState('general')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const start  = `${year}-${pad(month)}-01`
      const endObj = new Date(year, month, 0)
      const endStr = `${year}-${pad(month)}-${pad(endObj.getDate())}`

      const [{ data: salesData }, { data: purchasesData }, { data: siData }, { data: profile }] = await Promise.all([
        supabase.from('sales').select('*').eq('user_id', user.id)
          .gte('sale_date', start).lte('sale_date', endStr).order('sale_date'),
        supabase.from('purchases').select('total_amount').eq('user_id', user.id)
          .gte('purchase_date', start).lte('purchase_date', endStr),
        supabase.from('sales_items').select('sale_date, total_amount').eq('user_id', user.id)
          .gte('sale_date', start).lte('sale_date', endStr),
        supabase.from('profiles').select('tax_type').eq('user_id', user.id).maybeSingle(),
      ])

      setRows(salesData ?? [])
      setPurchaseTotal((purchasesData ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0))
      setSalesItemsRows(siData ?? [])
      setTaxType(profile?.tax_type ?? 'general')
    }
    load()
  }, [year, month])

  const salesItemTotal = salesItemsRows.reduce((a, r) => a + (r.total_amount ?? 0), 0)
  const monthTotal = rows.reduce((a, r) => a + (r.total ?? 0), 0)
  const fieldTotals = Object.fromEntries(
    FIELDS.map(f => [f.key, rows.reduce((a, r) => a + (r[f.key] ?? 0), 0)])
  )

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [now.getFullYear() - 1, now.getFullYear()]

  async function handleShare() {
    const totalSales   = salesItemTotal + monthTotal
    const estimatedVat = taxType === 'simple'
      ? Math.round(totalSales * 0.015)
      : Math.round(totalSales / 11)
    const profit     = totalSales - purchaseTotal - estimatedVat
    const marginRate = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0
    const text = [
      `📊 ${year}년 ${month}월 손익 리포트`,
      ``,
      `💰 매출 합계   ${won(totalSales)}`,
      `📦 매입 합계   ${won(purchaseTotal)}`,
      `🧾 예상 부가세  - ${won(estimatedVat)}`,
      `🎯 순이익      ${profit >= 0 ? '+' : ''}${won(profit)}`,
      `📈 마진율      ${marginRate}%`,
      ``,
      `— 오늘장부로 관리 중 💪`,
    ].join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: `${year}년 ${month}월 손익 리포트`, text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('클립보드에 복사됐어요!')
      }
    } catch (e) {
      // 사용자가 취소한 경우 무시
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">월별 리포트</h2>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
        >
          <span>↗</span> 공유
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
        >
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
        >
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">월 매출 누계</p>
          <p className="text-2xl font-bold text-brand">{won(monthTotal + salesItemTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">영업일</p>
          <p className="text-2xl font-bold text-gray-800">{rows.length}일</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">일평균 매출</p>
          <p className="text-2xl font-bold text-gray-800">
            {won(rows.length ? Math.round((monthTotal + salesItemTotal) / rows.length) : 0)}
          </p>
        </div>
      </div>

      {/* 일별 차트 */}
      <DailyChart
        year={year}
        month={month}
        salesRows={rows}
        salesItemsRows={salesItemsRows}
      />

      {/* 손익 요약 */}
      {(purchaseTotal > 0 || salesItemTotal > 0 || monthTotal > 0) && (() => {
        const totalSales  = salesItemTotal + monthTotal
        const estimatedVat = taxType === 'simple'
          ? Math.round(totalSales * 0.015)
          : Math.round(totalSales / 11)
        const profit     = totalSales - purchaseTotal - estimatedVat
        const marginRate = totalSales > 0 ? Math.round((profit / totalSales) * 100) : 0
        return (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <p className="text-xs text-gray-400 font-medium mb-4 uppercase tracking-wide">손익 요약</p>
            <div className="grid grid-cols-3 divide-x divide-gray-100 mb-4">
              <div className="pr-5">
                <p className="text-xs text-gray-400 mb-1">매입 합계</p>
                <p className="text-lg font-semibold text-gray-700">{won(purchaseTotal)}</p>
              </div>
              <div className="px-5">
                <p className="text-xs text-gray-400 mb-1">수동 매출</p>
                <p className="text-lg font-semibold text-gray-700">{won(monthTotal)}</p>
              </div>
              <div className="pl-5">
                <p className="text-xs text-gray-400 mb-1">재고앱 매출</p>
                <p className="text-lg font-semibold text-gray-700">{won(salesItemTotal)}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 grid grid-cols-4 divide-x divide-gray-100">
              <div className="pr-5">
                <p className="text-xs text-gray-400 mb-1">통합 매출</p>
                <p className="text-lg font-bold text-brand">{won(totalSales)}</p>
              </div>
              <div className="px-5">
                <p className="text-xs text-gray-400 mb-1">
                  예상 부가세
                  <span className="ml-1 text-gray-300">
                    ({taxType === 'simple' ? '간이 1.5%' : '일반 ÷11'})
                  </span>
                </p>
                <p className="text-lg font-bold text-red-400">- {won(estimatedVat)}</p>
              </div>
              <div className="px-5">
                <p className="text-xs text-gray-400 mb-1">순이익</p>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {profit >= 0 ? '+' : ''}{won(profit)}
                </p>
              </div>
              <div className="pl-5">
                <p className="text-xs text-gray-400 mb-1">마진율</p>
                <p className={`text-lg font-bold ${marginRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {marginRate}%
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">날짜</th>
              {FIELDS.map(f => (
                <th key={f.key} className="text-right px-3 py-3 text-gray-500 font-medium">{f.label}</th>
              ))}
              <th className="text-right px-4 py-3 text-gray-500 font-medium">합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={FIELDS.length + 2} className="text-center py-10 text-gray-400">
                  데이터가 없습니다
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{row.sale_date}</td>
                  {FIELDS.map(f => (
                    <td key={f.key} className="px-3 py-3 text-right text-gray-600">
                      {row[f.key] ? row[f.key].toLocaleString() : '-'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {(row.total ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-orange-50 border-t-2 border-orange-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700">합계</td>
                {FIELDS.map(f => (
                  <td key={f.key} className="px-3 py-3 text-right font-semibold text-gray-700">
                    {fieldTotals[f.key] ? fieldTotals[f.key].toLocaleString() : '-'}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-bold text-brand">
                  {monthTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
