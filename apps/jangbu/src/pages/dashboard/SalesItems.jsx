import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import * as XLSX from 'xlsx'

function won(n) { return '₩ ' + (n ?? 0).toLocaleString('ko-KR') }
function pad(n)  { return String(n).padStart(2, '0') }

export default function SalesItems() {
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
        .from('sales_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('sale_date', start)
        .lte('sale_date', end)
        .order('sale_date', { ascending: false })
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [year, month])

  const filtered     = keyword
    ? rows.filter(r => r.product_name?.toLowerCase().includes(keyword.toLowerCase()))
    : rows

  const totalAmount  = filtered.reduce((a, r) => a + (r.total_amount ?? 0), 0)

  function handleExcel() {
    const xlRows = filtered.map(r => ({
      '날짜':     r.sale_date,
      '상품명':   r.product_name,
      '수량':     r.quantity,
      '판가':     r.unit_price,
      '매출금액': r.total_amount,
      '메모':     r.note ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(xlRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매출내역')
    XLSX.writeFile(wb, `매출내역_${year}${pad(month)}.xlsx`)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years  = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">매출 내역</h2>
        <button onClick={handleExcel}
          className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-orange-500 hover:bg-orange-50">
          📊 엑셀 다운로드
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400">
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400">
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <input type="text" placeholder="상품명 검색..." value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 min-w-40" />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">총 매출금액</p>
          <p className="text-2xl font-bold text-brand">{won(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">매출 건수</p>
          <p className="text-2xl font-bold text-gray-800">{filtered.length}건</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">건당 평균</p>
          <p className="text-2xl font-bold text-gray-800">
            {won(filtered.length ? Math.round(totalAmount / filtered.length) : 0)}
          </p>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">날짜</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">상품명</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">수량</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">판가</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">매출금액</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">데이터가 없습니다</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.sale_date}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.product_name}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.quantity?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.unit_price > 0 ? r.unit_price.toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand">{(r.total_amount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400">{r.note ?? '-'}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-orange-50 border-t-2 border-orange-100">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">합계</td>
                <td className="px-4 py-3 text-right font-bold text-brand">{totalAmount.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
