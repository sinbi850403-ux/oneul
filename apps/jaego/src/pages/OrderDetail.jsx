import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrderDetail } from '../hooks/useOrders'
import { useSuppliers } from '../hooks/useSuppliers'
import { useProductSearch } from '../hooks/useProducts'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'
import { ORDER_STATUS_LABEL } from '../lib/constants'
import { exportOrderToExcel } from '../lib/excel'

const STATUS_COLOR = { pending: '#2563EB', completed: '#059669', cancelled: '#9CA3AF' }
const STATUS_BG    = { pending: '#EFF6FF', completed: '#ECFDF5', cancelled: '#F9FAFB' }

function fmt(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

export default function OrderDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { order, items, loading, addItem, removeItem, updateItemQty, completeOrder, refetch } = useOrderDetail(id)
  const { suppliers } = useSuppliers()
  const { results, loading: searchLoading, search, clear } = useProductSearch()

  const [keyword,     setKeyword]     = useState('')
  const [showDrop,    setShowDrop]    = useState(false)
  const [addQty,      setAddQty]      = useState(1)
  const [selectedPrd, setSelectedPrd] = useState(null)
  const [completing,  setCompleting]  = useState(false)
  const [editQty,     setEditQty]     = useState({}) // itemId → value

  const isPending = order?.status === 'pending'

  function handleKeyword(e) {
    const v = e.target.value
    setKeyword(v)
    setSelectedPrd(null)
    if (v.length >= 1) { search(v); setShowDrop(true) }
    else { clear(); setShowDrop(false) }
  }

  function selectProduct(p) {
    setSelectedPrd(p)
    setKeyword(p.name)
    setShowDrop(false)
    clear()
  }

  async function handleAddItem() {
    if (!selectedPrd || addQty < 1) return
    await addItem(selectedPrd.id, addQty)
    setSelectedPrd(null)
    setKeyword('')
    setAddQty(1)
  }

  async function handleComplete() {
    if (!window.confirm('발주를 완료하면 상품이 자동으로 입고 처리됩니다. 완료할까요?')) return
    setCompleting(true)
    await completeOrder()
    setCompleting(false)
  }

  async function handleSupplierChange(supplierId) {
    await supabase.from('orders').update({ supplier_id: supplierId || null }).eq('id', id)
    refetch()
  }

  async function handleNoteChange(note) {
    await supabase.from('orders').update({ note }).eq('id', id)
    refetch()
  }

  async function handleQtyBlur(itemId, val) {
    if (val > 0) await updateItemQty(itemId, val)
    setEditQty(q => { const n = { ...q }; delete n[itemId]; return n })
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
      불러오는 중...
    </div>
  )

  if (!order) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
      발주를 찾을 수 없습니다.
    </div>
  )

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/orders')}
            style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>발주 상세</span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: STATUS_COLOR[order.status], background: STATUS_BG[order.status],
            padding: '3px 10px', borderRadius: 4,
          }}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportOrderToExcel(order, items)} style={{
            padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
            border: '1px solid var(--color-border)', background: 'var(--color-white)',
            color: 'var(--color-primary)', cursor: 'pointer',
          }}>📊 엑셀</button>
        {isPending && (
          <button onClick={handleComplete} disabled={completing || items.length === 0} style={{
            background: '#059669', color: 'var(--color-white)',
            padding: '7px 16px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14,
            border: 'none', cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            opacity: items.length === 0 ? 0.5 : 1,
          }}>{completing ? '처리 중...' : '발주 완료'}</button>
        )}
        </div>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 800, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '28px 32px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* 발주 정보 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: 20,
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>발주 정보</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 4 }}>거래처</label>
              {isPending ? (
                <select
                  defaultValue={order.suppliers ? suppliers.find(s => s.name === order.suppliers.name)?.id ?? '' : ''}
                  onChange={e => handleSupplierChange(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                    fontSize: 14, outline: 'none', background: 'var(--color-white)',
                  }}
                >
                  <option value="">거래처 선택</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <p style={{ fontSize: 14, padding: '9px 0', color: 'var(--color-text)' }}>
                  {order.suppliers?.name ?? '미지정'}
                </p>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 4 }}>메모</label>
              {isPending ? (
                <input
                  defaultValue={order.note}
                  onBlur={e => handleNoteChange(e.target.value)}
                  placeholder="메모 입력"
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              ) : (
                <p style={{ fontSize: 14, padding: '9px 0', color: 'var(--color-text)' }}>
                  {order.note || '-'}
                </p>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 12 }}>
            생성일 {fmt(order.created_at)}
            {order.completed_at && <span style={{ marginLeft: 12 }}>완료일 {fmt(order.completed_at)}</span>}
          </div>
        </div>

        {/* 상품 추가 (진행중일 때만) */}
        {isPending && (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: 20,
          }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>상품 추가</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                <input
                  type="text" placeholder="상품명 검색..." value={keyword}
                  onChange={handleKeyword}
                  onFocus={() => { if (results.length > 0) setShowDrop(true) }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {showDrop && results.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    background: 'var(--color-white)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {results.map(p => (
                      <button key={p.id} onMouseDown={() => selectProduct(p)} style={{
                        width: '100%', display: 'flex', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                        fontSize: 14, textAlign: 'left',
                      }}>
                        <span>{p.name}</span>
                        <span style={{ color: 'var(--color-text-sub)', fontSize: 12 }}>
                          재고 {p.stock?.[0]?.quantity ?? 0}{p.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number" min={1} value={addQty}
                onChange={e => setAddQty(Number(e.target.value))}
                style={{
                  width: 80, padding: '9px 12px',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                  fontSize: 14, fontWeight: 700, textAlign: 'center', outline: 'none',
                }}
              />
              <button onClick={handleAddItem} disabled={!selectedPrd} style={{
                padding: '9px 18px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
                background: selectedPrd ? 'var(--color-primary)' : 'var(--color-border)',
                color: 'var(--color-white)', border: 'none',
                cursor: selectedPrd ? 'pointer' : 'not-allowed',
              }}>추가</button>
            </div>
          </div>
        )}

        {/* 발주 항목 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>
            발주 항목 ({items.length})
          </div>
          {items.length === 0 ? (
            <p style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>
              상품을 추가해주세요.
            </p>
          ) : (
            items.map((item, i) => {
              const p = item.products
              const stock = p?.stock?.[0]?.quantity ?? 0
              const qtyVal = editQty[item.id] !== undefined ? editQty[item.id] : item.quantity
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p?.name ?? '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
                      현재 재고 {stock}{p?.unit ?? ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isPending ? (
                      <input
                        type="number" min={1} value={qtyVal}
                        onChange={e => setEditQty(q => ({ ...q, [item.id]: Number(e.target.value) }))}
                        onBlur={e => handleQtyBlur(item.id, Number(e.target.value))}
                        style={{
                          width: 72, padding: '6px 8px', textAlign: 'center',
                          border: '1px solid var(--color-border)', borderRadius: 4,
                          fontSize: 14, fontWeight: 700, outline: 'none',
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{item.quantity}{p?.unit ?? ''}</span>
                    )}
                    {isPending && (
                      <button onClick={() => removeItem(item.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 18, color: 'var(--color-text-sub)', lineHeight: 1,
                      }}>✕</button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
