import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const navigate  = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [message,   setMessage]   = useState('')
  const [ready,     setReady]     = useState(false)  // 토큰 수신 완료 여부
  const timerRef = useRef(null)

  useEffect(() => {
    // PASSWORD_RECOVERY 이벤트가 구독 전에 발생한 경우를 대비해 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    // Supabase가 URL 해시(#access_token=...&type=recovery)를 감지해
    // PASSWORD_RECOVERY 이벤트를 발생시킴
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 타이머 정리 (언마운트 시 navigate 실행 방지)
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('비밀번호 변경에 실패했습니다. 링크가 만료됐을 수 있어요.')
    } else {
      setMessage('비밀번호가 변경됐어요! 잠시 후 로그인 페이지로 이동합니다.')
      await supabase.auth.signOut()
      timerRef.current = setTimeout(() => navigate('/login'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-brand">오늘장부</h1>
          <p className="text-gray-500 mt-2 text-sm">새 비밀번호 설정</p>
        </div>

        {!ready ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-gray-400 text-sm mb-3">인증 링크 확인 중...</div>
            <div className="text-xs text-gray-300">잠시만 기다려 주세요</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">새로 사용할 비밀번호를 입력해 주세요.</p>
            <input
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
            />
            {error   && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && <p className="text-green-600 text-sm text-center">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-brand text-white rounded-xl py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
