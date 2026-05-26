import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import { uploadProductsFromExcel } from '../hooks/useStock'
import { parseProductsExcel } from '../lib/excel'
import { useIsMobile } from '../hooks/useIsMobile'

/* ───────────────────── 공통 유틸 ───────────────────── */
function ExcelInput({ fileRef, onChange }) {
  return (
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      ref={fileRef}
      onChange={onChange}
      style={{ display: 'none' }}
    />
  )
}

/* ───────────────────── Mobile ───────────────────── */
function MobileProducts({ navigate, products, loading, keyword, setKeyword, filtered, toggleFavorite, uploading, fileRef, handleFileChange }) {
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
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}
          aria-label="뒤로가기"
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>상품 관리</span>
        <button
          onClick={() => navigate('/products/add')}
          style={{
            background: 'var(--color-primary)', color: 'var(--color-white)',
            padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14,
          }}
        >
          추가
        </button>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 40px' }}>
        {/* 검색 */}
        <input
          type="text"
          placeholder="상품명 검색..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            fontSize: 15, background: 'var(--color-white)', marginBottom: 16, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 상품 리스트 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px 0', fontSize: 14 }}>
            불러오는 중...
          </p>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '40px 24px',
            textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
          }}>
            {keyword ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.\n추가 버튼으로 상품을 등록해보세요!'}
          </div>
        ) : (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20,
          }}>
            {filtered.map((p, i) => {
              const stock = p.stock?.[0]?.quantity ?? 0
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginTop: 2 }}>
                      재고 <strong style={{ color: 'var(--color-text)' }}>{stock.toLocaleString()}</strong>{p.unit}
                      {p.selling_price > 0 && (
                        <span style={{ marginLeft: 8 }}>· 판가 ₩{p.selling_price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(p.id, p.is_favorite)}
                    style={{
                      fontSize: 22,
                      color: p.is_favorite ? '#FBBF24' : 'var(--color-border)',
                      padding: '4px 8px', lineHeight: 1,
                    }}
                    aria-label={p.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                  >
                    {p.is_favorite ? '★' : '☆'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* 엑셀 일괄 등록 */}
        <ExcelInput fileRef={fileRef} onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', padding: '13px',
            border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)',
            background: 'var(--color-white)',
            color: uploading ? 'var(--color-text-sub)' : 'var(--color-primary)',
            fontWeight: 600, fontSize: 14,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? '업로드 중...' : '📊 엑셀로 일괄 등록'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────────── PC ───────────────────── */
function PCProducts({ navigate, products, loading, keyword, setKeyword, filtered, toggleFavorite, uploading, fileRef, handleFileChange }) {
  const [sortBy, setSortBy] = useState('name') // 'name' | 'stock'

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'stock') {
      const sa = a.stock?.[0]?.quantity ?? 0
      const sb = b.stock?.[0]?.quantity ?? 0
      return sb - sa
    }
    return a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 32px',
        height: 56,
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
          <span style={{ fontWeight: 700, fontSize: 18 }}>상품 관리</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExcelInput fileRef={fileRef} onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius)',
              border: '1px dashed var(--color-border)',
              background: 'var(--color-white)',
              color: uploading ? 'var(--color-text-sub)' : 'var(--color-primary)',
              fontWeight: 600, fontSize: 14,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? '업로드 중...' : '📊 엑셀 일괄 등록'}
          </button>
          <button
            onClick={() => navigate('/products/add')}
            style={{
              background: 'var(--color-primary)', color: 'var(--color-white)',
              padding: '7px 20px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14,
              border: 'none', cursor: 'pointer',
            }}
          >
            + 상품 추가
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px 48px' }}>
        {/* 검색 + 정렬 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="상품명 검색..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
              fontSize: 14, background: 'var(--color-white)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[['name', '이름순'], ['stock', '재고순']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius)', fontSize: 13,
                  fontWeight: sortBy === val ? 700 : 500,
                  border: '1px solid var(--color-border)',
                  background: sortBy === val ? 'var(--color-primary)' : 'var(--color-white)',
                  color: sortBy === val ? 'var(--color-white)' : 'var(--color-text-sub)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 상품 수 */}
        <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 12 }}>
          총 <strong style={{ color: 'var(--color-text)' }}>{products.length}</strong>개 상품
        </div>

        {/* 테이블 */}
        <div style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>
              불러오는 중...
            </p>
          ) : sorted.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>
              {keyword ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다. 상품 추가 버튼으로 시작해보세요!'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                  {['#', '상품명', '단위', '재고 수량', '단가', '판가', '마진율', '즐겨찾기'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px', fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-sub)',
                      borderBottom: '1px solid var(--color-border)',
                      width: col === '#' ? 48 : col === '즐겨찾기' ? 80 : col === '마진율' ? 80 : 'auto',
                      textAlign: ['단가', '판가', '마진율', '재고 수량'].includes(col) ? 'right' : 'left',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const stock = p.stock?.[0]?.quantity ?? 0
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', fontSize: 13 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>{p.unit}</td>
                      <td style={{
                        padding: '12px 16px', fontWeight: 700, textAlign: 'right',
                        color: stock === 0 ? '#DC2626' : 'var(--color-text)',
                      }}>
                        {stock.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-sub)' }}>
                        {p.price > 0 ? `₩${p.price.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-sub)' }}>
                        {p.selling_price > 0 ? `₩${p.selling_price.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {p.price > 0 && p.selling_price > 0 ? (
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 20,
                            background: p.selling_price > p.price ? '#DCFCE7' : '#FEE2E2',
                            color: p.selling_price > p.price ? '#16A34A' : '#DC2626',
                          }}>
                            {Math.round((1 - p.price / p.selling_price) * 100)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleFavorite(p.id, p.is_favorite)}
                          style={{
                            fontSize: 20,
                            color: p.is_favorite ? '#FBBF24' : 'var(--color-border)',
                            background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
                          }}
                          aria-label={p.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 등록'}
                        >
                          {p.is_favorite ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── Root ───────────────────── */
export default function Products() {
  const navigate = useNavigate()
  const { products, loading, toggleFavorite, refetch } = useAllProducts()
  const [keyword, setKeyword] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const isMobile = useIsMobile()

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(keyword.toLowerCase())
  )

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const rows = await parseProductsExcel(file)
      await uploadProductsFromExcel(rows)
      await refetch()
    } catch {
      alert('엑셀 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const shared = {
    navigate, products, loading, keyword, setKeyword,
    filtered, toggleFavorite, uploading, fileRef, handleFileChange,
  }

  return isMobile ? <MobileProducts {...shared} /> : <PCProducts {...shared} />
}
