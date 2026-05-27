import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

const CATS = [
  { value: '',        label: '전체',    color: '#6B7280', bg: '#F9FAFB' },
  { value: 'bug',     label: '버그신고', color: '#DC2626', bg: '#FEF2F2' },
  { value: 'feature', label: '기능요청', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'free',    label: '자유',    color: '#059669', bg: '#ECFDF5' },
]

const MOBILE_TABS = [
  { label: '홈',    path: '/' },
  { label: '입고',  path: '/stock-in' },
  { label: '출고',  path: '/stock-out' },
  { label: '재고',  path: '/stock-status' },
  { label: '설정',  path: '/settings' },
]

function timeSince(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}일 전`
  return `${Math.floor(d / 7)}주 전`
}

export default function Board() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const [posts,      setPosts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [cat,        setCat]        = useState('')
  const [expanded,   setExpanded]   = useState(null)
  const [userId,     setUserId]     = useState(null)
  const [showWrite,  setShowWrite]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form,       setForm]       = useState({ category: 'free', title: '', content: '', nickname: '' })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles').select('shop_name').eq('user_id', user.id).maybeSingle()
      const name = profile?.shop_name || '익명'
      setForm(f => ({ ...f, nickname: name }))
    }
    init()
  }, [])

  useEffect(() => { fetchPosts() }, [cat])

  async function fetchPosts() {
    setLoading(true)
    let q = supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (cat) q = q.eq('category', cat)
    const { data } = await q
    setPosts(data ?? [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) return
    setSubmitting(true)
    await supabase.from('board_posts').insert({
      user_id:  userId,
      category: form.category,
      title:    form.title.trim(),
      content:  form.content.trim(),
      nickname: form.nickname.trim() || '익명',
    })
    setForm(f => ({ ...f, title: '', content: '' }))
    setShowWrite(false)
    setSubmitting(false)
    fetchPosts()
  }

  async function handleDelete(id) {
    if (!window.confirm('이 글을 삭제할까요?')) return
    await supabase.from('board_posts').delete().eq('id', id)
    setPosts(p => p.filter(x => x.id !== id))
    setExpanded(null)
  }

  const catInfo = (val) => CATS.find(c => c.value === val) ?? CATS[3]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: isMobile ? 72 : 0 }}>

      {/* ── 헤더 ── */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '14px 20px' : '0 32px',
        height: isMobile ? 'auto' : 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--color-text-sub)', lineHeight: 1, padding: 0,
            }}
          >
            ←
          </button>
          <div>
            <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: 'var(--color-primary)' }}>
              오늘재고
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginLeft: 8 }}>
              게시판
            </span>
          </div>
        </div>
        {userId && (
          <button
            onClick={() => setShowWrite(true)}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius)', padding: '8px 18px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            글쓰기
          </button>
        )}
      </header>

      {/* ── 본문 ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '20px 16px' : '28px 24px' }}>

        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 18, lineHeight: 1.6 }}>
          불편한 점, 버그 신고, 원하는 기능을 자유롭게 남겨주세요.
          직접 확인하고 반영할게요!
        </p>

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c.value} onClick={() => setCat(c.value)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                border: cat === c.value ? `2px solid ${c.color}` : '2px solid transparent',
                background: cat === c.value ? c.bg : 'var(--color-white)',
                color: cat === c.value ? c.color : 'var(--color-text-sub)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '60px 0', fontSize: 14 }}>
            불러오는 중...
          </p>
        ) : posts.length === 0 ? (
          <div style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', padding: '60px 24px',
            textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
          }}>
            아직 글이 없어요. 첫 번째 글을 남겨주세요!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {posts.map(post => {
              const ci     = catInfo(post.category)
              const isOpen = expanded === post.id
              const isOwn  = post.user_id === userId
              return (
                <div key={post.id} style={{
                  background: 'var(--color-white)',
                  border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}>
                  {/* 목록 행 */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : post.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '14px 16px', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--color-bg)' }}
                    onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 4, color: ci.color, background: ci.bg,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {ci.label}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 14, fontWeight: 600,
                      color: 'var(--color-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {post.title}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-sub)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {post.nickname}
                    </span>
                    <span style={{ fontSize: 11, color: '#CBD5E1', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {timeSince(post.created_at)}
                    </span>
                  </div>

                  {/* 본문 (펼침) */}
                  {isOpen && (
                    <div style={{
                      padding: '12px 16px 16px',
                      borderTop: '1px solid var(--color-border)',
                      background: '#FAFBFC',
                    }}>
                      <p style={{
                        fontSize: 14, color: 'var(--color-text)', lineHeight: 1.75,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                      }}>
                        {post.content}
                      </p>
                      {isOwn && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                          style={{
                            marginTop: 12, fontSize: 12, color: '#EF4444',
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 글쓰기 모달 ── */}
      {showWrite && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}
          onClick={() => setShowWrite(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 'var(--radius-lg)',
              padding: '28px 24px', width: '100%', maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: 'var(--color-text)' }}>
              글 작성
            </h3>

            {/* 카테고리 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>
                카테고리
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATS.slice(1).map(c => (
                  <button key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    style={{
                      padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                      background: form.category === c.value ? c.bg : '#F3F4F6',
                      color: form.category === c.value ? c.color : 'var(--color-text-sub)',
                      outline: form.category === c.value ? `2px solid ${c.color}` : '2px solid transparent',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 닉네임 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>
                닉네임
              </label>
              <input
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="예) 홍길동 마트"
                style={{
                  width: '100%', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', padding: '10px 14px',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 제목 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>
                제목
              </label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="간단하게 적어주세요"
                style={{
                  width: '100%', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', padding: '10px 14px',
                  fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 내용 */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 6 }}>
                내용
              </label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="자세히 적어주시면 빠르게 처리할게요"
                rows={5}
                style={{
                  width: '100%', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', padding: '10px 14px',
                  fontSize: 14, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowWrite(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                style={{
                  flex: 2, padding: '12px', borderRadius: 'var(--radius)',
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  opacity: (submitting || !form.title.trim() || !form.content.trim()) ? 0.5 : 1,
                }}
              >
                {submitting ? '올리는 중...' : '올리기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 하단 탭바 (모바일) ── */}
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
      )}
    </div>
  )
}
