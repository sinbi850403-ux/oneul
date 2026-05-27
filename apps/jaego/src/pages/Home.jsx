import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useStockLog } from '../hooks/useStock'
import { useAllProducts } from '../hooks/useProducts'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'

const ACTIONS = [
  { label: '입고', path: '/stock-in',  color: 'var(--color-in)',     bg: 'var(--color-in-light)' },
  { label: '출고', path: '/stock-out', color: 'var(--color-out)',    bg: 'var(--color-out-light)' },
  { label: '반품', path: '/return',    color: 'var(--color-return)', bg: 'var(--color-return-light)' },
]

const SIDEBAR_ITEMS = [
  { label: '입고',     path: '/stock-in' },
  { label: '출고',     path: '/stock-out' },
  { label: '반품',     path: '/return' },
  { divider: true },
  { label: '재고 현황', path: '/stock-status' },
  { label: '재고실사',  path: '/stocktake' },
  { divider: true },
  { label: '전체 이력', path: '/history' },
  { label: '상품관리',  path: '/products' },
  { label: '거래처',   path: '/suppliers' },
  { label: '발주 관리', path: '/orders' },
  { divider: true },
  { label: '게시판',    path: '/board' },
  { label: '설정',      path: '/settings' },
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

const MOBILE_TABS = [
  { label: '홈',    path: '/' },
  { label: '입고',  path: '/stock-in' },
  { label: '출고',  path: '/stock-out' },
  { label: '재고',  path: '/stock-status' },
  { label: '설정',  path: '/settings' },
]

/* ───────────────────── Mobile ───────────────────── */
function MobileHome({ user, signOut, logs, loading, lowStock = [], shopName = '', monthProfit = null, monthlyTarget = 0, monthSales = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()
  const now = new Date()
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = daysInMonth - now.getDate() + 1
  const targetProgress = monthlyTarget > 0 ? Math.min(Math.round((monthSales / monthlyTarget) * 100), 100) : 0
  const requiredDaily  = monthlyTarget > monthSales && remainingDays > 0
    ? Math.ceil((monthlyTarget - monthSales) / remainingDays)
    : 0
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: 72 }}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</span>
          {shopName && (
            <span style={{ fontSize: 13, color: 'var(--color-text-sub)', marginLeft: 8, fontWeight: 500 }}>
              {shopName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['이력', '/history'], ['상품', '/products'], ['실사', '/stocktake'], ['게시판', '/board']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)}
              style={{
                fontSize: 12, color: 'var(--color-text-sub)', padding: '5px 10px',
                border: '1px solid var(--color-border)', borderRadius: 8,
                background: 'var(--color-white)', cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-sub)', marginBottom: 20 }}>
          안녕하세요, 오늘도 꼼꼼하게 기록해요
        </p>

        {/* 이번달 순이익 카드 */}
        {monthProfit !== null && (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 6 }}>이번달 순이익</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: monthProfit >= 0 ? '#16A34A' : '#EF4444' }}>
              {monthProfit >= 0 ? '+' : ''}₩ {Math.abs(monthProfit).toLocaleString()}
            </div>
            {monthSales > 0 && (
              <div style={{ fontSize: 12, marginTop: 5, color: 'var(--color-text-sub)' }}>
                마진율 {Math.round((monthProfit / monthSales) * 100)}%
              </div>
            )}
          </div>
        )}

        {/* 월 매출 목표 */}
        {monthlyTarget > 0 && (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>이달 매출 목표</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
                {monthSales >= 10000 ? `${Math.round(monthSales / 10000)}만` : monthSales.toLocaleString()}원
                {' / '}
                {monthlyTarget >= 10000 ? `${Math.round(monthlyTarget / 10000)}만` : monthlyTarget.toLocaleString()}원
              </span>
            </div>
            <div style={{
              width: '100%', height: 8, background: '#F3F4F6',
              borderRadius: 4, overflow: 'hidden', marginBottom: 6,
            }}>
              <div style={{
                height: 8, borderRadius: 4,
                width: `${targetProgress}%`,
                background: targetProgress >= 100 ? '#16A34A' : 'var(--color-primary)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{targetProgress}% 달성</span>
              <span style={{ color: 'var(--color-text-sub)' }}>
                {monthSales >= monthlyTarget
                  ? '목표 달성!'
                  : `남은 ${remainingDays}일 · 하루 ${requiredDaily >= 10000 ? `${Math.round(requiredDaily / 10000)}만` : requiredDaily.toLocaleString()}원`}
              </span>
            </div>
          </div>
        )}

        {/* 재고 부족 알림 */}
        {lowStock.length > 0 && (
          <div
            onClick={() => navigate('/stock-status')}
            style={{
              background: '#FFFBEB', border: '1px solid #F59E0B',
              borderRadius: 'var(--radius-lg)', padding: '12px 16px',
              marginBottom: 20, cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
              ⚠️ 안전재고 부족 {lowStock.length}개
            </div>
            <div style={{ fontSize: 12, color: '#B45309' }}>
              {lowStock.slice(0, 3).map(p => p.name).join(', ')}
              {lowStock.length > 3 && ` 외 ${lowStock.length - 3}개`}
            </div>
          </div>
        )}

        {/* 빠른 액션 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {ACTIONS.map(({ label, path, color, bg }) => (
            <button key={path} onClick={() => navigate(path)}
              style={{
                background: bg, border: 'none', borderRadius: 'var(--radius-lg)',
                padding: '20px 12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{label}</span>
            </button>
          ))}
        </div>

        {/* 최근 이력 */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>최근 이력</h2>
        <LogList logs={logs} loading={loading} />
      </div>

      {/* 하단 탭바 */}
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
                transition: 'color 0.15s',
              }}
            >
              {isActive && (
                <div style={{
                  width: 20, height: 3, borderRadius: 2,
                  background: 'var(--color-primary)', marginBottom: 4,
                }} />
              )}
              <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ───────────────────── PC ───────────────────── */
function PCHome({ user, signOut, logs, loading, products, lowStock = [], shopName = '', monthProfit = null, monthlyTarget = 0, monthSales = 0 }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const todayCount   = logs.filter(l => isToday(l.created_at)).length
  const monthCount   = logs.filter(l => isThisMonth(l.created_at)).length
  const productCount = products.length

  const now = new Date()
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = daysInMonth - now.getDate() + 1
  const targetProgress = monthlyTarget > 0 ? Math.min(Math.round((monthSales / monthlyTarget) * 100), 100) : 0
  const requiredDaily  = monthlyTarget > monthSales && remainingDays > 0
    ? Math.ceil((monthlyTarget - monthSales) / remainingDays)
    : 0

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
          {[['상품관리', '/products'], ['재고실사', '/stocktake'], ['거래처', '/suppliers'], ['발주', '/orders']].map(([label, path]) => (
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
          {/* 상호명 */}
          <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>오늘재고</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 2 }}>
              {shopName || '내 가게'}
            </div>
          </div>
          {SIDEBAR_ITEMS.map((item, i) => {
            if (item.divider) return (
              <div key={`divider-${i}`} style={{ height: 1, background: 'var(--color-border)', margin: '8px 16px' }} />
            )
            const { label, path } = item
            const isActive = location.pathname === path
            return (
              <button
                key={path}
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
                {label}
              </button>
            )
          })}
        </aside>

        {/* 메인 */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* 재고 부족 알림 */}
          {lowStock.length > 0 && (
            <div
              onClick={() => navigate('/stock-status')}
              style={{
                background: '#FFFBEB', border: '1px solid #F59E0B',
                borderRadius: 'var(--radius-lg)', padding: '12px 20px',
                marginBottom: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>
                  안전재고 부족 {lowStock.length}개
                </span>
                <span style={{ fontSize: 13, color: '#B45309', marginLeft: 12 }}>
                  {lowStock.slice(0, 5).map(p => p.name).join(', ')}
                  {lowStock.length > 5 && ` 외 ${lowStock.length - 5}개`}
                </span>
              </div>
              <span style={{ fontSize: 13, color: '#B45309', fontWeight: 600 }}>재고 현황</span>
            </div>
          )}

          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: '오늘 이력',    value: todayCount,   unit: '건',  color: 'var(--color-text)' },
              { label: '이번달 이력',  value: monthCount,   unit: '건',  color: 'var(--color-text)' },
              { label: '등록 상품',    value: productCount, unit: '개',  color: 'var(--color-text)' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
              }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>
                  {value.toLocaleString()}
                  <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 4 }}>{unit}</span>
                </div>
              </div>
            ))}
            {/* 이번달 순이익 (장부 연동) */}
            <div style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 8 }}>이번달 순이익</div>
              {monthProfit === null ? (
                <div style={{ fontSize: 14, color: 'var(--color-text-sub)' }}>불러오는 중...</div>
              ) : (
                <>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    color: monthProfit >= 0 ? '#16A34A' : '#EF4444',
                  }}>
                    {monthProfit >= 0 ? '+' : ''}₩ {Math.abs(monthProfit).toLocaleString()}
                  </div>
                  {monthSales > 0 && (
                    <div style={{ fontSize: 12, marginTop: 6, color: 'var(--color-text-sub)' }}>
                      마진율 {Math.round((monthProfit / monthSales) * 100)}%
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 월 매출 목표 */}
          {monthlyTarget > 0 && (
            <div style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>이달 매출 목표</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
                  {monthSales >= 10000 ? `${Math.round(monthSales / 10000)}만` : monthSales.toLocaleString()}원
                  {' / '}
                  {monthlyTarget >= 10000 ? `${Math.round(monthlyTarget / 10000)}만` : monthlyTarget.toLocaleString()}원
                </span>
              </div>
              <div style={{
                width: '100%', height: 10, background: '#F3F4F6',
                borderRadius: 5, overflow: 'hidden', marginBottom: 8,
              }}>
                <div style={{
                  height: 10, borderRadius: 5,
                  width: `${targetProgress}%`,
                  background: targetProgress >= 100 ? '#16A34A' : 'var(--color-primary)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{targetProgress}% 달성</span>
                <span style={{ color: 'var(--color-text-sub)' }}>
                  {monthSales >= monthlyTarget
                    ? '목표 달성!'
                    : `남은 ${remainingDays}일 · 하루 ${requiredDaily >= 10000 ? `${Math.round(requiredDaily / 10000)}만` : requiredDaily.toLocaleString()}원 더`}
                </span>
              </div>
            </div>
          )}

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
  const navigate  = useNavigate()
  const [shopName, setShopName] = useState('')
  const [monthProfit, setMonthProfit] = useState(null)
  const [monthlyTarget, setMonthlyTarget] = useState(0)
  const [monthSales, setMonthSales] = useState(0)

  const lowStockProducts = products.filter(p =>
    (p.min_quantity ?? 0) > 0 && (p.stock?.[0]?.quantity ?? 0) <= p.min_quantity
  )

  useEffect(() => { fetchLogs() }, [])

  // 프로필 로드 + 온보딩 미완료 시 리다이렉트
  useEffect(() => {
    async function loadProfile() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data } = await supabase
        .from('profiles')
        .select('shop_name, onboarded, monthly_target')
        .eq('user_id', u.id)
        .maybeSingle()
      if (!data || !data.onboarded) {
        navigate('/onboarding', { replace: true })
        return
      }
      if (data.shop_name) setShopName(data.shop_name)
      setMonthlyTarget(data.monthly_target ?? 0)
    }
    loadProfile()
  }, [])

  // 이번달 순이익 (장부 데이터)
  useEffect(() => {
    async function loadProfit() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const now = new Date()
      const y = now.getFullYear(), m = now.getMonth() + 1
      const pad = n => String(n).padStart(2, '0')
      const start = `${y}-${pad(m)}-01`
      const end   = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`
      const [{ data: salesRows }, { data: purchaseRows }, { data: salesItemRows }] = await Promise.all([
        supabase.from('sales').select('total').eq('user_id', u.id).gte('sale_date', start).lte('sale_date', end),
        supabase.from('purchases').select('total_amount').eq('user_id', u.id).gte('purchase_date', start).lte('purchase_date', end),
        supabase.from('sales_items').select('total_amount').eq('user_id', u.id).gte('sale_date', start).lte('sale_date', end),
      ])
      const salesSum     = (salesRows     ?? []).reduce((a, r) => a + (r.total        ?? 0), 0)
      const purchaseSum  = (purchaseRows  ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0)
      const salesItemSum = (salesItemRows ?? []).reduce((a, r) => a + (r.total_amount ?? 0), 0)
      const totalSales   = salesSum + salesItemSum
      setMonthSales(totalSales)
      setMonthProfit(totalSales - purchaseSum)
    }
    loadProfit()
  }, [])

  return isMobile
    ? <MobileHome user={user} signOut={signOut} logs={logs} loading={loading} lowStock={lowStockProducts} shopName={shopName} monthProfit={monthProfit} monthlyTarget={monthlyTarget} monthSales={monthSales} />
    : <PCHome user={user} signOut={signOut} logs={logs} loading={loading} products={products} lowStock={lowStockProducts} shopName={shopName} monthProfit={monthProfit} monthlyTarget={monthlyTarget} monthSales={monthSales} />
}
