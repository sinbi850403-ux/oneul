import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'

export default function ProductAdd() {
  const navigate = useNavigate()
  const { addProduct } = useAllProducts()

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('개')
  const [quantity, setQuantity] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('상품명을 입력해주세요.'); return }
    setSubmitting(true)
    setError('')
    try {
      await addProduct({ name: name.trim(), unit: unit.trim() || '개', quantity: Number(quantity) })
      navigate('/products')
    } catch (err) {
      setError('상품 추가 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    fontSize: 15,
    background: 'var(--color-white)',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 13,
    color: 'var(--color-text-sub)',
    display: 'block',
    marginBottom: 6,
    fontWeight: 500,
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}
          aria-label="뒤로가기"
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>상품 추가</span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 40px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>상품명 *</label>
            <input
              type="text"
              placeholder="예) 콜라 1.5L"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>단위</label>
            <input
              type="text"
              placeholder="예) 개, 박스, kg"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>초기 수량</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={{ ...inputStyle, fontSize: 20, fontWeight: 700 }}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--color-out-light)',
              border: '1px solid var(--color-out)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 14,
              color: 'var(--color-out)',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              background: submitting ? '#9CA3AF' : 'var(--color-primary)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '추가 중...' : '추가하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
