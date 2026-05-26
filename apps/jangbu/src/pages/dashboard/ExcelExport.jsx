import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase.js'

const FIELDS = [
  { key: 'sale_date', label: '날짜' },
  { key: 'card',      label: '카드' },
  { key: 'cash',      label: '현금영수증' },
  { key: 'bank',      label: '무통장입금' },
  { key: 'vbank',     label: '가상계좌' },
  { key: 'phone',     label: '휴대폰결제' },
  { key: 'npay',      label: '네이버페이' },
  { key: 'kpay',      label: '카카오페이' },
  { key: 'etc',       label: '기타' },
  { key: 'total',     label: '합계' },
  { key: 'memo',      label: '메모' },
]

export default function ExcelExport() {
  const now = new Date()
  const [startYear, setStartYear]   = useState(now.getFullYear())
  const [startMonth, setStartMonth] = useState(1)
  const [endYear, setEndYear]       = useState(now.getFullYear())
  const [endMonth, setEndMonth]     = useState(now.getMonth() + 1)
  const [loading, setLoading]       = useState(false)

  const years  = [now.getFullYear() - 1, now.getFullYear()]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const pad    = (n) => String(n).padStart(2, '0')

  async function handleExport() {
    const start = `${startYear}-${pad(startMonth)}-01`
    const endDay = new Date(endYear, endMonth, 0).getDate()
    const end   = `${endYear}-${pad(endMonth)}-${pad(endDay)}`

    if (start > end) {
      alert('시작일이 종료일보다 늦습니다.')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', user.id)
      .gte('sale_date', start)
      .lte('sale_date', end)
      .order('sale_date')

    const rows = (data ?? []).map(row =>
      Object.fromEntries(FIELDS.map(f => [f.label, row[f.key] ?? '']))
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매출')

    const colWidths = FIELDS.map(f => ({ wch: f.key === 'sale_date' ? 12 : f.key === 'memo' ? 20 : 12 }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `오늘장부_${startYear}${pad(startMonth)}-${endYear}${pad(endMonth)}.xlsx`)
    setLoading(false)
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">엑셀 다운로드</h2>
      <p className="text-sm text-gray-400 mb-6">기간을 선택하면 매출 데이터를 .xlsx 파일로 내려받습니다.</p>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">시작</label>
            <div className="flex gap-2">
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {years.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {months.map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
          </div>

          <span className="text-gray-400 mt-5">~</span>

          <div>
            <label className="text-sm text-gray-500 mb-1 block">종료</label>
            <div className="flex gap-2">
              <select
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {years.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {months.map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          날짜 / 카드 / 현금영수증 / 무통장입금 / 가상계좌 / 휴대폰결제 / 네이버페이 / 카카오페이 / 기타 / 합계 / 메모
        </p>
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="bg-brand text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? '준비 중...' : '엑셀 다운로드'}
      </button>
    </div>
  )
}
