import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useStockLog } from '../hooks/useStock'
import { useAllProducts } from '../hooks/useProducts'
import { useIsMobile } from '../hooks/useIsMobile'

const ACTIONS = [
  { label: '입고', icon: '📦', path: '/stock-in',  color: 'var(--color-in)',     bg: 'var(--color-in-light)' },
  { label: '출고', icon: '🚚', path: '/stock-out', color: 'var(--color-out)',    bg: 'var(--color-out-light)' },
  { label: '반품', icon: '↩️', path: '/return',    color: 'var(--color-return)', bg: 'var(--color-return-light)' },
]

const SIDEBAR_ITEMS = [
  { label: '입고',    icon: '📦', path: '/stock-in' },
  { label: '출고',    icon: '🚚', path: '/stock-out' },
  { label: '반품',    icon: '↩️', path: '/return' },
  { label: '재고실사', icon: '📋', path: '/stocktake' },
  { label: '상품관리', icon: '📦', path: '/products' },
]

const TYPE_LABEL = { in: '입고', out: '출고', return: '반품' }
const TYPE_COLOR = { in: 'var(--color-in)', out: 'var(--color-out)', return: 'var(--color-return)' }
const TYPE_BG    = { in: 'var(--color-in-light)', out: 'var(--color-out-light)', return: 'var(--color-return-light)' }

function formatTime(iso) {
  const d = new Date(iso)
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const dd  = String(d.getDate()).padStart(2, '0')
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

function isToday(iso) {
  const d   = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate()  === now.getDate()
}

function isThisMonth(iso) {
  const d   = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/* ───────────────────── Mobile ───────────────────── */
function MobileHome({ user, signOut, logs, loading }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: 40 }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['상품관리', '/products'], ['재고실사', '/stocktake']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)}
              style={{ fontSize: 13, color: 'var(--color-text-sub)', padding: '4px 8px' }}>
              {label}
            </button>
          ))}
          <button onClick={signOut}
            style={{ fontSize: 13, color: 'var(--color-text-sub)', padding: '4px 8px' }}>
            로그아웃
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-sub)', marginBottom: 20 }}>
          안녕하세요 👋 오늘도 꼼꼼하게 기록해요
        </p>

        {/* 빠른 액션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {ACTIONS.map(({ label, icon, path, color, bg }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{
                background: bg, border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '20px 12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{label}</span>
            </button>
          ))}
        </div>

        {/* 최근 이력 */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>최근 이력</h2>
        <LogList logs={logs} loading={loading} />
      </div>
    </div>
  )
}

/* ───────────────────── PC ───────────────────── */
function PCHome({ user, signOut, logs, loading, products }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const totalCount    = logs.length
  const todayCount    = logs.filter(l => isToday(l.created_at)).length
  const monthCount    = logs.filter(l => isThisMonth(l.created_at)).length
  const productCount  = products.length

  const SUMMARY_CARDS = [
    { label: '전체 이력', value: totalCount,   unit: '건' },
    { label: '오늘 이력', value: todayCount,   unit: '건' },
    { label: '이번달 이력', value: monthCount, unit: '건' },
    { label: '등록 상품', value: productCount, unit: '개' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
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
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['상품관리', '/products'], ['재고실사', '/stocktake']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)}
              style={{
                fontSize: 13, color: 'var(--color-text-sub)', padding: '6px 14px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                background: 'var(--color-white)', cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
          <button onClick={signOut}
            style={{
              fontSize: 13, color: 'var(--color-text-sub)', padding: '6px 14px',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
              background: 'var(--color-white)', cursor: 'pointer',
            }}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 바디 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 사이드바 */}
        <aside style={{
          width: 220,
          background: 'var(--color-white)',
          borderRight: '1px solid var(--color-border)',
          padding: '24px 0',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {SIDEBAR_ITEMS.map(({ label, icon, path }, i) => {
            const isActive = location.pathname === path
            const isDivider = i === 2 // 반품 다음에 구분선
            return (
              <div key={path}>
                {isDivider && (
                  <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 16px' }} />
                )}
                <button
                  onClick={() => navigate(path)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 0,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {label}
                </button>
              </div>
            )
          })}
        </aside>

        {/* 메인 */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
            {SUMMARY_CARDS.map(({ label, value, unit }) => (
              <div key={label} style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)' }}>
                  {value.toLocaleString()}
                  <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 이력 테이블 */}
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>전체 이력</span>
            </div>
            {loading ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>
                불러오는 중...
              </p>
            ) : logs.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>
                아직 기록이 없어요. 입고·출고 버튼으로 시작해보세요!
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                    {['일시', '유형', '상품명', '수량', '메모'].map(col => (
                      <th key={col} style={{
                        padding: '10px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--color-text-sub)', borderBottom: '1px solid var(--color-border)',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id}
                      style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>
                        {formatTime(log.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: TYPE_COLOR[log.type],
                          background: TYPE_BG[log.type],
                          padding: '2px 8px', borderRadius: 4,
                        }}>
                          {TYPE_LABEL[log.type]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        {log.products?.name ?? '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: TYPE_COLOR[log.type] }}>
                        {log.type === 'out' ? '-' : '+'}{log.quantity?.toLocaleString()}{log.products?.unit ?? ''}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>
                        {log.note ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ───────────────────── 공통 LogList (mobile) ───────────────────── */
function LogList({ logs, loading }) {
  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-sub)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
        불러오는 중...
      </p>
    )
  }
  if (logs.length === 0) {
    return (
      <div style={{
        background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)', padding: '32px',
        textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
      }}>
        아직 기록이 없어요.<br />입고·출고 버튼으로 시작해보세요!
      </div>
    )
  }
  return (
    <div style={{
      background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)', overflow: 'hidden',
    }}>
      {logs.map((log, i) => (
        <div key={log.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: TYPE_COLOR[log.type],
              background: TYPE_BG[log.type],
              padding: '2px 7px', borderRadius: 4,
              minWidth: 32, textAlign: 'center',
            }}>
              {TYPE_LABEL[log.type]}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{log.products?.name ?? '-'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TYPE_COLOR[log.type] }}>
              {log.type === 'out' ? '-' : '+'}{log.quantity?.toLocaleString()}{log.products?.unit ?? ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginTop: 2 }}>
              {formatTime(log.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────────────────── Root ───────────────────── */
export default function Home() {
  const { user, signOut } = useAuth()
  const { logs, loading, fetchLogs } = useStockLog()
  const { products } = useAllProducts()
  const isMobile = useIsMobile()

  useEffect(() => { fetchLogs() }, [])

  return isMobile
    ? <MobileHome user={user} signOut={signOut} logs={logs} loading={loading} />
    : <PCHome user={user} signOut={signOut} logs={logs} loading={loading} products={products} />
}
