import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate  = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [message,   setMessage]   = useState('')
  const [ready,     setReady]     = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
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
      setMessage('비밀번호가 변경됐어요! 다시 로그인해 주세요.')
      setTimeout(() => navigate('/login'), 2000)
    }
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-1px', marginBottom: '8px' }}>오늘재고</div>
          <p style={{ color: 'var(--color-text-sub)', fontSize: '14px' }}>새 비밀번호 설정</p>
        </div>

        {!ready ? (
          <div style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', padding: '32px 24px', textAlign: 'center',
          }}>
            <p style={{ color: 'var(--color-text-sub)', fontSize: 14, marginBottom: 8 }}>인증 링크 확인 중...</p>
            <p style={{ color: 'var(--color-border)', fontSize: 12 }}>잠시만 기다려 주세요</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.6 }}>
              새로 사용할 비밀번호를 입력해 주세요.
            </p>
            <input
              type="password" placeholder="새 비밀번호 (6자 이상)"
              value={password} onChange={e => setPassword(e.target.value)}
              required style={inputStyle}
            />
            <input
              type="password" placeholder="비밀번호 확인"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              required style={inputStyle}
            />
            {error   && <p style={{ color: 'var(--color-out)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
            {message && <p style={{ color: 'var(--color-in)',  fontSize: 13, textAlign: 'center' }}>{message}</p>}
            <button type="submit" disabled={loading} style={{
              background: loading ? '#9CA3AF' : 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)', padding: '14px',
              fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
