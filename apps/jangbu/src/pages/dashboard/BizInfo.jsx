import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import Toast from '../../components/Toast.jsx'

const FIELDS = [
  { key: 'shop_name',    label: '상호명',    placeholder: '예) 홍길동 분식' },
  { key: 'owner_name',   label: '대표자명',  placeholder: '예) 홍길동' },
  { key: 'biz_number',   label: '사업자번호', placeholder: '예) 123-45-67890' },
  { key: 'biz_category', label: '업태',      placeholder: '예) 소매업' },
  { key: 'biz_type',     label: '업종',      placeholder: '예) 잡화' },
  { key: 'address',      label: '주소',      placeholder: '예) 서울시 강남구 ...' },
]

export default function BizInfo() {
  const [values, setValues] = useState({
    shop_name: '', owner_name: '', biz_number: '',
    biz_category: '', biz_type: '', address: '',
    tax_type: 'general',
  })
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const { setShopName } = useOutletContext() ?? {}

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) setValues(v => ({ ...v, ...data }))
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update(values)
      .eq('user_id', user.id)
    setSaving(false)
    if (error) setToast('저장에 실패했어요')
    else {
      setToast('저장됐어요')
      setShopName?.(values.shop_name || '')
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">사업자 정보</h2>
      <p className="text-sm text-gray-400 mb-6">세금계산서, 엑셀 출력에 사용됩니다.</p>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
              <label className="text-sm text-gray-500 mb-1 block">{label}</label>
              <input
                type="text"
                value={values[key] ?? ''}
                onChange={(e) => setValues(v => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm text-gray-500 mb-2 block">과세 유형</label>
          <div className="flex gap-3">
            {[
              { value: 'general', label: '일반과세자' },
              { value: 'simple',  label: '간이과세자' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setValues(v => ({ ...v, tax_type: value }))}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  values.tax_type === value
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-brand text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
