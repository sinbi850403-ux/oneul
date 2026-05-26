import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { todayKST, getMonthRange } from '../lib/date.js'
import { vat, dDay, nextVatDeadline, nextIncomeTaxDeadline } from '../lib/tax.js'

export default function Tax() {
  const today = todayKST()
  const year = parseInt(today.slice(0, 4))
  const month = parseInt(today.slice(5, 7))

  const [monthTotal, setMonthTotal] = useState(0)
  const [taxType, setTaxType] = useState('general')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('tax_type')
        .eq('user_id', user.id)
        .single()
      if (profile) setTaxType(profile.tax_type)

      const { start, end } = getMonthRange(year, month)
      const { data } = await supabase
        .from('sales')
        .select('total')
        .eq('user_id', user.id)
        .gte('sale_date', start)
        .lte('sale_date', end)

      const total = data?.reduce((a, r) => a + (r.total ?? 0), 0) ?? 0
      setMonthTotal(total)
    }
    load()
  }, [year, month])

  const vatAmount = vat(monthTotal, taxType)
  const vatDeadline = nextVatDeadline()
  const incomeTaxDeadline = nextIncomeTaxDeadline()
  const vatD = dDay(vatDeadline)
  const incomeD = dDay(incomeTaxDeadline)

  return (
    <div className="px-5 pt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">세금 안내</h2>
      <p className="text-xs text-gray-400 mb-6">
        참고용 추정치입니다. 정확한 신고는 세무사와 상담하세요.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <p className="text-sm text-gray-500 mb-1">{year}년 {month}월 누계 매출</p>
        <p className="text-2xl font-bold text-gray-900 mb-4">₩ {monthTotal.toLocaleString('ko-KR')}</p>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">
              부가세 예상
              <span className="text-xs text-gray-400 ml-1">
                ({taxType === 'simple' ? '간이과세자' : '일반과세자'})
              </span>
            </span>
            <span className="text-xl font-bold text-brand">
              ₩ {vatAmount.toLocaleString('ko-KR')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">종합소득세</span>
            <span className="text-sm text-gray-400">전문가 상담 권장</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">다음 신고 마감일</p>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div>
            <span className="text-gray-700">부가세</span>
            <span className="text-xs text-gray-400 ml-2">{vatDeadline}</span>
          </div>
          <span className={`font-bold text-base ${vatD <= 30 ? 'text-red-500' : 'text-gray-600'}`}>
            D-{vatD}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <div>
            <span className="text-gray-700">종합소득세</span>
            <span className="text-xs text-gray-400 ml-2">{incomeTaxDeadline}</span>
          </div>
          <span className={`font-bold text-base ${incomeD <= 30 ? 'text-red-500' : 'text-gray-600'}`}>
            D-{incomeD}
          </span>
        </div>
      </div>
    </div>
  )
}
