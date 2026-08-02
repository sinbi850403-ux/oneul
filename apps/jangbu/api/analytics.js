// Vercel Serverless Function
// GET /api/analytics  →  GA4 방문자 통계 (관리자 전용)
//
// GA4 자격증명을 브라우저에 내려보내지 않기 위해 서버에서만 호출한다.
// 프론트는 Supabase access_token 을 Authorization 헤더로 보내고,
// 여기서 profiles.is_admin 을 확인한 뒤에만 데이터를 돌려준다.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
// 속성 ID 는 비밀값이 아니다(측정 ID 처럼 공개되어도 무방). 설정 단계를
// 줄이려고 코드에 두고, 필요하면 환경변수로 덮어쓸 수 있게 남겨둔다.
const GA4_PROPERTY_ID      = process.env.GA4_PROPERTY_ID || '548190585'
const GA_SERVICE_ACCOUNT   = process.env.GA_SERVICE_ACCOUNT_JSON

// GA4 API 는 일일 호출 할당량이 있다. 관리자가 새로고침을 연타해도
// 할당량이 마르지 않도록 람다 인스턴스 메모리에 5분간 캐시한다.
const CACHE_MS = 5 * 60 * 1000
let cache = null

// GA4 SDK 는 무겁고, 로드에 실패하면 모듈 최상단 import 로는 함수 자체가
// 죽어 원인을 알 수 없다. 실제로 쓸 때 불러와서 실패를 잡을 수 있게 한다.
async function gaClient() {
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data')
  const creds = JSON.parse(GA_SERVICE_ACCOUNT)
  return new BetaAnalyticsDataClient({
    credentials: { client_email: creds.client_email, private_key: creds.private_key },
    projectId: creds.project_id,
  })
}

const property = () => `properties/${GA4_PROPERTY_ID}`

// GA4 가 돌려주는 'YYYYMMDD' → 'MM/DD'
function fmtDate(d) {
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`
}

const num = (v) => Number(v ?? 0)

// 어떤 경로로 죽든 응답은 항상 JSON 이어야 한다. 그러지 않으면 프론트가
// 본문을 파싱하지 못해 "불러오지 못했어요"만 뜨고 원인이 묻힌다.
export default async function handler(req, res) {
  try {
    return await run(req, res)
  } catch (e) {
    console.error('[analytics] 처리 실패:', String(e?.message ?? e))
    return res.status(500).json({ error: '통계 처리 중 오류가 발생했어요.' })
  }
}

async function run(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── 1. 관리자 확인 ──────────────────────────────────────
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })

  // 환경변수가 비어 있으면 createClient 가 그냥 던져서 함수가 죽고, 응답이
  // JSON 이 아닌 오류 페이지가 되어 화면에서는 원인을 알 수 없다.
  //
  // 이 검사는 관리자 확인보다 먼저 일어난다(확인 자체가 이 키를 쓰므로).
  // 따라서 누락된 변수 이름은 응답에 담지 않고 서버 로그로만 남긴다 —
  // 인증 없는 요청자에게 서버 설정 상태를 알려줄 이유가 없다.
  const missing = []
  if (!SUPABASE_URL)         missing.push('VITE_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY')
  if (missing.length) {
    console.error('[analytics] 환경변수 누락:', missing.join(', '))
    return res.status(503).json({
      error: '서버 설정이 완료되지 않았어요.',
      hint: 'Vercel 환경변수 설정을 확인해 주세요. 자세한 내용은 서버 로그에 있어요.',
    })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 토큰이 망가졌거나 만료되면 getUser 가 예외를 던지기도 한다. 그것도
  // 인증 실패이므로 500 이 아니라 401 로 돌려줘야 원인 구분이 된다.
  let user
  try {
    const { data, error: authErr } = await db.auth.getUser(token)
    user = data?.user
    if (authErr || !user) return res.status(401).json({ error: '로그인이 필요합니다.' })
  } catch {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  try {
    const { data: profile } = await db
      .from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle()
    if (!profile?.is_admin) return res.status(403).json({ error: '접근 권한이 없습니다.' })
  } catch {
    return res.status(500).json({ error: '권한 확인에 실패했어요.' })
  }

  // ── 2. 설정 확인 ────────────────────────────────────────
  if (!GA4_PROPERTY_ID || !GA_SERVICE_ACCOUNT) {
    return res.status(503).json({
      error: 'GA4 연동이 아직 설정되지 않았어요.',
      // 이 응답은 관리자 확인을 통과한 뒤에만 나가므로 변수명을 담아도 된다.
      hint: 'Vercel 환경변수 GA_SERVICE_ACCOUNT_JSON 을 등록한 뒤 재배포해 주세요.',
    })
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json({ ...cache.data, cached: true })
  }

  // ── 3. GA4 조회 ─────────────────────────────────────────
  try {
    const ga = await gaClient()

    // 기간별 방문자 수. activeUsers 는 중복 제거된 값이라 일별 합계로는
    // 구할 수 없다. 기간마다 별도 dateRange 로 물어야 정확하다.
    const totalsReq = {
      property: property(),
      dateRanges: [
        { startDate: 'today',      endDate: 'today',     name: 'today' },
        { startDate: 'yesterday',  endDate: 'yesterday', name: 'yesterday' },
        { startDate: '6daysAgo',   endDate: 'today',     name: 'd7' },
        { startDate: '29daysAgo',  endDate: 'today',     name: 'd30' },
      ],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    }

    // 그래프용 일별 추이
    const seriesReq = {
      property: property(),
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 31,
    }

    // 인기 블로그 글
    const postsReq = {
      property: property(),
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/posts/' },
        },
      },
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }

    // 유입 경로
    const channelsReq = {
      property: property(),
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 12,
    }

    // 가입 전환: sign_up 이벤트(Login.jsx 에서 발생)와 블로그 방문자 수
    const signupReq = {
      property: property(),
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', stringFilter: { value: 'sign_up' } },
      },
    }

    const blogUsersReq = {
      property: property(),
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: '/blog' },
        },
      },
    }

    const [totals, series, posts, channels, signups, blogUsers] = await Promise.all(
      [totalsReq, seriesReq, postsReq, channelsReq, signupReq, blogUsersReq]
        .map((r) => ga.runReport(r).then(([resp]) => resp))
    )

    // dateRange 별 결과는 행으로 나뉘어 오고, 마지막 dimension 이 range 이름이다.
    const byRange = {}
    for (const row of totals.rows ?? []) {
      const name = row.dimensionValues?.at(-1)?.value ?? 'date_range_0'
      byRange[name] = {
        users: num(row.metricValues?.[0]?.value),
        views: num(row.metricValues?.[1]?.value),
      }
    }
    const pick = (k, i) => byRange[k] ?? byRange[`date_range_${i}`] ?? { users: 0, views: 0 }

    const signUpCount = num(signups.rows?.[0]?.metricValues?.[0]?.value)
    const blogUserCount = num(blogUsers.rows?.[0]?.metricValues?.[0]?.value)

    const data = {
      updatedAt: new Date().toISOString(),
      totals: {
        today:     pick('today', 0),
        yesterday: pick('yesterday', 1),
        d7:        pick('d7', 2),
        d30:       pick('d30', 3),
      },
      series: (series.rows ?? []).map((r) => ({
        date:  fmtDate(r.dimensionValues[0].value),
        users: num(r.metricValues[0].value),
        views: num(r.metricValues[1].value),
      })),
      topPosts: (posts.rows ?? []).map((r) => ({
        path:  r.dimensionValues[0].value,
        title: (r.dimensionValues[1].value || '').replace(' | 오늘장부 블로그', ''),
        views: num(r.metricValues[0].value),
        users: num(r.metricValues[1].value),
      })),
      channels: (channels.rows ?? []).map((r) => ({
        group:    r.dimensionValues[0].value,
        source:   r.dimensionValues[1].value,
        sessions: num(r.metricValues[0].value),
      })),
      conversion: {
        signUps:   signUpCount,
        blogUsers: blogUserCount,
        rate: blogUserCount ? Math.round((signUpCount / blogUserCount) * 1000) / 10 : 0,
      },
    }

    cache = { at: Date.now(), data }
    return res.status(200).json(data)
  } catch (e) {
    // 내부 구조가 드러나지 않게 원문 대신 분류된 메시지만 내려준다.
    const msg = String(e?.message ?? '')
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      return res.status(502).json({
        error: 'GA4 접근 권한이 없어요.',
        hint: 'GA4 속성 액세스 관리에서 서비스 계정을 뷰어로 추가했는지 확인해 주세요.',
      })
    }
    console.error('[analytics] GA4 조회 실패:', msg)
    return res.status(502).json({ error: '통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
}
