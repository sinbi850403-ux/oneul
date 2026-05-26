import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function toKoreanError(msg = '', status) {
  if (msg.includes('User already registered') || msg.includes('already registered')) return '이미 가입된 이메일입니다. 로그인해 주세요.'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid credentials')) return '이메일 또는 비밀번호를 확인해 주세요.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 받은편지함을 확인해 주세요.'
  if (msg.includes('Password should be at least') || msg.includes('password')) return '비밀번호는 6자 이상이어야 합니다.'
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해 주세요.'
  if (msg.includes('invalid email') || msg.includes('Unable to validate')) return '올바른 이메일 주소를 입력해 주세요.'
  if (msg.includes('signup is disabled') || msg.includes('Signups not allowed')) return '현재 가입이 불가합니다.'
  if (msg.includes('over_email_send_rate_limit')) return '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  if (status === 422) return '이미 가입된 이메일입니다. 로그인해 주세요.'
  return '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')
  const [error,    setError]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        const msg = toKoreanError(error.message, error.status)
        setError(msg)
        if (error.status === 422) setIsSignUp(false)
      } else {
        setIsSignUp(false)
        setMessage('가입됐어요! 이메일을 확인한 뒤 로그인해 주세요.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(toKoreanError(error.message, error.status))
      else navigate('/')
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '36px',
            fontWeight: '800',
            color: 'var(--color-primary)',
            letterSpacing: '-1px',
            marginBottom: '8px',
          }}>
            오늘재고
          </div>
          <p style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>
            입고 · 출고 · 재고실사, 한 곳에서
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              fontSize: '15px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              fontSize: '15px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          {error   && <p style={{ color: 'var(--color-out)',  fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ color: 'var(--color-in)',   fontSize: '13px', textAlign: 'center' }}>{message}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#9CA3AF' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
          style={{
            width: '100%',
            textAlign: 'center',
            color: 'var(--color-text-sub)',
            fontSize: '13px',
            marginTop: '16px',
            padding: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
        </button>
      </div>
    </div>
  )
}
