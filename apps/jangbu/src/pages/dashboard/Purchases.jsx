import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import * as XLSX from 'xlsx'

function won(n) { return '₩ ' + (n ?? 0).toLocaleString('ko-KR') }

function pad(n) { return String(n).padStart(2, '0') }

export default function Purchases() {
  const now = new Date()
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const start  = `${year}-${pad(month)}-01`
      const endDay = new Date(year, month, 0).getDate()
      const end    = `${year}-${pad(month)}-${pad(endDay)}`
      const { data } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .gte('purchase_date', start)
        .lte('purchase_date', end)
        .order('purchase_date', { ascending: false })
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [year, month])

  const filtered = keyword
    ? rows.filter(r => r.product_name?.toLowerCase().includes(keyword.toLowerCase()))
    : rows

  const totalAmount = filtered.reduce((a, r) => a + (r.total_amount ?? 0), 0)
  const totalQty    = filtered.reduce((a, r) => a + (r.quantity ?? 0), 0)

  function handleExcel() {
    const xlRows = filtered.map(r => ({
      '날짜':     r.purchase_date,
      '상품명':   r.product_name,
      '수량':     r.quantity,
      '단가':     r.unit_price,
      '합계금액': r.total_amount,
      '메모':     r.note ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(xlRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매입내역')
    XLSX.writeFile(wb, `매입내역_${year}${pad(month)}.xlsx`)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years  = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-stone-800">매입 내역</h2>
        <button onClick={handleExcel}
          className="px-4 py-2 text-sm font-semibold border border-stone-200 rounded-xl text-orange-500 hover:bg-orange-50">
          엑셀 다운로드
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400">
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400">
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <input type="text" placeholder="상품명 검색..." value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 min-w-40" />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-2xl p-5">
          <p className="text-sm text-stone-500 mb-1">총 매입금액</p>
          <p className="text-2xl font-bold text-blue-600">{won(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <p className="text-sm text-stone-500 mb-1">매입 건수</p>
          <p className="text-2xl font-bold text-stone-800">{filtered.length}건</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <p className="text-sm text-stone-500 mb-1">건당 평균</p>
          <p className="text-2xl font-bold text-stone-800">
            {won(filtered.length ? Math.round(totalAmount / filtered.length) : 0)}
          </p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">날짜</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">상품명</th>
              <th className="text-right px-4 py-3 text-stone-500 font-medium">수량</th>
              <th className="text-right px-4 py-3 text-stone-500 font-medium">단가</th>
              <th className="text-right px-4 py-3 text-stone-500 font-medium">합계금액</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-stone-400">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-stone-400">데이터가 없습니다</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id} className="border-t border-stone-50 hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{r.purchase_date}</td>
                <td className="px-4 py-3 font-medium text-stone-800">{r.product_name}</td>
                <td className="px-4 py-3 text-right text-stone-600">{r.quantity?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-stone-600">{r.unit_price > 0 ? r.unit_price.toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-blue-600">{(r.total_amount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-stone-400">{r.note ?? '-'}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-blue-50 border-t-2 border-blue-100">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-stone-700">합계</td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">{totalAmount.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
