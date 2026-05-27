import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const INDUSTRIES = [
  { key: '편의점·마트',  emoji: '🏪', products: ['삼각김밥', '라면', '음료수', '과자', '아이스크림'] },
  { key: '카페',        emoji: '☕', products: ['아메리카노', '카페라떼', '케이크', '샌드위치', '주스'] },
  { key: '식당·분식',   emoji: '🍜', products: ['밥류', '국류', '찌개', '음료', '반찬'] },
  { key: '의류·잡화',   emoji: '👔', products: ['상의', '하의', '아우터', '가방', '액세서리'] },
  { key: '뷰티·미용',   emoji: '💄', products: ['커트', '염색', '파마', '트리트먼트', '네일'] },
  { key: '기타',        emoji: '📦', products: [] },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [shopName, setShopName] = useState('')
  const [industry, setIndustry] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [customProduct, setCustomProduct] = useState('')
  const [saving, setSaving] = useState(false)

  const samples = industry ? INDUSTRIES.find(i => i.key === industry)?.products ?? [] : []

  function toggleProduct(name) {
    setSelectedProducts(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    )
  }

  function addCustom() {
    const v = customProduct.trim()
    if (!v || selectedProducts.includes(v)) return
    setSelectedProducts(prev => [...prev, v])
    setCustomProduct('')
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    try {
      // 1. 프로필 저장
      await supabase.from('profiles').upsert({
        user_id:  user.id,
        shop_name: shopName.trim() || '내 가게',
        onboarded: true,
      }, { onConflict: 'user_id' })

      // 2. 선택한 상품 등록
      for (const name of selectedProducts) {
        const { data: product } = await supabase
          .from('products')
          .insert({ user_id: user.id, name, unit: '개' })
          .select()
          .single()
        if (product) {
          await supabase.from('stock').insert({
            user_id: user.id, product_id: product.id, quantity: 0,
          })
        }
      }

      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const STEPS = ['가게 이름', '업종 선택', '상품 등록', '완료']

  const s = {
    wrap: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px',
    },
    card: {
      background: '#fff', borderRadius: 24,
      boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      padding: '36px 32px', width: '100%', maxWidth: 480,
    },
    progress: {
      display: 'flex', gap: 6, marginBottom: 32,
    },
    dot: (active, done) => ({
      flex: 1, height: 4, borderRadius: 2,
      background: done ? 'var(--color-primary)' : active ? '#93C5FD' : '#E5E7EB',
      transition: 'background 0.3s',
    }),
    title: { fontSize: 22, fontWeight: 800, color: '#1F2937', marginBottom: 6 },
    sub:   { fontSize: 14, color: '#6B7280', marginBottom: 28 },
    input: {
      width: '100%', padding: '14px 16px', boxSizing: 'border-box',
      border: '1.5px solid #E5E7EB', borderRadius: 12,
      fontSize: 16, outline: 'none', transition: 'border 0.2s',
    },
    btn: (disabled) => ({
      width: '100%', padding: '15px',
      background: disabled ? '#D1D5DB' : 'var(--color-primary)',
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
        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</span>
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
              placeholder="예) 홍길동 편의점"
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

        {/* STEP 1: 업종 선택 */}
        {step === 1 && (
          <>
            <p style={s.title}>어떤 가게예요? 🏪</p>
            <p style={s.sub}>업종에 맞는 상품을 추천해드려요</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {INDUSTRIES.map(({ key, emoji }) => (
                <button
                  key={key}
                  onClick={() => { setIndustry(key); setSelectedProducts([]) }}
                  style={{
                    padding: '16px 8px', borderRadius: 12, border: 'none',
                    background: industry === key ? '#EFF6FF' : '#F9FAFB',
                    outline: industry === key ? '2px solid var(--color-primary)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 26 }}>{emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{key}</span>
                </button>
              ))}
            </div>
            <button style={s.btn(!industry)} disabled={!industry} onClick={() => setStep(2)}>
              다음
            </button>
          </>
        )}

        {/* STEP 2: 상품 등록 */}
        {step === 2 && (
          <>
            <p style={s.title}>자주 쓰는 상품을 골라요 📦</p>
            <p style={s.sub}>나중에 언제든 추가/수정할 수 있어요</p>

            {samples.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {samples.map(name => (
                  <button
                    key={name}
                    onClick={() => toggleProduct(name)}
                    style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                      background: selectedProducts.includes(name) ? 'var(--color-primary)' : '#F3F4F6',
                      color: selectedProducts.includes(name) ? '#fff' : '#374151',
                    }}
                  >
                    {selectedProducts.includes(name) ? '✓ ' : '+ '}{name}
                  </button>
                ))}
              </div>
            )}

            {/* 직접 입력 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...s.input, flex: 1, fontSize: 14, padding: '11px 14px' }}
                placeholder="직접 입력..."
                value={customProduct}
                onChange={e => setCustomProduct(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
              />
              <button
                onClick={addCustom}
                style={{
                  padding: '11px 16px', borderRadius: 10, border: 'none',
                  background: '#EFF6FF', color: 'var(--color-primary)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >추가</button>
            </div>

            {/* 선택된 목록 */}
            {selectedProducts.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedProducts.map(name => (
                  <span
                    key={name}
                    style={{
                      padding: '5px 10px', borderRadius: 20, fontSize: 12,
                      background: '#DCFCE7', color: '#166534', fontWeight: 600,
                    }}
                  >
                    ✓ {name}
                  </span>
                ))}
              </div>
            )}

            <button
              style={s.btn(false)}
              onClick={() => setStep(3)}
            >
              {selectedProducts.length > 0 ? `${selectedProducts.length}개 상품으로 시작` : '상품 없이 시작'}
            </button>
          </>
        )}

        {/* STEP 3: 완료 */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
              <p style={{ ...s.title, textAlign: 'center' }}>준비 완료!</p>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                <strong style={{ color: '#1F2937' }}>{shopName || '내 가게'}</strong>의<br />
                재고를 오늘부터 스마트하게 관리해요
              </p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '16px 20px', marginBottom: 8 }}>
              {[
                { emoji: '📥', text: '입고할 때 단가 입력 → 매입 자동 기록' },
                { emoji: '📤', text: '출고할 때 판가 입력 → 매출 자동 기록' },
                { emoji: '📊', text: '장부앱에서 순이익 바로 확인' },
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
