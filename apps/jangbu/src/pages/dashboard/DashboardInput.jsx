import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { todayKST, toKSTDateString } from '../../lib/date.js'
import Toast from '../../components/Toast.jsx'

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

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, 0]))

export default function DashboardInput() {
  const [date, setDate] = useState(todayKST())
  const [values, setValues] = useState(EMPTY)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const total = Object.values(values).reduce((a, b) => a + b, 0)

  const load = useCallback(async (d) => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('sale_date', d)
      .maybeSingle()
    if (data) setValues(Object.fromEntries(FIELDS.map(f => [f.key, data[f.key] ?? 0])))
    else setValues(EMPTY)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('sales').upsert(
      { user_id: user.id, sale_date: date, ...values, total },
      { onConflict: 'user_id,sale_date' }
    )
    setSaving(false)
    if (error) {
      console.error('[sales upsert]', error)
      setToast(`저장 실패: ${error.message}`)
    } else {
      setToast('저장됐어요')
    }
  }

  function handleReset() {
    if (window.confirm('입력한 내용을 모두 초기화할까요?')) setValues(EMPTY)
  }

  function handleNumberInput(key, raw) {
    const num = raw.replace(/[^0-9]/g, '')
    setValues(v => ({ ...v, [key]: num === '' ? 0 : parseInt(num, 10) }))
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">매출 입력</h2>
        <input
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(toKSTDateString(new Date(e.target.value + 'T00:00:00')))}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-brand font-semibold outline-none focus:border-brand"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="grid grid-cols-2 gap-x-8">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-gray-600 text-sm w-24 shrink-0">{label}</span>
              <input
                type="text"
                inputMode="numeric"
                value={values[key] === 0 ? '' : values[key].toLocaleString('ko-KR')}
                onChange={(e) => handleNumberInput(key, e.target.value)}
                placeholder="0"
                className="text-right text-base font-medium text-gray-900 flex-1 outline-none placeholder-gray-300"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 rounded-2xl px-6 py-4 mb-4 flex justify-between items-center">
        <span className="text-gray-600 font-medium">합계</span>
        <span className="text-2xl font-bold text-brand">₩ {total.toLocaleString('ko-KR')}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-brand text-white rounded-xl py-3 text-base font-bold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-xl text-sm text-gray-400 border border-gray-200 hover:bg-gray-50"
        >
          초기화
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
