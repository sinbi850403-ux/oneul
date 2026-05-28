import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { usePush } from '../hooks/usePush'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Settings() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const isMobile = useIsMobile()
  const [userId, setUserId] = useState(null)
  const [shopName, setShopName] = useState('')
  const [saving, setSaving] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [toast, setToast] = useState('')
  const { permission, subscribed, subscribe, unsubscribe } = usePush()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('shop_name').eq('user_id', user.id).maybeSingle()
      if (data?.shop_name) setShopName(data.shop_name)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update({ shop_name: shopName }).eq('user_id', userId)
    setSaving(false)
    setToast('저장됐어요')
    setTimeout(() => setToast(''), 2000)
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
        if (ok) setToast('재고부족 알림이 켜졌어요 🔔')
        else setToast('알림 허용이 필요해요 — 브라우저 설정 확인')
      }
    } finally {
      setPushLoading(false)
      setTimeout(() => setToast(''), 2500)
    }
  }

  const containerStyle = {
    background: 'var(--color-bg)', minHeight: '100vh',
  }
  const cardStyle = {
    background: 'var(--color-white)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    marginBottom: 16,
  }

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 20px' : '0 32px',
        height: isMobile ? 56 : 60,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text)', padding: '4px 8px' }}>
          ←
        </button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>설정</span>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: isMobile ? '20px 16px 40px' : '28px 32px 40px' }}>

        {/* 가게 이름 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 10, fontWeight: 600 }}>가게 이름</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="예) 홍길동 편의점"
              style={{
                flex: 1, padding: '10px 14px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                fontSize: 14, outline: 'none', background: 'var(--color-white)',
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 18px', borderRadius: 'var(--radius)',
                background: 'var(--color-primary)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 14,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </div>

        {/* 푸시 알림 */}
        {'Notification' in window && (
          <div style={cardStyle}>
            <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 14, fontWeight: 600 }}>알림</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>재고부족 알림 🔔</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 3 }}>
                  안전재고 이하로 떨어지면 즉시 알림
                </p>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={pushLoading || permission === 'denied'}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: subscribed ? 'var(--color-primary)' : '#D1D5DB',
                  border: 'none', cursor: pushLoading || permission === 'denied' ? 'not-allowed' : 'pointer',
                  position: 'relative', transition: 'background 0.2s',
                  opacity: pushLoading || permission === 'denied' ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: subscribed ? 25 : 3,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {permission === 'denied' && (
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>
                브라우저에서 알림을 차단했어요. 브라우저 설정에서 허용해주세요.
              </p>
            )}
          </div>
        )}

        {/* 앱 공유 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 10, fontWeight: 600 }}>앱 공유하기</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 12, lineHeight: 1.6 }}>
            주변 사장님들께 오늘재고를 소개해주세요!
          </p>
          <button
            onClick={async () => {
              const url = 'https://oneul-jaego.vercel.app'
              const text = '재고관리 앱 써봐요! 입출고·순이익·매출목표 한눈에 관리돼요 📦'
              if (navigator.share) {
                await navigator.share({ title: '오늘재고', text, url })
              } else {
                await navigator.clipboard.writeText(url)
                setToast('링크가 복사됐어요!')
              }
            }}
            style={{
              width: '100%', padding: '11px',
              border: 'none', borderRadius: 'var(--radius)',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            친구에게 공유하기
          </button>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={signOut}
          style={{
            width: '100%', padding: '13px',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            background: 'var(--color-white)', color: 'var(--color-text-sub)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '12px 24px',
          borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
          zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
