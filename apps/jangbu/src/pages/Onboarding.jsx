import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const STEPS = ['가게 정보', '과세 유형', '완료']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [shopName, setShopName] = useState('')
  const [taxType, setTaxType] = useState('general')
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').upsert({
        user_id: user.id,
        shop_name: shopName.trim() || '내 가게',
        tax_type: taxType,
        onboarded: true,
      }, { onConflict: 'user_id' })
      const isPC = window.innerWidth >= 768
      navigate(isPC ? '/dashboard' : '/input', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const s = {
    wrap: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px',
    },
    card: {
      background: '#fff', borderRadius: 24,
      boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      padding: '36px 32px', width: '100%', maxWidth: 480,
    },
    progress: { display: 'flex', gap: 6, marginBottom: 32 },
    dot: (active, done) => ({
      flex: 1, height: 4, borderRadius: 2,
      background: done ? '#F97316' : active ? '#FED7AA' : '#E5E7EB',
      transition: 'background 0.3s',
    }),
    title: { fontSize: 22, fontWeight: 800, color: '#1F2937', marginBottom: 6 },
    sub:   { fontSize: 14, color: '#6B7280', marginBottom: 28 },
    input: {
      width: '100%', padding: '14px 16px', boxSizing: 'border-box',
      border: '1.5px solid #E5E7EB', borderRadius: 12,
      fontSize: 16, outline: 'none',
    },
    btn: (disabled) => ({
      width: '100%', padding: '15px',
      background: disabled ? '#D1D5DB' : '#F97316',
      color: '#fff', border: 'none', borderRadius: 12,
      fontSize: 16, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      marginTop: 24, transition: 'background 0.2s',
    }),
    skip: {
      textAlign: 'center', marginTop: 12,
      fontSize: 13, color: '#9CA3AF', cursor: 'pointer',
    },
  }

  return (
    <div style={s.wrap}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#F97316' }}>오늘장부</span>
      </div>

      <div style={s.card}>
        {/* 진행바 */}
        <div style={s.progress}>
          {STEPS.map((_, i) => (
            <div key={i} style={s.dot(i === step, i < step)} />
          ))}
        </div>

        {/* STEP 0: 가게 이름 */}
        {step === 0 && (
          <>
            <p style={s.title}>안녕하세요! 👋</p>
            <p style={s.sub}>가게 이름을 알려주세요</p>
            <input
              style={s.input}
              placeholder="예) 홍길동 식당"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && shopName.trim() && setStep(1)}
              autoFocus
            />
            <button style={s.btn(!shopName.trim())} disabled={!shopName.trim()} onClick={() => setStep(1)}>
              다음
            </button>
            <p style={s.skip} onClick={() => { setShopName('내 가게'); setStep(1) }}>건너뛰기</p>
          </>
        )}

        {/* STEP 1: 과세 유형 */}
        {step === 1 && (
          <>
            <p style={s.title}>과세 유형을 선택해주세요 🧾</p>
            <p style={s.sub}>부가세 계산에 사용돼요. 나중에 설정에서 변경할 수 있어요</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  key: 'general',
                  title: '일반 과세자',
                  desc: '매출의 1/11이 부가세 (연 매출 8,000만원 이상)',
                  emoji: '🏢',
                },
                {
                  key: 'simple',
                  title: '간이 과세자',
                  desc: '매출의 1.5%가 부가세 (연 매출 8,000만원 미만)',
                  emoji: '🏪',
                },
              ].map(({ key, title, desc, emoji }) => (
                <button
                  key={key}
                  onClick={() => setTaxType(key)}
                  style={{
                    padding: '16px 20px', borderRadius: 14, border: 'none',
                    background: taxType === key ? '#FFF7ED' : '#F9FAFB',
                    outline: taxType === key ? '2px solid #F97316' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                  }}
                >
                  <span style={{ fontSize: 28, marginTop: 2 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                  {taxType === key && (
                    <span style={{ marginLeft: 'auto', color: '#F97316', fontSize: 18, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <button style={s.btn(false)} onClick={() => setStep(2)}>다음</button>
          </>
        )}

        {/* STEP 2: 완료 */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
              <p style={{ ...s.title, textAlign: 'center' }}>준비 완료!</p>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                <strong style={{ color: '#1F2937' }}>{shopName || '내 가게'}</strong>의<br />
                매출을 오늘부터 스마트하게 관리해요
              </p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px 20px', marginBottom: 8 }}>
              {[
                { emoji: '📊', text: '매출 입력 → 카드/현금/페이 수단별 자동 집계' },
                { emoji: '📦', text: '재고앱 연동 → 입출고가 매입/매출로 자동 기록' },
                { emoji: '🧾', text: `부가세 예상: ${taxType === 'simple' ? '간이과세 (매출×1.5%)' : '일반과세 (매출÷11)'}` },
              ].map(({ emoji, text }) => (
                <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <span style={{ fontSize: 13, color: '#4B5563' }}>{text}</span>
                </div>
              ))}
            </div>

            <button style={s.btn(saving)} disabled={saving} onClick={handleFinish}>
              {saving ? '저장 중...' : '시작하기 →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
