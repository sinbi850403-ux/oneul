import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'
import { exportLogsToExcel } from '../lib/excel'

const TYPE_LABEL = { in: '입고', out: '출고', return: '반품' }
const TYPE_COLOR = { in: 'var(--color-in)', out: 'var(--color-out)', return: 'var(--color-return)' }
const TYPE_BG    = { in: 'var(--color-in-light)', out: 'var(--color-out-light)', return: 'var(--color-return-light)' }

function fmtDateTime(iso) {
  const d = new Date(iso)
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const dd  = String(d.getDate()).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

export default function ProductDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [product, setProduct] = useState(null)
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, unit, price, selling_price, stock(quantity)')
          .eq('id', id)
          .single(),
        supabase
          .from('stock_log')
          .select('id, type, quantity, unit_price, selling_price, note, created_at')
          .eq('product_id', id)
          .order('created_at', { ascending: false })
          .limit(200),
      ])
      setProduct(p)
      setLogs(l ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
      불러오는 중...
    </div>
  )
  if (!product) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
      상품을 찾을 수 없습니다.
    </div>
  )

  const stock    = product.stock?.[0]?.quantity ?? 0
  const inTotal  = logs.filter(l => l.type === 'in').reduce((a, l) => a + l.quantity, 0)
  const outTotal = logs.filter(l => l.type === 'out').reduce((a, l) => a + l.quantity, 0)
  const margin   = product.price > 0 && product.selling_price > 0
    ? Math.round((1 - product.price / product.selling_price) * 100)
    : null

  function handleExcel() {
    exportLogsToExcel(
      logs.map(l => ({ ...l, products: { name: product.name, unit: product.unit } })),
      product.name
    )
  }

  function handleEditOpen() {
    setEditForm({
      name:          product.name,
      unit:          product.unit,
      price:         product.price ?? 0,
      selling_price: product.selling_price ?? 0,
    })
    setEditing(true)
  }

  async function handleEditSave() {
    setSaving(true)
    const { error } = await supabase
      .from('products')
      .update({
        name:          editForm.name,
        unit:          editForm.unit,
        price:         Number(editForm.price) || 0,
        selling_price: Number(editForm.selling_price) || 0,
      })
      .eq('id', id)
    setSaving(false)
    if (!error) {
      setProduct(p => ({ ...p, ...editForm, price: Number(editForm.price) || 0, selling_price: Number(editForm.selling_price) || 0 }))
      setEditing(false)
    } else {
      alert('수정에 실패했어요.')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`'${product.name}' 상품을 삭제할까요?\n입출고 이력도 모두 삭제됩니다.`)) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) navigate(-1)
    else alert('삭제에 실패했어요.')
  }

  return (
    <>
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)}
            style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{product.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExcel} style={{
            padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
            border: '1px solid var(--color-border)', background: 'var(--color-white)',
            color: 'var(--color-primary)', cursor: 'pointer',
          }}>엑셀</button>
          <button onClick={handleEditOpen} style={{
            padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
            border: '1px solid var(--color-border)', background: 'var(--color-white)',
            color: 'var(--color-text)', cursor: 'pointer',
          }}>수정</button>
          <button onClick={handleDelete} style={{
            padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
            border: '1px solid #FCA5A5', background: 'var(--color-white)',
            color: '#DC2626', cursor: 'pointer',
          }}>삭제</button>
        </div>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 960, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '28px 32px 48px',
      }}>
        {/* 상품 정보 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>현재 재고</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stock === 0 ? '#DC2626' : 'var(--color-text)' }}>
              {stock.toLocaleString()}
              <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>{product.unit}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>단가 (매입)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {product.price > 0 ? `₩${product.price.toLocaleString()}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>판가 (매출)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {product.selling_price > 0 ? `₩${product.selling_price.toLocaleString()}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>마진율</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: margin !== null && margin > 0 ? '#059669' : 'var(--color-text-sub)' }}>
              {margin !== null ? `${margin}%` : '-'}
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '총 입고', value: inTotal, color: 'var(--color-in)', bg: 'var(--color-in-light)' },
            { label: '총 출고', value: outTotal, color: 'var(--color-out)', bg: 'var(--color-out-light)' },
            { label: '이력 건수', value: logs.length, unit: '건', color: 'var(--color-text)', bg: 'var(--color-white)' },
          ].map(({ label, value, unit, color, bg }) => (
            <div key={label} style={{
              background: bg, border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>
                {value.toLocaleString()}
                <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 2 }}>{unit ?? product.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 이력 테이블 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>
            입출고 이력 ({logs.length}건)
          </div>
          {logs.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>이력이 없습니다.</p>
          ) : isMobile ? (
            logs.map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: TYPE_COLOR[l.type],
                    background: TYPE_BG[l.type], padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                  }}>{TYPE_LABEL[l.type]}</span>
                  <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{l.note || fmtDateTime(l.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TYPE_COLOR[l.type] }}>
                    {l.type === 'out' ? '-' : '+'}{l.quantity}{product.unit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>{fmtDateTime(l.created_at)}</div>
                </div>
              </div>
            ))
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                  {['일시', '유형', '수량', '단가', '메모'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px', fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-sub)', borderBottom: '1px solid var(--color-border)',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => {
                  const priceVal = l.type === 'in' ? l.unit_price : l.selling_price
                  return (
                    <tr key={l.id}
                      style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: TYPE_COLOR[l.type],
                          background: TYPE_BG[l.type], padding: '2px 8px', borderRadius: 4,
                        }}>{TYPE_LABEL[l.type]}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: TYPE_COLOR[l.type] }}>
                        {l.type === 'out' ? '-' : '+'}{l.quantity}{product.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>
                        {priceVal > 0 ? `₩${priceVal.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>
                        {l.note ?? '-'}
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
    {editing && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}>
        <div style={{
          background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
          padding: '28px 28px 24px', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>상품 수정</h3>

          {[
            { label: '상품명',      key: 'name',          type: 'text'   },
            { label: '단위',        key: 'unit',          type: 'text'   },
            { label: '단가 (매입)', key: 'price',         type: 'number' },
            { label: '판가 (매출)', key: 'selling_price', type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                type={type}
                value={editForm[key]}
                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                  fontSize: 14, outline: 'none',
                }}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button onClick={() => setEditing(false)} style={{
              flex: 1, padding: '10px', borderRadius: 'var(--radius)', fontSize: 14,
              border: '1px solid var(--color-border)', background: 'var(--color-white)',
              color: 'var(--color-text-sub)', cursor: 'pointer',
            }}>취소</button>
            <button onClick={handleEditSave} disabled={saving} style={{
              flex: 2, padding: '10px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'var(--color-primary)',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? '저장 중...' : '저장'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
