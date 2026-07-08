import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function won(n) { return '₩ ' + (n ?? 0).toLocaleString('ko-KR') }
function pad(n)  { return String(n).padStart(2, '0') }
function fmtDate(iso) {
  if (!iso) return '-'
  return iso.slice(5).replace('-', '/')   // "MM/DD"
}

export default function History() {
  const now = new Date()
  const [tab,     setTab]     = useState('sales')
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [year]                = useState(now.getFullYear())
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const start  = `${year}-${pad(month)}-01`
      const endDay = new Date(year, month, 0).getDate()
      const end    = `${year}-${pad(month)}-${pad(endDay)}`

      if (tab === 'sales') {
        // 매출: 수동 입력(sales) + 재고앱 출고(sales_items) 합산
        const [{ data: salesData }, { data: itemsData }] = await Promise.all([
          supabase
            .from('sales')
            .select('id, sale_date, total')
            .eq('user_id', user.id)
            .gte('sale_date', start)
            .lte('sale_date', end)
            .order('sale_date', { ascending: false }),
          supabase
            .from('sales_items')
            .select('id, product_name, quantity, unit_price, total_amount, sale_date, note')
            .eq('user_id', user.id)
            .gte('sale_date', start)
            .lte('sale_date', end)
            .order('sale_date', { ascending: false }),
        ])

        const combined = [
          ...(salesData ?? []).map(r => ({
            id:           `s-${r.id}`,
            name:         '매출 입력',
            date:         r.sale_date,
            unit_price:   null,
            quantity:     null,
            total_amount: r.total ?? 0,
            note:         null,
            type:         'manual',
          })),
          ...(itemsData ?? []).map(r => ({
            id:           `i-${r.id}`,
            name:         r.product_name,
            date:         r.sale_date,
            unit_price:   r.unit_price,
            quantity:     r.quantity,
            total_amount: r.total_amount ?? 0,
            note:         r.note,
            type:         'product',
          })),
        ].sort((a, b) => b.date.localeCompare(a.date))

        setRows(combined)
      } else {
        const { data } = await supabase
          .from('purchases')
          .select('id, product_name, quantity, unit_price, total_amount, purchase_date, note')
          .eq('user_id', user.id)
          .gte('purchase_date', start)
          .lte('purchase_date', end)
          .order('purchase_date', { ascending: false })

        setRows(
          (data ?? []).map(r => ({
            id:           r.id,
            name:         r.product_name,
            date:         r.purchase_date,
            unit_price:   r.unit_price,
            quantity:     r.quantity,
            total_amount: r.total_amount ?? 0,
            note:         r.note,
            type:         'purchase',
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [tab, month, year])

  const total  = rows.reduce((a, r) => a + (r.total_amount ?? 0), 0)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="px-5 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-stone-800">내역</h2>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="text-brand font-semibold text-base outline-none"
        >
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      {/* 탭 */}
      <div className="flex bg-stone-100 rounded-2xl p-1 mb-5">
        {[['sales', '매출 내역'], ['purchases', '매입 내역']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-brand shadow-card' : 'text-stone-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 합계 카드 */}
      <div className={`${tab === 'sales' ? 'bg-orange-50' : 'bg-blue-50'} rounded-2xl px-5 py-4 mb-4 flex justify-between items-center`}>
        <span className="text-stone-600 font-medium text-sm">
          {month}월 {tab === 'sales' ? '매출' : '매입'} 합계
        </span>
        <span className={`text-xl font-bold ${tab === 'sales' ? 'text-brand' : 'text-blue-600'}`}>
          {won(total)}
        </span>
      </div>

      {/* 목록 */}
      {loading ? (
        <p className="text-center text-stone-400 py-10 text-sm">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-stone-400 py-10 text-sm">내역이 없습니다</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center justify-between px-4 py-3 ${
                i < rows.length - 1 ? 'border-b border-stone-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-stone-800 text-sm truncate">{r.name}</span>
                  {r.type === 'manual' && (
                    <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                      수동입력
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {fmtDate(r.date)}
                  {r.unit_price != null && r.unit_price > 0 && (
                    <span className="ml-2">단가 {r.unit_price.toLocaleString()}</span>
                  )}
                  {r.note && <span className="ml-2">· {r.note}</span>}
                </div>
              </div>
              <div className="text-right ml-3 shrink-0">
                <div className={`font-bold text-sm ${tab === 'sales' ? 'text-brand' : 'text-blue-600'}`}>
                  {won(r.total_amount)}
                </div>
                {r.quantity != null && (
                  <div className="text-xs text-stone-400">{r.quantity}개</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
