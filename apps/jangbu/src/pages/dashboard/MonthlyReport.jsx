import { useState, useEffect } from 'react'
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

export default function MonthlyReport() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState([])

  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const [salesItemTotal, setSalesItemTotal] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const pad = (n) => String(n).padStart(2, '0')
      const start = `${year}-${pad(month)}-01`
      const end = new Date(year, month, 0)
      const endStr = `${year}-${pad(month)}-${pad(end.getDate())}`

      const [{ data: salesData }, { data: purchasesData }, { data: salesItemsData }] = await Promise.all([
        supabase.from('sales').select('*').eq('user_id', user.id)
          .gte('sale_date', start).lte('sale_date', endStr).order('sale_date'),
        supabase.from('purchases').select('total_amount').eq('user_id', user.id)
          .gte('purchase_date', start).lte('purchase_date', endStr),
        supabase.from('sales_items').select('total_amount').eq('user_id', user.id)
          .gte('sale_date', start).lte('sale_date', endStr),
      ])

      setRows(salesData ?? [])
      setPurchaseTotal((purchasesData ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0))
      setSalesItemTotal((salesItemsData ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0))
    }
    load()
  }, [year, month])

  const monthTotal = rows.reduce((a, r) => a + (r.total ?? 0), 0)
  const fieldTotals = Object.fromEntries(
    FIELDS.map(f => [f.key, rows.reduce((a, r) => a + (r[f.key] ?? 0), 0)])
  )

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">월별 리포트</h2>

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
          <p className="text-2xl font-bold text-brand">{won(monthTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">영업일</p>
          <p className="text-2xl font-bold text-gray-800">{rows.length}일</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">일평균 매출</p>
          <p className="text-2xl font-bold text-gray-800">
            {won(rows.length ? Math.round(monthTotal / rows.length) : 0)}
          </p>
        </div>
      </div>

      {/* 손익 요약 */}
      {(purchaseTotal > 0 || salesItemTotal > 0 || monthTotal > 0) && (() => {
        const totalSales = salesItemTotal + monthTotal
        const profit     = totalSales - purchaseTotal
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
            <div className="border-t border-gray-100 pt-4 grid grid-cols-3 divide-x divide-gray-100">
              <div className="pr-5">
                <p className="text-xs text-gray-400 mb-1">통합 매출</p>
                <p className="text-lg font-bold text-brand">{won(totalSales)}</p>
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
