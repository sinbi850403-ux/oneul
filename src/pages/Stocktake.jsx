import { useNavigate } from 'react-router-dom'
import { useStocktakeList } from '../hooks/useStocktake'
import { STOCKTAKE_STATUS } from '../lib/constants'

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`
}

export default function Stocktake() {
  const navigate = useNavigate()
  const { list, loading, startStocktake } = useStocktakeList()

  async function handleStart() {
    try {
      const id = await startStocktake()
      navigate(`/stocktake/${id}`)
    } catch (err) {
      alert('실사 시작 중 오류가 발생했습니다.')
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
        <span style={{ fontWeight: 700, fontSize: 18 }}>재고실사</span>
        <div style={{ width: 40 }} />
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 40px' }}>
        {/* 새 실사 시작 버튼 */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '18px',
            background: 'var(--color-primary)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>📋</span>
          새 실사 시작
        </button>

        {/* 과거 실사 목록 */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
          실사 이력
        </h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '32px 0', fontSize: 14 }}>
            불러오는 중...
          </p>
        ) : list.length === 0 ? (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px',
            textAlign: 'center',
            color: 'var(--color-text-sub)',
            fontSize: 14,
          }}>
            아직 실사 이력이 없습니다.
          </div>
        ) : (
          <div style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {list.map((item, i) => {
              const isDone = item.status === STOCKTAKE_STATUS.DONE
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/stocktake/${item.id}`)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: i < list.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background: 'none',
                    border: 'none',
                    borderBottomWidth: i < list.length - 1 ? 1 : 0,
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>
                      {formatDate(item.started_at)}
                    </div>
                    {isDone && item.finished_at && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
                        완료: {formatDate(item.finished_at)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: isDone ? 'var(--color-in-light)' : '#FFFBEB',
                    color: isDone ? 'var(--color-in)' : 'var(--color-return)',
                  }}>
                    {isDone ? '완료' : '진행중'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
