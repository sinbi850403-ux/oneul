import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const CATS = [
  { value: '',        label: '전체',    color: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-300'  },
  { value: 'bug',     label: '버그신고', color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-400'   },
  { value: 'feature', label: '기능요청', color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-400'  },
  { value: 'free',    label: '자유',    color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-400' },
]

const CAT_BADGE = {
  bug:     'bg-red-50 text-red-600',
  feature: 'bg-blue-50 text-blue-600',
  free:    'bg-green-50 text-green-600',
}
const CAT_LABEL = { bug: '버그신고', feature: '기능요청', free: '자유' }

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

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">게시판</h2>
          <p className="text-sm text-gray-400 mt-0.5">불편한 점, 버그, 원하는 기능을 남겨주세요. 직접 확인하고 반영할게요!</p>
        </div>
        <button
          onClick={() => setShowWrite(true)}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          글쓰기
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap my-5">
        {CATS.map(c => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
              cat === c.value
                ? `${c.bg} ${c.color} ${c.border}`
                : 'bg-white text-gray-400 border-transparent shadow-sm hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">
          아직 글이 없어요. 첫 번째 글을 남겨주세요!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map(post => {
            const isOpen = expanded === post.id
            const isOwn  = post.user_id === userId
            const badge  = CAT_BADGE[post.category] ?? 'bg-gray-100 text-gray-500'
            const label  = CAT_LABEL[post.category] ?? '기타'
            return (
              <div
                key={post.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                  isOpen ? 'border-orange-400' : 'border-gray-100'
                }`}
              >
                {/* 목록 행 */}
                <div
                  onClick={() => setExpanded(isOpen ? null : post.id)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${badge}`}>
                    {label}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                    {post.title}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{post.nickname}</span>
                  <span className="text-xs text-gray-300 shrink-0">{timeSince(post.created_at)}</span>
                </div>

                {/* 본문 (펼침) */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                    {isOwn && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                        className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors"
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

      {/* 글쓰기 모달 */}
      {showWrite && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5"
          onClick={() => setShowWrite(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">글 작성</h3>

            {/* 카테고리 */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">카테고리</label>
              <div className="flex gap-2 flex-wrap">
                {CATS.slice(1).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                      form.category === c.value
                        ? `${c.bg} ${c.color} ${c.border}`
                        : 'bg-gray-100 text-gray-400 border-transparent'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 닉네임 */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">닉네임</label>
              <input
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="예) 홍길동 마트"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            {/* 제목 */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">제목</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="간단하게 적어주세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            {/* 내용 */}
            <div className="mb-6">
              <label className="text-xs text-gray-500 mb-2 block">내용</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="자세히 적어주시면 빠르게 처리할게요"
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-y leading-relaxed"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWrite(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                className="flex-[2] py-3 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? '올리는 중...' : '올리기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
