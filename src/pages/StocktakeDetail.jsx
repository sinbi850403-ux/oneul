import { useNavigate, useParams } from 'react-router-dom'
import { useStocktakeDetail } from '../hooks/useStocktake'
import { STOCKTAKE_STATUS } from '../lib/constants'

export default function StocktakeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { items, loading, status, updateActualQty, adjustItem, finishStocktake } = useStocktakeDetail(id)

  const isDone = status === STOCKTAKE_STATUS.DONE

  async function handleFinish() {
    if (!window.confirm('실사를 완료하시겠습니까? 완료 후에는 수정할 수 없습니다.')) return
    try {
      await finishStocktake()
      navigate('/stocktake')
    } catch (err) {
      alert('실사 완료 처리 중 오류가 발생했습니다.')
    }
  }

  async function handleAdjust(item) {
    try {
      await adjustItem(item.id, item.products.id, item.actual_qty)
    } catch (err) {
      alert('재고 조정 중 오류가 발생했습니다.')
    }
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
          onClick={() => navigate('/stocktake')}
          style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}
          aria-label="뒤로가기"
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>재고실사</span>
        {isDone && (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'var(--color-in-light)',
            color: 'var(--color-in)',
          }}>완료</span>
        )}
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px 0', fontSize: 14 }}>
            불러오는 중...
          </p>
        ) : items.length === 0 ? (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--color-text-sub)',
            fontSize: 14,
          }}>
            실사 항목이 없습니다.
          </div>
        ) : (
          <>
            {/* 컬럼 헤더 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 64px 90px 56px 56px',
              gap: 8,
              padding: '0 16px 8px',
              fontSize: 12,
              color: 'var(--color-text-sub)',
              fontWeight: 600,
            }}>
              <span>상품</span>
              <span style={{ textAlign: 'right' }}>시스템</span>
              <span style={{ textAlign: 'center' }}>실물</span>
              <span style={{ textAlign: 'right' }}>오차</span>
              <span></span>
            </div>

            <div style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              {items.map((item, i) => {
                const diff = item.diff ?? ((item.actual_qty ?? 0) - (item.system_qty ?? 0))
                const hasDiff = diff !== 0 && item.actual_qty != null
                const canAdjust = hasDiff && !item.adjusted && !isDone

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 64px 90px 56px 56px',
                      gap: 8,
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    {/* 상품명 + 단위 */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                        {item.products?.name ?? '-'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
                        {item.products?.unit ?? ''}
                      </div>
                    </div>

                    {/* 시스템 수량 */}
                    <div style={{ textAlign: 'right', fontSize: 14, color: 'var(--color-text-sub)' }}>
                      {(item.system_qty ?? 0).toLocaleString()}
                    </div>

                    {/* 실물 수량 입력 */}
                    <input
                      type="number"
                      min={0}
                      defaultValue={item.actual_qty ?? ''}
                      disabled={isDone}
                      onBlur={e => {
                        const val = Number(e.target.value)
                        if (e.target.value !== '' && val !== item.actual_qty) {
                          updateActualQty(item.id, val)
                        }
                      }}
                      placeholder="-"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        fontSize: 14,
                        fontWeight: 600,
                        textAlign: 'right',
                        background: isDone ? 'var(--color-bg)' : 'var(--color-white)',
                        color: 'var(--color-text)',
                        outline: 'none',
                      }}
                    />

                    {/* 오차 */}
                    <div style={{
                      textAlign: 'right',
                      fontSize: 14,
                      fontWeight: 700,
                      color: item.actual_qty == null
                        ? 'var(--color-text-sub)'
                        : diff > 0
                          ? 'var(--color-in)'
                          : diff < 0
                            ? 'var(--color-out)'
                            : 'var(--color-text-sub)',
                    }}>
                      {item.actual_qty == null
                        ? '-'
                        : diff > 0
                          ? `+${diff.toLocaleString()}`
                          : diff.toLocaleString()}
                    </div>

                    {/* 조정 버튼 */}
                    <div style={{ textAlign: 'right' }}>
                      {item.adjusted ? (
                        <span style={{ fontSize: 11, color: 'var(--color-in)', fontWeight: 600 }}>조정완료</span>
                      ) : canAdjust ? (
                        <button
                          onClick={() => handleAdjust(item)}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 8px',
                            background: 'var(--color-primary)',
                            color: 'var(--color-white)',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                          }}
                        >
                          조정
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 하단 완료 버튼 */}
      {!isDone && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-white)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 20px',
          zIndex: 20,
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <button
              onClick={handleFinish}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--color-in)',
                color: 'var(--color-white)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              실사 완료
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
