import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import { exportStockToExcel } from '../lib/excel'
import { useIsMobile } from '../hooks/useIsMobile'

const WARN_COLOR = '#F59E0B'
const WARN_BG    = '#FFFBEB'

function isLow(p) {
  return (p.min_quantity ?? 0) > 0 && (p.stock?.[0]?.quantity ?? 0) <= p.min_quantity
}

function StockTable({ products, loading, keyword, setKeyword, sortBy, setSortBy, onMinQtyChange, isMobile }) {
  const filtered = products
    .filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'low')   return (isLow(b) ? 1 : 0) - (isLow(a) ? 1 : 0)
      if (sortBy === 'stock') return (a.stock?.[0]?.quantity ?? 0) - (b.stock?.[0]?.quantity ?? 0)
      return a.name.localeCompare(b.name, 'ko')
    })

  const lowCount = products.filter(isLow).length

  return (
    <>
      {lowCount > 0 && (
        <div style={{
          background: WARN_BG, border: `1px solid ${WARN_COLOR}`,
          borderRadius: 'var(--radius)', padding: '12px 16px',
          marginBottom: 16, fontSize: 14, color: '#92400E', fontWeight: 600,
        }}>
          ⚠️ 안전재고 부족 상품이 {lowCount}개 있어요
        </div>
      )}

      {/* 검색 + 정렬 + 엑셀 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="상품명 검색..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{
            flex: 1, minWidth: 160, padding: '9px 14px',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            fontSize: 14, background: 'var(--color-white)', outline: 'none',
          }}
        />
        {[['name','이름순'],['stock','재고순'],['low','부족순']].map(([v, l]) => (
          <button key={v} onClick={() => setSortBy(v)} style={{
            padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13,
            fontWeight: sortBy === v ? 700 : 500,
            border: '1px solid var(--color-border)',
            background: sortBy === v ? 'var(--color-primary)' : 'var(--color-white)',
            color: sortBy === v ? 'var(--color-white)' : 'var(--color-text-sub)',
            cursor: 'pointer',
          }}>{l}</button>
        ))}
        <button onClick={() => exportStockToExcel(products)} style={{
          padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--color-border)', background: 'var(--color-white)',
          color: 'var(--color-primary)', cursor: 'pointer',
        }}>📊 엑셀</button>
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 12 }}>
        총 <strong style={{ color: 'var(--color-text)' }}>{products.length}</strong>개 상품
        {lowCount > 0 && <span style={{ color: WARN_COLOR, marginLeft: 8 }}>({lowCount}개 부족)</span>}
      </div>

      <div style={{
        background: 'var(--color-white)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>상품이 없습니다.</p>
        ) : isMobile ? (
          filtered.map((p, i) => {
            const qty = p.stock?.[0]?.quantity ?? 0
            const low = isLow(p)
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                background: low ? WARN_BG : 'transparent',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name} {low && '⚠️'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
                    안전재고: {p.min_quantity ?? 0}{p.unit}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: low ? '#DC2626' : 'var(--color-text)' }}>
                    {qty.toLocaleString()}{p.unit}
                  </div>
                  <MinInput productId={p.id} value={p.min_quantity ?? 0} onSave={onMinQtyChange} />
                </div>
              </div>
            )
          })
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                {['상품명', '단위', '현재 재고', '안전재고', '상태'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px', fontSize: 12, fontWeight: 600,
                    color: 'var(--color-text-sub)', borderBottom: '1px solid var(--color-border)',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const qty = p.stock?.[0]?.quantity ?? 0
                const low = isLow(p)
                return (
                  <tr key={p.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: low ? WARN_BG : 'transparent',
                  }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>{p.unit}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: low ? '#DC2626' : 'var(--color-text)' }}>
                      {qty.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <MinInput productId={p.id} value={p.min_quantity ?? 0} onSave={onMinQtyChange} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {low
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: WARN_COLOR, background: WARN_BG, padding: '2px 8px', borderRadius: 4 }}>부족</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 4 }}>정상</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function MinInput({ productId, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState(value)

  function handleBlur() {
    setEditing(false)
    if (val !== value) onSave(productId, val)
  }

  if (editing) {
    return (
      <input
        type="number" min={0} value={val} autoFocus
        onChange={e => setVal(Number(e.target.value))}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        style={{
          width: 64, padding: '4px 8px', border: '1px solid var(--color-primary)',
          borderRadius: 4, fontSize: 13, textAlign: 'center', outline: 'none',
        }}
      />
    )
  }

  return (
    <button onClick={() => { setVal(value); setEditing(true) }} style={{
      background: 'none', border: '1px dashed var(--color-border)',
      borderRadius: 4, padding: '4px 10px', fontSize: 13,
      color: 'var(--color-text-sub)', cursor: 'pointer',
    }}>
      {value}
    </button>
  )
}

export default function StockStatus() {
  const navigate = useNavigate()
  const { products, loading, updateMinQuantity } = useAllProducts()
  const [keyword, setKeyword] = useState('')
  const [sortBy,  setSortBy]  = useState('name')
  const isMobile = useIsMobile()

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8, marginRight: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          ←
        </button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>재고 현황</span>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 960, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '28px 32px 48px',
      }}>
        <StockTable
          products={products} loading={loading}
          keyword={keyword} setKeyword={setKeyword}
          sortBy={sortBy} setSortBy={setSortBy}
          onMinQtyChange={updateMinQuantity}
          isMobile={isMobile}
        />
      </div>
    </div>
  )
}
