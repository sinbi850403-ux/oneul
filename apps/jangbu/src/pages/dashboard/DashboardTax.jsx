import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { vat, dDay, nextVatDeadline, nextIncomeTaxDeadline } from '../../lib/tax.js'

function won(n) {
  return '₩ ' + (n ?? 0).toLocaleString('ko-KR')
}

export default function DashboardTax() {
  const now = new Date()
  const [year, setYear]         = useState(now.getFullYear())
  const [month, setMonth]       = useState(now.getMonth() + 1)
  const [monthTotal, setMonthTotal] = useState(0)
  const [yearTotal, setYearTotal]   = useState(0)
  const [taxType, setTaxType]   = useState('general')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles').select('tax_type').eq('user_id', user.id).single()
      if (profile) setTaxType(profile.tax_type)

      const pad = (n) => String(n).padStart(2, '0')

      const mStart = `${year}-${pad(month)}-01`
      const mEnd   = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`
      const { data: mData } = await supabase
        .from('sales').select('total').eq('user_id', user.id).gte('sale_date', mStart).lte('sale_date', mEnd)
      setMonthTotal(mData?.reduce((a, r) => a + (r.total ?? 0), 0) ?? 0)

      const { data: yData } = await supabase
        .from('sales').select('total').eq('user_id', user.id).gte('sale_date', `${year}-01-01`).lte('sale_date', `${year}-12-31`)
      setYearTotal(yData?.reduce((a, r) => a + (r.total ?? 0), 0) ?? 0)
    }
    load()
  }, [year, month])

  const vatDeadline    = nextVatDeadline()
  const incomeDeadline = nextIncomeTaxDeadline()
  const years  = [now.getFullYear() - 1, now.getFullYear()]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-stone-800 mb-1">세금 요약</h2>
      <p className="text-xs text-stone-400 mb-6">
        참고용 추정치입니다. 정확한 신고는 세무사와 상담하세요.
      </p>

      <div className="flex gap-3 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
        >
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
        >
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-stone-500 mb-1">{year}년 {month}월 매출</p>
          <p className="text-xl font-bold text-stone-800">{won(monthTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-sm text-stone-500 mb-1">{year}년 연간 매출</p>
          <p className="text-xl font-bold text-stone-800">{won(yearTotal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-stone-700">부가세 예상</h3>
          <div className="relative group">
            <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-500 text-xs flex items-center justify-center cursor-default select-none">?</span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-stone-800 text-white text-xs rounded-xl px-3 py-2.5 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="font-semibold mb-1">계산 근거 (참고용 추정치)</p>
              <p>· 일반과세자: 매출 ÷ 11</p>
              <p>· 간이과세자: 매출 × 1.5%</p>
              <p className="mt-1.5 text-stone-400">매입세액 공제 미반영 금액입니다. 실제 납부액은 다를 수 있어요.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-stone-600">
            {month}월 매출 기준
            <span className="text-xs text-stone-400 ml-1">({taxType === 'simple' ? '간이과세자' : '일반과세자'})</span>
          </span>
          <span className="text-2xl font-bold text-brand">{won(vat(monthTotal, taxType))}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-stone-600">연간 매출 기준</span>
          <span className="text-xl font-semibold text-stone-700">{won(vat(yearTotal, taxType))}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="font-semibold text-stone-700 mb-4">신고 마감일</h3>
        <div className="flex justify-between items-center py-3 border-b border-stone-50">
          <div>
            <span className="text-stone-700 font-medium">부가세</span>
            <span className="text-xs text-stone-400 ml-2">{vatDeadline}</span>
          </div>
          <span className={`font-bold text-lg ${dDay(vatDeadline) <= 30 ? 'text-red-500' : 'text-stone-600'}`}>
            D-{dDay(vatDeadline)}
          </span>
        </div>
        <div className="flex justify-between items-center py-3">
          <div>
            <span className="text-stone-700 font-medium">종합소득세</span>
            <span className="text-xs text-stone-400 ml-2">{incomeDeadline}</span>
          </div>
          <span className={`font-bold text-lg ${dDay(incomeDeadline) <= 30 ? 'text-red-500' : 'text-stone-600'}`}>
            D-{dDay(incomeDeadline)}
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-3">종합소득세는 경비율에 따라 달라집니다. 전문가 상담을 권장합니다.</p>
      </div>
    </div>
  )
}
