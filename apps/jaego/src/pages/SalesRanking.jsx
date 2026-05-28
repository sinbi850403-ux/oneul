import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const MOBILE_TABS = [
  { label: '홈',    path: '/' },
  { label: '입고',  path: '/stock-in' },
  { label: '출고',  path: '/stock-out' },
  { label: '재고',  path: '/stock-status' },
  { label: '설정',  path: '/settings' },
]

function won(n) { return '₩ ' + Math.abs(n ?? 0).toLocaleString('ko-KR') }
function pad(n)  { return String(n).padStart(2, '0') }

export default function SalesRanking() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isMobile  = useIsMobile()
  const now       = new Date()

  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [tab,     setTab]     = useState('revenue')   // 'revenue' | 'qty'
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchRanking() }, [year, month])

  async function fetchRanking() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const start  = `${year}-${pad(month)}-01`
    const endDay = new Date(year, month, 0).getDate()
    const end    = `${year}-${pad(month)}-${pad(endDay)}`

    const { data } = await supabase
      .from('sales_items')
      .select('product_name, quantity, total_amount')
      .eq('user_id', user.id)
      .gte('sale_date', start)
      .lte('sale_date', end)

    // JS에서 집계
    const map = {}
    for (const r of data ?? []) {
      const key = r.product_name || '알 수 없음'
      if (!map[key]) map[key] = { name: key, revenue: 0, qty: 0 }
      map[key].revenue += r.total_amount ?? 0
      map[key].qty     += r.quantity     ?? 0
    }
    const list = Object.values(map).sort((a, b) => b.revenue - a.revenue)
    setRanking(list)
    setLoading(false)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const sorted  = [...ranking].sort((a, b) => tab === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty)
  const maxVal  = sorted[0] ? (tab === 'revenue' ? sorted[0].revenue : sorted[0].qty) : 1
  const total   = sorted.reduce((a, r) => a + (tab === 'revenue' ? r.revenue : r.qty), 0)

  const MEDAL = ['🥇', '🥈', '🥉']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: isMobile ? 72 : 0 }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '14px 20px' : '0 32px',
        height: isMobile ? 'auto' : 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-sub)', padding: 0 }}>
            ←
          </button>
          <div>
            <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginLeft: 8 }}>매출 순위</span>
          </div>
        </div>
        {/* 월 선택 */}
        <select
          value={`${year}-${month}`}
          onChange={e => {
            const [y, m] = e.target.value.split('-').map(Number)
            setYear(y); setMonth(m)
          }}
          style={{
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            padding: '6px 10px', fontSize: 13, fontWeight: 600,
            color: 'var(--color-primary)', background: 'var(--color-white)', outline: 'none',
          }}
        >
          {[now.getFullYear(), now.getFullYear() - 1].flatMap(y =>
            months.map(m => (
              <option key={`${y}-${m}`} value={`${y}-${m}`}>
                {y}년 {m}월
              </option>
            ))
          )}
        </select>
      </header>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '20px 16px' : '28px 24px' }}>

        {/* 탭 */}
        <div style={{
          display: 'flex', background: '#F3F4F6', borderRadius: 16,
          padding: 4, marginBottom: 20, gap: 4,
        }}>
          {[['revenue', '매출 순위'], ['qty', '수량 순위']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 13,
                fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: tab === key ? 'var(--color-white)' : 'transparent',
                color: tab === key ? 'var(--color-primary)' : 'var(--color-text-sub)',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '60px 0', fontSize: 14 }}>
            불러오는 중...
          </p>
        ) : sorted.length === 0 ? (
          <div style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', padding: '60px 24px',
            textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
          }}>
            이 달에 출고 기록이 없어요
          </div>
        ) : (
          <>
            {/* 요약 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 12, marginBottom: 20,
            }}>
              <div style={{
                background: 'var(--color-white)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>총 매출</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                  {won(sorted.reduce((a, r) => a + r.revenue, 0))}
                </div>
              </div>
              <div style={{
                background: 'var(--color-white)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 4 }}>총 판매 수량</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>
                  {sorted.reduce((a, r) => a + r.qty, 0).toLocaleString()}개
                </div>
              </div>
            </div>

            {/* 순위 목록 */}
            <div style={{
              background: 'var(--color-white)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              {sorted.map((item, i) => {
                const val    = tab === 'revenue' ? item.revenue : item.qty
                const pct    = Math.round((val / maxVal) * 100)
                const share  = total > 0 ? Math.round((val / total) * 100) : 0
                return (
                  <div key={item.name} style={{
                    padding: '14px 20px',
                    borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 16, width: 28, flexShrink: 0, textAlign: 'center' }}>
                        {i < 3 ? MEDAL[i] : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-sub)' }}>{i + 1}</span>}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                        {item.name}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>
                          {tab === 'revenue' ? won(item.revenue) : `${item.qty.toLocaleString()}개`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginTop: 1 }}>
                          {tab === 'revenue'
                            ? `수량 ${item.qty.toLocaleString()}개`
                            : won(item.revenue)}
                          {' · '}{share}%
                        </div>
                      </div>
                    </div>
                    {/* 바 */}
                    <div style={{
                      marginLeft: 38, height: 6,
                      background: '#F3F4F6', borderRadius: 3, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        width: `${pct}%`,
                        background: i === 0 ? 'var(--color-primary)' : i === 1 ? '#FB923C' : i === 2 ? '#FCD34D' : '#CBD5E1',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 하단 탭바 (모바일) */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--color-white)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', height: 58, zIndex: 100,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}>
          {MOBILE_TABS.map(({ label, path }) => {
            const isActive = location.pathname === path
            return (
              <button key={path} onClick={() => navigate(path)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: isActive ? 'var(--color-primary)' : '#9CA3AF',
                }}
              >
                {isActive && (
                  <div style={{ width: 20, height: 3, borderRadius: 2, background: 'var(--color-primary)', marginBottom: 4 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>{label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
