import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import Toast from '../../components/Toast.jsx'
import { usePush } from '../../hooks/usePush.js'

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
    monthly_target: 0,
  })
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const { setShopName } = useOutletContext() ?? {}
  const { permission, subscribed, subscribe, unsubscribe } = usePush()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) setValues(v => ({ ...v, ...data }))
    }
    load()
  }, [])

  async function handlePushToggle() {
    if (!userId) return
    setPushLoading(true)
    try {
      if (subscribed) {
        await unsubscribe(userId)
        setToast('알림을 껐어요')
      } else {
        const ok = await subscribe(userId)
        if (ok) setToast('재고부족 알림이 켜졌어요 🔔')
        else setToast('알림 설정 실패 — 브라우저 설정에서 알림을 허용해주세요')
      }
    } finally {
      setPushLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(values)
      .eq('user_id', user.id)
      .select()
    setSaving(false)
    if (error || !updated?.length) {
      setToast(`저장에 실패했어요 (${error?.message ?? '0행 업데이트 — RLS 정책 확인 필요'})`)
    } else {
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

      {/* 월 매출 목표 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">월 매출 목표</h3>
        <p className="text-sm text-gray-400 mb-4">대시보드에 진행률로 표시돼요. 0이면 숨겨져요.</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="10000"
            value={values.monthly_target ?? 0}
            onChange={(e) => setValues(v => ({ ...v, monthly_target: Number(e.target.value) }))}
            placeholder="예) 5000000"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">원</span>
        </div>
        {(values.monthly_target ?? 0) > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            월 {((values.monthly_target ?? 0) / 10000).toLocaleString()}만원 목표
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-brand text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 mb-6"
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>

      {/* 알림 설정 */}
      {'Notification' in window && (
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">
          <h3 className="text-base font-bold text-gray-800 mb-1">푸시 알림</h3>
          <p className="text-sm text-gray-400 mb-5">재고 부족 시 알림을 받아요</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">재고부족 알림</p>
              <p className="text-xs text-gray-400 mt-0.5">안전재고 이하로 떨어지면 즉시 알림</p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={pushLoading || permission === 'denied'}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                subscribed ? 'bg-brand' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                subscribed ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {permission === 'denied' && (
            <p className="text-xs text-red-400 mt-3">브라우저에서 알림을 차단했어요. 브라우저 설정에서 허용해주세요.</p>
          )}
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
