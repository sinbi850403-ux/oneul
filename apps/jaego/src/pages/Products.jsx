import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import { uploadProductsFromExcel } from '../hooks/useStock'
import { parseProductsExcel } from '../lib/excel'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['전체', '일반', '식품', '음료', '주류', '냉동', '생활용품', '문구', '기타']

const CATEGORY_COLORS = {
  '일반':    { bg: '#F3F4F6', color: '#374151' },
  '식품':    { bg: '#FEF3C7', color: '#92400E' },
  '음료':    { bg: '#DBEAFE', color: '#1E40AF' },
  '주류':    { bg: '#EDE9FE', color: '#5B21B6' },
  '냉동':    { bg: '#E0F2FE', color: '#075985' },
  '생활용품': { bg: '#DCFCE7', color: '#166534' },
  '문구':    { bg: '#FFF7ED', color: '#9A3412' },
  '기타':    { bg: '#F1F5F9', color: '#475569' },
}

function CategoryBadge({ cat }) {
  const style = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['기타']
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color,
    }}>
      {cat}
    </span>
  )
}

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
function MobileProducts({ navigate, products, loading, keyword, setKeyword, filtered, toggleFavorite, uploading, fileRef, handleFileChange, activeCategory, setActiveCategory }) {
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
            border: 'none', cursor: 'pointer',
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
            fontSize: 15, background: 'var(--color-white)', marginBottom: 12, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500,
                border: `1px solid ${activeCategory === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-white)',
                color: activeCategory === cat ? '#fff' : 'var(--color-text-sub)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <button onClick={() => navigate(`/products/${p.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: 'var(--color-primary)', padding: 0, textAlign: 'left' }}>
                        {p.name}
                      </button>
                      {p.category && p.category !== '일반' && <CategoryBadge cat={p.category} />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
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
                      padding: '4px 8px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer',
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
          {uploading ? '업로드 중...' : '엑셀로 일괄 등록'}
        </button>

        {/* 재고 일괄 수정 */}
        <button
          onClick={() => navigate('/bulk-stock-edit')}
          style={{
            width: '100%', padding: '13px', marginTop: 8,
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            background: 'var(--color-white)',
            color: 'var(--color-text-sub)',
            fontWeight: 600, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          📊 재고 일괄 수정
        </button>
      </div>
    </div>
  )
}

/* ───────────────────── PC ───────────────────── */
function PCProducts({ navigate, products, loading, keyword, setKeyword, filtered, toggleFavorite, uploading, fileRef, handleFileChange, refetch, activeCategory, setActiveCategory }) {
  const [sortBy,     setSortBy]     = useState('name')
  const [editTarget, setEditTarget] = useState(null)
  const [saving,     setSaving]     = useState(false)

  async function handleEditSave() {
    setSaving(true)
    const { error } = await supabase.from('products').update({
      name:          editTarget.name,
      unit:          editTarget.unit,
      price:         Number(editTarget.price) || 0,
      selling_price: Number(editTarget.selling_price) || 0,
      min_quantity:  Number(editTarget.min_quantity) || 0,
      category:      editTarget.category,
    }).eq('id', editTarget.id)
    setSaving(false)
    if (!error) { setEditTarget(null); refetch() }
    else alert('수정에 실패했어요.')
  }

  async function handleDelete(p) {
    if (!window.confirm(`'${p.name}' 상품을 삭제할까요?\n입출고 이력도 모두 삭제됩니다.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (!error) refetch()
    else alert('삭제에 실패했어요.')
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'stock') {
      const sa = a.stock?.[0]?.quantity ?? 0
      const sb = b.stock?.[0]?.quantity ?? 0
      return sb - sa
    }
    return a.name.localeCompare(b.name, 'ko')
  })

  return (
    <>
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
            onClick={() => navigate('/bulk-stock-edit')}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-white)',
              color: 'var(--color-text-sub)',
              fontWeight: 600, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            재고 일괄 수정
          </button>
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
            {uploading ? '업로드 중...' : '엑셀 일괄 등록'}
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
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

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: activeCategory === cat ? 700 : 500,
                border: `1px solid ${activeCategory === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-white)',
                color: activeCategory === cat ? '#fff' : 'var(--color-text-sub)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 상품 수 */}
        <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 12 }}>
          총 <strong style={{ color: 'var(--color-text)' }}>{products.length}</strong>개 상품
          {activeCategory !== '전체' && <span style={{ marginLeft: 6, color: 'var(--color-primary)' }}>· {activeCategory} {filtered.length}개</span>}
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
                  {['#', '상품명', '카테고리', '단위', '재고 수량', '기본단가', '평균원가', '판가', '마진율', '즐겨찾기', ''].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px', fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-sub)',
                      borderBottom: '1px solid var(--color-border)',
                      width: col === '#' ? 48 : col === '즐겨찾기' ? 80 : col === '마진율' ? 80 : col === '' ? 120 : 'auto',
                      textAlign: ['기본단가', '평균원가', '판가', '마진율', '재고 수량'].includes(col) ? 'right' : 'left',
                    }}>
                      {col === '평균원가'
                        ? <span title="이동평균법&#10;입고 시마다 자동 재계산&#10;= (현재재고 × 현재평균 + 입고수량 × 입고단가) ÷ 총수량" style={{ cursor: 'help', borderBottom: '1px dashed var(--color-text-sub)' }}>평균원가</span>
                        : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const stock    = p.stock?.[0]?.quantity ?? 0
                  const avgCost  = p.stock?.[0]?.avg_cost ?? 0
                  const costBase = avgCost > 0 ? avgCost : (p.price ?? 0)
                  const margin   = costBase > 0 && p.selling_price > 0
                    ? Math.round((1 - costBase / p.selling_price) * 100)
                    : null
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        <button onClick={() => navigate(`/products/${p.id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--color-primary)', padding: 0, textAlign: 'left' }}>
                          {p.name}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <CategoryBadge cat={p.category ?? '일반'} />
                      </td>
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
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {avgCost > 0 ? (
                          <span style={{ fontWeight: 600, color: '#1D4ED8' }}>₩{Math.round(avgCost).toLocaleString()}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-sub)', fontSize: 12 }}>입고 후 계산</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--color-text-sub)' }}>
                        {p.selling_price > 0 ? `₩${p.selling_price.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {margin !== null ? (
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: margin >= 0 ? '#DCFCE7' : '#FEE2E2',
                            color: margin >= 0 ? '#16A34A' : '#DC2626',
                          }}>
                            {margin}%
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
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => setEditTarget({ id: p.id, name: p.name, unit: p.unit, price: p.price ?? 0, selling_price: p.selling_price ?? 0, min_quantity: p.min_quantity ?? 0, category: p.category ?? '일반' })}
                            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-white)', color: 'var(--color-text)', cursor: 'pointer' }}
                          >수정</button>
                          <button
                            onClick={() => handleDelete(p)}
                            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #FCA5A5', background: 'var(--color-white)', color: '#DC2626', cursor: 'pointer' }}
                          >삭제</button>
                        </div>
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

    {/* 수정 모달 */}
    {editTarget && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>상품 수정</h3>

          {/* 카테고리 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 8 }}>카테고리</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.filter(c => c !== '전체').map(cat => (
                <button key={cat} type="button" onClick={() => setEditTarget(t => ({ ...t, category: cat }))}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: editTarget.category === cat ? 700 : 500,
                    border: `1px solid ${editTarget.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: editTarget.category === cat ? 'var(--color-primary)' : '#fff',
                    color: editTarget.category === cat ? '#fff' : 'var(--color-text-sub)', cursor: 'pointer',
                  }}>{cat}</button>
              ))}
            </div>
          </div>

          {[
            { label: '상품명',         key: 'name',          type: 'text'   },
            { label: '단위',           key: 'unit',          type: 'text'   },
            { label: '단가 (매입)',    key: 'price',         type: 'number' },
            { label: '판가 (매출)',    key: 'selling_price', type: 'number' },
            { label: '안전재고 (최소)', key: 'min_quantity',  type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                type={type}
                value={editTarget[key]}
                onChange={e => setEditTarget(t => ({ ...t, [key]: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-sub)', cursor: 'pointer' }}>취소</button>
            <button onClick={handleEditSave} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

/* ───────────────────── Root ───────────────────── */
export default function Products() {
  const navigate = useNavigate()
  const { products, loading, toggleFavorite, refetch } = useAllProducts()
  const [keyword,        setKeyword]        = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')
  const [uploading,      setUploading]      = useState(false)
  const fileRef = useRef(null)
  const isMobile = useIsMobile()

  const filtered = products.filter(p => {
    const matchKeyword  = p.name.toLowerCase().includes(keyword.toLowerCase())
    const matchCategory = activeCategory === '전체' || (p.category ?? '일반') === activeCategory
    return matchKeyword && matchCategory
  })

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
    filtered, toggleFavorite, uploading, fileRef, handleFileChange, refetch,
    activeCategory, setActiveCategory,
  }

  return isMobile ? <MobileProducts {...shared} /> : <PCProducts {...shared} />
}
