// 서버리스 함수용 Supabase REST 헬퍼 (라우트 아님 — 파일명 앞 _ 는 Vercel 이 경로로 노출하지 않는다)
//
// supabase-js 를 쓰지 않는 이유: createClient() 가 호출 시점에 Realtime
// 클라이언트를 만드는데, Vercel 의 Node 20 에는 내장 WebSocket 이 없어
// "Node.js 20 detected without native WebSocket support" 예외로 함수가 죽는다.
// 서버 함수들은 실시간 기능을 쓰지 않으므로 REST 를 직접 호출한다.

// 프로젝트 URL 은 비밀이 아니다 — 클라이언트 번들에 그대로 박혀 모든
// 방문자에게 노출된다. 환경변수 값이 깨져 있던 적이 있어 코드에 기본값을
// 두고, 환경변수는 형식이 멀쩡할 때만 쓴다.
const DEFAULT_URL = 'https://lgxdabtmvbbzmzwistjd.supabase.co'

function resolveUrl() {
  const raw = (process.env.VITE_SUPABASE_URL || '').trim()
  if (raw) {
    try {
      const u = new URL(raw)
      // origin 을 쓴다 — URL 파서가 걸러내는 제어문자가 원본에 남아 있어도
      // 정규화된 주소만 나가게 된다.
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.origin
    } catch { /* 아래 기본값 */ }
    console.error('[supabase] VITE_SUPABASE_URL 형식이 올바르지 않아 기본값을 사용합니다.')
  }
  return DEFAULT_URL
}

export const SUPABASE_URL = resolveUrl()
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const headers = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
})

// PostgREST 질의. query 는 'is_admin=eq.true&select=user_id' 형태.
export async function select(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: headers() })
  if (!r.ok) throw new Error(`${table} 조회 실패 (${r.status})`)
  return r.json()
}

export async function remove(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: { ...headers(), Prefer: 'return=minimal' },
  })
  if (!r.ok) throw new Error(`${table} 삭제 실패 (${r.status})`)
}

// 액세스 토큰의 소유자. 토큰이 없거나 만료됐으면 null.
export async function getUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ? u : null
}
