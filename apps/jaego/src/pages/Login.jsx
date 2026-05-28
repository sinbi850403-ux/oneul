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

const inputStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--color-white)',
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
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

  const wrapStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-bg)', padding: '24px',
  }
  const cardStyle = {
    background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  }
  const btnPrimary = (disabled) => ({
    background: disabled ? '#9CA3AF' : 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius)', padding: '14px',
    fontSize: '16px', fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '4px',
  })
  const btnGhost = {
    width: '100%', textAlign: 'center', color: 'var(--color-text-sub)',
    fontSize: '13px', padding: '8px', background: 'none', border: 'none', cursor: 'pointer',
  }

  /* ── 비밀번호 찾기 화면 ── */
  if (showReset) {
    return (
      <div style={wrapStyle}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-1px', marginBottom: '8px' }}>오늘재고</div>
            <p style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>비밀번호 찾기</p>
          </div>
          <form onSubmit={handleReset} style={cardStyle}>
            <p style={{ fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.7 }}>
              가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
            </p>
            <input type="email" placeholder="이메일" value={resetEmail}
              onChange={e => setResetEmail(e.target.value)} required style={inputStyle} />
            {error   && <p style={{ color: 'var(--color-out)',  fontSize: '13px', textAlign: 'center' }}>{error}</p>}
            {message && <p style={{ color: 'var(--color-in)',   fontSize: '13px', textAlign: 'center' }}>{message}</p>}
            <button type="submit" disabled={resetLoading} style={btnPrimary(resetLoading)}>
              {resetLoading ? '전송 중...' : '재설정 이메일 보내기'}
            </button>
          </form>
          <button onClick={() => { setShowReset(false); setError(''); setMessage('') }} style={{ ...btnGhost, marginTop: 16 }}>
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  /* ── 메인 로그인/회원가입 화면 ── */
  return (
    <div style={wrapStyle}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-1px', marginBottom: '8px' }}>오늘재고</div>
          <p style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>입고 · 출고 · 재고실사, 한 곳에서</p>
        </div>

        <form onSubmit={handleSubmit} style={cardStyle}>
          <input type="email" placeholder="이메일" value={email}
            onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="비밀번호" value={password}
            onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          {isSignUp && (
            <input type="password" placeholder="비밀번호 확인" value={confirm}
              onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
          )}

          {error   && <p style={{ color: 'var(--color-out)',  fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ color: 'var(--color-in)',   fontSize: '13px', textAlign: 'center' }}>{message}</p>}

          <button type="submit" disabled={loading} style={btnPrimary(loading)}>
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>또는</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Google 로그인 */}
          <button type="button" onClick={handleGoogle} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#fff', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)', padding: '12px', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', color: 'var(--color-text)',
          }}>
            <GoogleIcon />
            Google로 {isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        {!isSignUp && (
          <button onClick={() => { setShowReset(true); setError(''); setMessage('') }}
            style={{ ...btnGhost, marginTop: 8, fontSize: 12 }}>
            비밀번호를 잊으셨나요?
          </button>
        )}

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); setConfirm('') }}
          style={{ ...btnGhost, marginTop: isSignUp ? 16 : 4 }}
        >
          {isSignUp ? '이미 계정이 있어요 → 로그인' : '계정이 없어요 → 회원가입'}
        </button>
      </div>
    </div>
  )
}
