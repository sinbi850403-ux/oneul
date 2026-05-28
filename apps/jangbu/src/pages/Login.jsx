import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

function toKoreanError(msg = '') {
  if (msg.includes('User already registered') || msg.includes('already registered')) return '이미 가입된 이메일입니다. 로그인해 주세요.'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid credentials')) return '이메일 또는 비밀번호를 확인해 주세요.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 받은편지함을 확인해 주세요.'
  if (msg.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.'
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해 주세요.'
  if (msg.includes('invalid email') || msg.includes('Unable to validate')) return '올바른 이메일 주소를 입력해 주세요.'
  if (msg.includes('signup is disabled')) return '현재 가입이 불가합니다.'
  return '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [isSignUp,     setIsSignUp]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [message,      setMessage]      = useState('')
  const [error,        setError]        = useState('')
  const [showReset,    setShowReset]    = useState(false)
  const [resetEmail,   setResetEmail]   = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      if (password !== confirm) {
        setError('비밀번호가 일치하지 않습니다.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(toKoreanError(error.message))
      else setMessage('가입됐어요! 바로 로그인해 주세요.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(toKoreanError(error.message))
      else navigate('/input')
    }

    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    if (error) setError(toKoreanError(error.message))
    else {
      setMessage('비밀번호 재설정 이메일을 발송했어요. 받은 편지함을 확인해 주세요.')
      setShowReset(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  /* ── 비밀번호 찾기 화면 ── */
  if (showReset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-brand">오늘장부</h1>
            <p className="text-gray-500 mt-2 text-sm">비밀번호 찾기</p>
          </div>
          <form onSubmit={handleReset} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
            </p>
            <input
              type="email" placeholder="이메일" value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)} required
              className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
            />
            {error   && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && <p className="text-green-600 text-sm text-center">{message}</p>}
            <button type="submit" disabled={resetLoading}
              className="bg-brand text-white rounded-xl py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50">
              {resetLoading ? '전송 중...' : '재설정 이메일 보내기'}
            </button>
          </form>
          <button
            onClick={() => { setShowReset(false); setError(''); setMessage('') }}
            className="w-full text-center text-gray-500 text-sm mt-4 py-2"
          >
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  /* ── 메인 로그인/회원가입 화면 ── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-brand">오늘장부</h1>
          <p className="text-gray-500 mt-2 text-sm">매일 매출, 간편하게</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <input
            type="email" placeholder="이메일" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          />
          <input
            type="password" placeholder="비밀번호" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          />
          {isSignUp && (
            <input
              type="password" placeholder="비밀번호 확인" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required
              className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
            />
          )}

          {error   && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center">{message}</p>}

          <button type="submit" disabled={loading}
            className="bg-brand text-white rounded-xl py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50">
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google 로그인 */}
          <button type="button" onClick={handleGoogle}
            className="flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:opacity-80">
            <GoogleIcon />
            Google로 {isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        {!isSignUp && (
          <button
            onClick={() => { setShowReset(true); setError(''); setMessage('') }}
            className="w-full text-center text-gray-400 text-xs mt-2 py-1"
          >
            비밀번호를 잊으셨나요?
          </button>
        )}

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); setConfirm('') }}
          className="w-full text-center text-gray-500 text-sm mt-2 py-2"
        >
          {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
        </button>
      </div>
    </div>
  )
}
