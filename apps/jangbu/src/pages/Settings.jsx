import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { usePush } from '../hooks/usePush.js'
import Toast from '../components/Toast.jsx'

export default function Settings() {
  const [shopName, setShopName] = useState('')
  const [taxType, setTaxType] = useState('general')
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const { permission, subscribed, subscribe, unsubscribe } = usePush()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('shop_name, tax_type')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setShopName(data.shop_name ?? '')
        setTaxType(data.tax_type ?? 'general')
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ shop_name: shopName, tax_type: taxType })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) setToast('저장에 실패했어요')
    else setToast('저장됐어요')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handlePushToggle() {
    if (!userId) return
    setPushLoading(true)
    try {
      if (subscribed) {
        await unsubscribe(userId)
        setToast('알림을 껐어요')
      } else {
        const ok = await subscribe(userId)
        if (ok) setToast('매일 저녁 매출 입력 알림을 보내드려요')
        else setToast('알림 설정에 실패했어요. 브라우저 설정을 확인해주세요')
      }
    } finally {
      setPushLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('정말 탈퇴하시겠어요?\n모든 매출 데이터와 계정이 즉시 삭제되며 복구할 수 없습니다.')) return
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      setDeleting(false)
      setToast(json.error || '탈퇴 처리 중 오류가 발생했어요')
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="px-5 pt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">설정</h2>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-500 mb-1 block">가게 이름</label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="예) 홍길동 분식"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          />
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
                onClick={() => setTaxType(value)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                  taxType === value
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 푸시 알림 설정 */}
      {'Notification' in window && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">매출 입력 알림</p>
              <p className="text-xs text-gray-400 mt-0.5">매일 저녁 매출 기록을 알려드려요</p>
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
            <p className="text-xs text-red-400 mt-2">브라우저에서 알림을 차단했어요. 브라우저 설정에서 허용해주세요.</p>
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand text-white rounded-2xl py-4 text-lg font-bold mb-4 active:opacity-80 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>

      {/* 앱 공유 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-1">앱 공유하기</p>
        <p className="text-xs text-gray-400 mb-3">주변 사장님들께 오늘장부를 소개해주세요!</p>
        <button
          onClick={async () => {
            const url = 'https://oneul-jangbu.vercel.app'
            const text = '매출 장부 앱 써봐요! 달력 매출·세금·알바 급여 한번에 관리 돼요'
            if (navigator.share) {
              await navigator.share({ title: '오늘장부', text, url })
            } else {
              await navigator.clipboard.writeText(url)
              setToast('링크가 복사됐어요!')
            }
          }}
          className="w-full bg-brand text-white rounded-xl py-3 text-sm font-bold active:opacity-80"
        >
          친구에게 공유하기
        </button>
      </div>

      <a
        href="/dashboard"
        className="w-full text-center text-gray-500 text-sm py-3 block"
      >
        PC 대시보드로 →
      </a>

      <button
        onClick={handleLogout}
        className="w-full text-gray-400 text-sm py-3"
      >
        로그아웃
      </button>

      <button
        onClick={handleDeleteAccount}
        disabled={deleting}
        className="w-full text-xs text-gray-300 hover:text-red-400 py-2 disabled:opacity-50 transition-colors"
      >
        {deleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
      </button>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
