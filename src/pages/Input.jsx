import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { todayKST, toKSTDateString } from '../lib/date.js'
import NumberInput from '../components/NumberInput.jsx'
import Toast from '../components/Toast.jsx'

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

export default function Input() {
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(searchParams.get('date') || todayKST())
  const [values, setValues] = useState(EMPTY)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const total = Object.values(values).reduce((a, b) => a + b, 0)

  const load = useCallback(async (d) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', user.id)
      .eq('sale_date', d)
      .maybeSingle()

    if (data) {
      setValues(Object.fromEntries(FIELDS.map(f => [f.key, data[f.key] ?? 0])))
    } else {
      setValues(EMPTY)
    }
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
    if (error) setToast('저장에 실패했어요 ❌')
    else setToast('저장됐어요 ✅')
  }

  function handleReset() {
    if (window.confirm('입력한 내용을 모두 초기화할까요?')) {
      setValues(EMPTY)
    }
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">매출 입력</h2>
        <input
          type="date"
          value={date}
          max={todayKST()}
          onChange={(e) => setDate(toKSTDateString(new Date(e.target.value + 'T00:00:00')))}
          className="text-brand font-semibold text-base outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm px-4 mb-4">
        {FIELDS.map(({ key, label }) => (
          <NumberInput
            key={key}
            label={label}
            value={values[key]}
            onChange={(v) => setValues(prev => ({ ...prev, [key]: v }))}
          />
        ))}
      </div>

      <div className="bg-orange-50 rounded-2xl px-5 py-4 mb-4 flex justify-between items-center">
        <span className="text-gray-600 font-medium">오늘 합계</span>
        <span className="text-2xl font-bold text-brand">
          ₩ {total.toLocaleString('ko-KR')}
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand text-white rounded-2xl py-5 text-xl font-bold active:opacity-80 disabled:opacity-50 mb-3"
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>

      <button
        onClick={handleReset}
        className="w-full text-gray-400 text-sm py-2"
      >
        초기화
      </button>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
