import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { useSuppliers } from '../hooks/useSuppliers'
import { useIsMobile } from '../hooks/useIsMobile'
import { ORDER_STATUS_LABEL } from '../lib/constants'

const STATUS_COLOR = { pending: '#2563EB', completed: '#059669', cancelled: '#9CA3AF' }
const STATUS_BG    = { pending: '#EFF6FF', completed: '#ECFDF5', cancelled: '#F9FAFB' }

function fmt(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

export default function Orders() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { orders, loading, createOrder } = useOrders()
  const { suppliers } = useSuppliers()

  async function handleCreate() {
    const order = await createOrder()
    if (order) navigate(`/orders/${order.id}`)
  }

  const pending   = orders.filter(o => o.status === 'pending')
  const completed = orders.filter(o => o.status !== 'pending')

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMobile && (
            <button onClick={() => navigate(-1)}
              style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}>←</button>
          )}
          <span style={{ fontWeight: 700, fontSize: 18 }}>발주 관리</span>
        </div>
        <button onClick={handleCreate} style={{
          background: 'var(--color-primary)', color: 'var(--color-white)',
          padding: '7px 18px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14,
          border: 'none', cursor: 'pointer',
        }}>+ 새 발주</button>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 800, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '28px 32px 48px',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px 0', fontSize: 14 }}>불러오는 중...</p>
        ) : orders.length === 0 ? (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '48px 24px',
            textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
          }}>
            발주 내역이 없어요.<br />새 발주 버튼으로 시작해보세요.
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 10 }}>진행중 ({pending.length})</p>
                <OrderList orders={pending} navigate={navigate} />
                <div style={{ marginBottom: 24 }} />
              </>
            )}
            {completed.length > 0 && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-sub)', marginBottom: 10 }}>완료 / 취소</p>
                <OrderList orders={completed} navigate={navigate} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OrderList({ orders, navigate }) {
  return (
    <div style={{
      background: 'var(--color-white)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      {orders.map((o, i) => (
        <div key={o.id}
          onClick={() => navigate(`/orders/${o.id}`)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: i < orders.length - 1 ? '1px solid var(--color-border)' : 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {o.suppliers?.name ?? '거래처 미지정'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 2 }}>
              {fmt(o.created_at)}
              {o.note && <span style={{ marginLeft: 8 }}>· {o.note}</span>}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: STATUS_COLOR[o.status],
            background: STATUS_BG[o.status],
            padding: '3px 10px', borderRadius: 4,
            flexShrink: 0,
          }}>
            {ORDER_STATUS_LABEL[o.status]}
          </span>
        </div>
      ))}
    </div>
  )
}
