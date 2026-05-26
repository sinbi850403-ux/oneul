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

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-brand">오늘장부</h1>
          <p className="text-gray-500 mt-2 text-sm">매일 매출, 간편하게</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-brand"
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white rounded-xl py-4 text-lg font-semibold active:opacity-80 disabled:opacity-50"
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
          className="w-full text-center text-gray-500 text-sm mt-4 py-2"
        >
          {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
        </button>
      </div>
    </div>
  )
}
