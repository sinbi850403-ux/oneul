import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useFavoriteProducts, useProductSearch } from '../hooks/useProducts'
import { stockReturn, useStockLog } from '../hooks/useStock'
import { useIsMobile } from '../hooks/useIsMobile'

// ── 날짜 포맷 MM/DD HH:mm ───────────────────────────────────────────────────
function fmtDateTime(iso) {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

function todayCount(logs) {
  const today = new Date().toDateString()
  return logs.filter(l => new Date(l.created_at).toDateString() === today).length
}

// ── 공통 폼 UI ───────────────────────────────────────────────────────────────
function ReturnForm({ user, onSuccess }) {
  const { products: favorites, loading: favLoading } = useFavoriteProducts()
  const { results, loading: searchLoading, search, clear } = useProductSearch()

  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const searchRef = useRef(null)

  function selectProduct(p) {
    setSelected(p)
    setKeyword(p.name)
    setShowDrop(false)
    clear()
    setError('')
    setSuccess('')
  }

  function handleKeywordChange(e) {
    const v = e.target.value
    setKeyword(v)
    setSelected(null)
    if (v.length >= 1) {
      search(v)
      setShowDrop(true)
    } else {
      clear()
      setShowDrop(false)
    }
  }

  function resetForm() {
    setSelected(null)
    setKeyword('')
    setQty(1)
    setNote('')
    setShowDrop(false)
    clear()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) { setError('상품을 선택해주세요.'); return }
    if (qty < 1) { setError('수량은 1 이상이어야 합니다.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await stockReturn(user.id, selected.id, qty, note || null)
      setSuccess(`"${selected.name}" ${qty}${selected.unit} 반품 완료!`)
      resetForm()
      onSuccess?.()
    } catch {
      setError('반품 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* 즐겨찾기 카드 */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 10 }}>즐겨찾기 상품</p>
        {favLoading ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>불러오는 중...</p>
        ) : favorites.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>즐겨찾기 상품이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {favorites.map(p => {
              const stock = p.stock?.[0]?.quantity ?? 0
              const isSelected = selected?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  style={{
                    background: isSelected ? 'var(--color-return-light)' : 'var(--color-white)',
                    border: `2px solid ${isSelected ? 'var(--color-return)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>재고 {stock}{p.unit}</div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* 검색 */}
      <section style={{ marginBottom: 20, position: 'relative' }} ref={searchRef}>
        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 8 }}>상품 검색</p>
        <input
          type="text"
          placeholder="상품명 입력..."
          value={keyword}
          onChange={handleKeywordChange}
          onFocus={() => { if (results.length > 0) setShowDrop(true) }}
          style={{
            width: '100%',
            padding: '12px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: 15,
            background: 'var(--color-white)',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {showDrop && results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 20,
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {searchLoading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-sub)' }}>검색 중...</div>}
            {results.map(p => (
              <button
                key={p.id}
                onMouseDown={() => selectProduct(p)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--color-text)' }}>{p.name}</span>
                <span style={{ color: 'var(--color-text-sub)', fontSize: 12 }}>재고 {p.stock?.[0]?.quantity ?? 0}{p.unit}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 선택된 상품 */}
      {selected && (
        <div style={{
          background: 'var(--color-return-light)',
          border: '1px solid var(--color-return)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginTop: 2 }}>
              현재 재고: {selected.stock?.[0]?.quantity ?? 0}{selected.unit}
            </div>
          </div>
          <button
            onClick={resetForm}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-sub)' }}
          >✕</button>
        </div>
      )}

      {/* 폼 */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>수량</label>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: 20,
              fontWeight: 700,
              background: 'var(--color-white)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>메모 (선택)</label>
          <input
            type="text"
            placeholder="메모를 입력하세요"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontSize: 15,
              background: 'var(--color-white)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {success && (
          <div style={{
            background: 'var(--color-return-light)',
            border: '1px solid var(--color-return)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 14,
            color: 'var(--color-return)',
            fontWeight: 600,
          }}>{success}</div>
        )}

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
            background: submitting ? '#9CA3AF' : 'var(--color-return)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: 16,
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '처리 중...' : '반품 처리'}
        </button>
      </form>
    </div>
  )
}

// ── PC 이력 테이블 ────────────────────────────────────────────────────────────
function LogTable({ logs, loading }) {
  return (
    <div style={{
      background: 'var(--color-white)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--color-text)',
      }}>최근 이력</div>
      {loading ? (
        <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--color-text-sub)' }}>불러오는 중...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--color-text-sub)' }}>이력이 없습니다.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--color-bg)' }}>
              {['일시', '상품명', '수량', '메모'].map(col => (
                <th key={col} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'var(--color-text-sub)',
                  borderBottom: '1px solid var(--color-border)',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>
                  {fmtDateTime(l.created_at)}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--color-text)', fontWeight: 500 }}>
                  {l.products?.name ?? '-'}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--color-return)', fontWeight: 700 }}>
                  {l.quantity}{l.products?.unit ?? ''}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>
                  {l.note ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function Return() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const { logs, loading: logLoading, fetchLogs } = useStockLog(null, 'return')

  useEffect(() => {
    if (!isMobile) fetchLogs()
  }, [isMobile])

  const todayCnt = todayCount(logs)

  // ── 모바일 ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <header style={{
          background: 'var(--color-white)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 16px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text)', marginRight: 12, padding: '4px 8px' }}
            aria-label="뒤로가기"
          >←</button>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-return)' }}>반품</span>
        </header>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px' }}>
          <ReturnForm user={user} />
        </div>
      </div>
    )
  }

  // ── PC ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* PC 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text)', padding: '4px 8px' }}
            aria-label="뒤로가기"
          >←</button>
          <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-return)' }}>반품</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>오늘 {todayCnt}건</span>
      </header>

      {/* PC 2컬럼 */}
      <div style={{
        display: 'flex',
        gap: 24,
        padding: '28px 32px 40px',
        maxWidth: 1200,
        margin: '0 auto',
        alignItems: 'flex-start',
      }}>
        {/* 왼쪽: 입력 폼 */}
        <div style={{
          width: 400,
          flexShrink: 0,
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 24,
        }}>
          <ReturnForm user={user} onSuccess={fetchLogs} />
        </div>

        {/* 오른쪽: 이력 테이블 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <LogTable logs={logs} loading={logLoading} />
        </div>
      </div>
    </div>
  )
}
