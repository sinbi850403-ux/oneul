import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

const CATS = [
  { value: '',        label: '전체',    color: 'text-gray-500',  bg: 'bg-gray-50',   border: 'border-gray-300'  },
  { value: 'bug',     label: '버그신고', color: 'text-red-600',   bg: 'bg-red-50',    border: 'border-red-400'   },
  { value: 'feature', label: '기능요청', color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-400'  },
  { value: 'free',    label: '자유',    color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-400' },
]

const CAT_BADGE  = { bug: 'bg-red-50 text-red-600', feature: 'bg-blue-50 text-blue-600', free: 'bg-green-50 text-green-600' }
const CAT_LABEL  = { bug: '버그신고', feature: '기능요청', free: '자유' }

const STATUS_STYLE = {
  open:       { label: '접수',   cls: 'bg-gray-100 text-gray-500' },
  processing: { label: '처리중', cls: 'bg-yellow-100 text-yellow-700' },
  done:       { label: '완료',   cls: 'bg-green-100 text-green-700' },
}

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
  const [isAdmin,    setIsAdmin]    = useState(false)
  const [showWrite,  setShowWrite]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form,       setForm]       = useState({ category: 'free', title: '', content: '', nickname: '' })

  // 답변 관련
  const [replies,      setReplies]      = useState({}) // { postId: [reply, ...] }
  const [replyText,    setReplyText]    = useState('')
  const [replyTarget,  setReplyTarget]  = useState(null)
  const [submittingReply, setSubmittingReply] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles').select('shop_name, is_admin').eq('user_id', user.id).maybeSingle()
      setIsAdmin(profile?.is_admin ?? false)
      setForm(f => ({ ...f, nickname: profile?.shop_name || '익명' }))
    }
    init()
  }, [])

  useEffect(() => { fetchPosts() }, [cat])

  useEffect(() => {
    if (expanded) fetchReplies(expanded)
  }, [expanded])

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

  async function fetchReplies(postId) {
    const { data } = await supabase
      .from('board_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at')
    setReplies(prev => ({ ...prev, [postId]: data ?? [] }))
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

  async function handleStatusChange(postId, status) {
    await supabase.from('board_posts').update({ status }).eq('id', postId)
    setPosts(p => p.map(x => x.id === postId ? { ...x, status } : x))
  }

  async function handleAddReply(postId) {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    await supabase.from('board_replies').insert({
      post_id: postId,
      content: replyText.trim(),
    })
    setReplyText('')
    setReplyTarget(null)
    await fetchReplies(postId)
    setSubmittingReply(false)
  }

  async function handleDeleteReply(replyId, postId) {
    await supabase.from('board_replies').delete().eq('id', replyId)
    setReplies(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter(r => r.id !== replyId),
    }))
  }

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            게시판
            {isAdmin && <span className="ml-2 text-xs bg-brand text-white px-2 py-0.5 rounded-full">관리자</span>}
          </h2>
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
            const isOpen    = expanded === post.id
            const isOwn     = post.user_id === userId
            const badge     = CAT_BADGE[post.category] ?? 'bg-gray-100 text-gray-500'
            const label     = CAT_LABEL[post.category] ?? '기타'
            const statusInfo = STATUS_STYLE[post.status] ?? STATUS_STYLE.open
            const postReplies = replies[post.id] ?? []

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
                  {post.status !== 'open' && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  )}
                  {postReplies.length > 0 && (
                    <span className="text-xs text-brand font-semibold shrink-0">
                      💬 {postReplies.length}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{post.nickname}</span>
                  <span className="text-xs text-gray-300 shrink-0">{timeSince(post.created_at)}</span>
                </div>

                {/* 본문 (펼침) */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words mb-3">
                      {post.content}
                    </p>

                    {/* 관리자 툴바 */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                        <span className="text-xs text-gray-400 font-medium">상태:</span>
                        {Object.entries(STATUS_STYLE).map(([val, { label: sl, cls }]) => (
                          <button
                            key={val}
                            onClick={e => { e.stopPropagation(); handleStatusChange(post.id, val) }}
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all border ${
                              post.status === val
                                ? `${cls} border-current`
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {sl}
                          </button>
                        ))}
                        <div className="flex-1" />
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          글 삭제
                        </button>
                      </div>
                    )}

                    {/* 본인 삭제 (비관리자) */}
                    {!isAdmin && isOwn && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                        className="text-xs text-red-400 hover:text-red-600 mb-3 block"
                      >
                        삭제
                      </button>
                    )}

                    {/* 관리자 답변 목록 */}
                    {postReplies.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {postReplies.map(r => (
                          <div key={r.id} className="bg-brand/5 border border-brand/20 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-brand">🛠 관리자 답변</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{timeSince(r.created_at)}</span>
                                {isAdmin && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteReply(r.id, post.id) }}
                                    className="text-xs text-gray-300 hover:text-red-400"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {r.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 관리자 답변 입력 */}
                    {isAdmin && (
                      replyTarget === post.id ? (
                        <div onClick={e => e.stopPropagation()} className="mt-2">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="답변을 입력하세요..."
                            rows={3}
                            className="w-full border border-brand/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand resize-none"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { setReplyTarget(null); setReplyText('') }}
                              className="flex-1 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleAddReply(post.id)}
                              disabled={submittingReply || !replyText.trim()}
                              className="flex-[2] py-2 bg-brand text-white rounded-xl text-xs font-bold disabled:opacity-50"
                            >
                              {submittingReply ? '등록 중...' : '답변 등록'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setReplyTarget(post.id); setReplyText('') }}
                          className="text-xs text-brand font-semibold hover:underline mt-1"
                        >
                          + 답변 달기
                        </button>
                      )
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

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">닉네임</label>
              <input
                value={form.nickname}
                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                placeholder="예) 홍길동 마트"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-2 block">제목</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="간단하게 적어주세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>

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
