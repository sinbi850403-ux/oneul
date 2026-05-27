import { supabase } from '../lib/supabase'

const JANGBU_URL = import.meta.env.VITE_JANGBU_URL || 'https://xn--wh1bw0st1gbrb.kr'

async function goToJangbu() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    window.location.href = `${JANGBU_URL}?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
  } else {
    window.location.href = JANGBU_URL
  }
}

export default function SuiteBar() {
  return (
    <div style={{
      background: '#111827',
      height: 32,
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 0,
      flexShrink: 0,
    }}>
      <button
        onClick={goToJangbu}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9CA3AF',
          fontSize: 13,
          fontWeight: 500,
          padding: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#D1D5DB'}
        onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
      >
        오늘장부
      </button>
      <span style={{ color: '#374151', margin: '0 8px', fontSize: 13 }}>/</span>
      <span style={{ color: '#60A5FA', fontSize: 13, fontWeight: 700 }}>
        오늘재고
      </span>
    </div>
  )
}
