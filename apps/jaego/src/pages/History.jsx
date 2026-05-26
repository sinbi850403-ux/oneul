import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStockLogFiltered } from '../hooks/useStock'
import { exportLogsToExcel } from '../lib/excel'
import { useIsMobile } from '../hooks/useIsMobile'

const TYPE_LABEL = { in: '입고', out: '출고', return: '반품' }
const TYPE_COLOR = { in: 'var(--color-in)', out: 'var(--color-out)', return: 'var(--color-return)' }
const TYPE_BG    = { in: 'var(--color-in-light)', out: 'var(--color-out-light)', return: 'var(--color-return-light)' }

function fmt(iso) {
  const d = new Date(iso)
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function History() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { logs, loading, fetchFiltered } = useStockLogFiltered()

  const today = new Date().toISOString().slice(0, 10)
  const [type,     setType]     = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [keyword,  setKeyword]  = useState('')

  useEffect(() => { fetchFiltered({ type, dateFrom, dateTo }) }, [type, dateFrom, dateTo])

  const filtered = keyword
    ? logs.filter(l => l.products?.name?.toLowerCase().includes(keyword.toLowerCase()))
    : logs

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)}
            style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8, background: 'none', border: 'none', cursor: 'pointer' }}>
            ←
          </button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>전체 이력</span>
        </div>
        <button onClick={() => exportLogsToExcel(filtered)} style={{
          padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--color-border)', background: 'var(--color-white)',
          color: 'var(--color-primary)', cursor: 'pointer',
        }}>엑셀 다운로드</button>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 1100, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '24px 32px 48px',
      }}>
        {/* 필터 바 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: 16,
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {/* 유형 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['', '전체'], ['in', '입고'], ['out', '출고'], ['return', '반품']].map(([v, l]) => (
              <button key={v} onClick={() => setType(v)} style={{
                padding: '7px 13px', borderRadius: 'var(--radius)', fontSize: 13,
                fontWeight: type === v ? 700 : 500,
                border: '1px solid var(--color-border)',
                background: type === v ? 'var(--color-primary)' : 'var(--color-white)',
                color: type === v ? 'var(--color-white)' : 'var(--color-text-sub)',
                cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

          {/* 날짜 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={dateFrom} max={dateTo || today}
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none' }} />
            <span style={{ color: 'var(--color-text-sub)', fontSize: 13 }}>~</span>
            <input type="date" value={dateTo} min={dateFrom} max={today}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} style={{
                fontSize: 12, color: 'var(--color-text-sub)', background: 'none',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                padding: '6px 10px', cursor: 'pointer',
              }}>초기화</button>
            )}
          </div>

          <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

          {/* 상품명 */}
          <input type="text" placeholder="상품명 검색..." value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{
              padding: '7px 12px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', minWidth: 140,
            }} />
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 12 }}>
          <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong>건
        </div>

        {/* 테이블 / 리스트 */}
        <div style={{
          background: 'var(--color-white)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          {loading ? (
            <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14 }}>이력이 없습니다.</p>
          ) : isMobile ? (
            filtered.map((l, i) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: TYPE_COLOR[l.type],
                    background: TYPE_BG[l.type], padding: '2px 7px', borderRadius: 4,
                  }}>{TYPE_LABEL[l.type]}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{l.products?.name ?? '-'}</div>
                    {l.note && <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{l.note}</div>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TYPE_COLOR[l.type] }}>
                    {l.type === 'out' ? '-' : '+'}{l.quantity?.toLocaleString()}{l.products?.unit ?? ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>{fmt(l.created_at)}</div>
                </div>
              </div>
            ))
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', textAlign: 'left' }}>
                  {['일시', '유형', '상품명', '수량', '메모'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px', fontSize: 12, fontWeight: 600,
                      color: 'var(--color-text-sub)', borderBottom: '1px solid var(--color-border)',
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: TYPE_COLOR[l.type],
                        background: TYPE_BG[l.type], padding: '2px 8px', borderRadius: 4,
                      }}>{TYPE_LABEL[l.type]}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{l.products?.name ?? '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: TYPE_COLOR[l.type] }}>
                      {l.type === 'out' ? '-' : '+'}{l.quantity?.toLocaleString()}{l.products?.unit ?? ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-sub)' }}>{l.note ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
