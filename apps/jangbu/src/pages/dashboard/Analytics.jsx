import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

// 방문자 통계 (관리자 전용)
// 숫자는 GA4 에서 가져온다. 자격증명이 브라우저에 노출되지 않도록
// /api/analytics 서버리스 함수를 거치고, 권한 확인도 거기서 한다.

const CHANNEL_LABEL = {
  'Organic Search': '검색',
  'Direct': '직접 입력',
  'Referral': '외부 링크',
  'Organic Social': 'SNS',
  'Paid Search': '검색 광고',
  'Email': '이메일',
  'Unassigned': '기타',
}

function Card({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 px-5 py-4">
      <p className="text-xs text-stone-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-brand' : 'text-stone-800'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

// 일별 방문자 막대 그래프. 차트 라이브러리를 새로 들이지 않고 SVG 로 그린다.
function TrendChart({ series }) {
  if (!series.length) return null
  const max = Math.max(...series.map((d) => d.users), 1)
  const W = 720, H = 160, gap = 3
  const bw = (W - gap * (series.length - 1)) / series.length

  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="일별 방문자 추이">
      {series.map((d, i) => {
        const h = Math.max((d.users / max) * H, d.users > 0 ? 2 : 0)
        return (
          <g key={d.date}>
            <rect
              x={i * (bw + gap)} y={H - h} width={bw} height={h}
              rx={Math.min(3, bw / 2)} fill="#FF6B35"
              opacity={i === series.length - 1 ? 1 : 0.55}
            >
              <title>{`${d.date} · 방문자 ${d.users}명 · 조회 ${d.views}회`}</title>
            </rect>
            {/* 라벨이 겹치지 않게 5일 간격으로만 표시 */}
            {i % 5 === 0 && (
              <text
                x={i * (bw + gap) + bw / 2} y={H + 15}
                textAnchor="middle" fontSize="10" fill="#a8a29e"
              >
                {d.date}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function Bar({ value, max }) {
  return (
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-brand rounded-full"
        style={{ width: `${max ? (value / max) * 100 : 0}%` }}
      />
    </div>
  )
}

export default function Analytics() {
  const [data,    setData]    = useState(null)
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError({ error: '로그인이 필요합니다.' }); return }

      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) setError(json)
      else setData(json)
    } catch {
      setError({ error: '통계를 불러오지 못했어요.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <p className="text-stone-400">불러오는 중...</p>
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-stone-800 mb-1">방문자 분석</h1>
        <div className="mt-6 bg-white rounded-2xl border border-stone-100 p-6">
          <p className="text-stone-800 font-semibold">{error.error}</p>
          {error.hint && <p className="text-sm text-stone-500 mt-2 leading-relaxed">{error.hint}</p>}
          <button
            onClick={load}
            className="mt-4 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const { totals, series, topPosts, channels, conversion } = data
  const maxPost    = Math.max(...topPosts.map((p) => p.views), 1)
  const maxChannel = Math.max(...channels.map((c) => c.sessions), 1)
  const diff = totals.today.users - totals.yesterday.users

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">방문자 분석</h1>
          <p className="text-sm text-stone-400 mt-1">
            오늘장부 앱과 블로그 전체 기준입니다.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm text-stone-400 hover:text-brand transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          label="오늘 방문자" value={`${totals.today.users}명`} accent
          sub={diff === 0 ? '어제와 같음' : diff > 0 ? `어제보다 +${diff}명` : `어제보다 ${diff}명`}
        />
        <Card label="어제" value={`${totals.yesterday.users}명`} sub={`조회 ${totals.yesterday.views}회`} />
        <Card label="최근 7일" value={`${totals.d7.users}명`} sub={`조회 ${totals.d7.views}회`} />
        <Card label="최근 30일" value={`${totals.d30.users}명`} sub={`조회 ${totals.d30.views}회`} />
      </div>

      {/* 추이 */}
      <section className="mt-4 bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="text-sm font-bold text-stone-700 mb-4">최근 30일 방문자 추이</h2>
        {series.some((d) => d.users > 0)
          ? <TrendChart series={series} />
          : <p className="text-sm text-stone-400 py-8 text-center">아직 쌓인 데이터가 없어요.</p>}
      </section>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* 인기 글 */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="text-sm font-bold text-stone-700">인기 블로그 글 TOP 10</h2>
          <p className="text-xs text-stone-400 mt-0.5 mb-4">최근 30일 조회수 기준</p>
          {topPosts.length === 0 && (
            <p className="text-sm text-stone-400 py-6 text-center">아직 데이터가 없어요.</p>
          )}
          <ol className="flex flex-col gap-3">
            {topPosts.map((p, i) => (
              <li key={p.path}>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-stone-300 w-4 shrink-0">{i + 1}</span>
                  <a
                    href={p.path} target="_blank" rel="noreferrer"
                    className="text-sm text-stone-700 hover:text-brand truncate flex-1"
                    title={p.title}
                  >
                    {p.title || p.path}
                  </a>
                  <span className="text-sm font-semibold text-stone-800 shrink-0">{p.views}</span>
                </div>
                <div className="ml-6 mt-1.5"><Bar value={p.views} max={maxPost} /></div>
              </li>
            ))}
          </ol>
        </section>

        {/* 유입 경로 */}
        <section className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="text-sm font-bold text-stone-700">유입 경로</h2>
          <p className="text-xs text-stone-400 mt-0.5 mb-4">최근 30일 세션 기준</p>
          {channels.length === 0 && (
            <p className="text-sm text-stone-400 py-6 text-center">아직 데이터가 없어요.</p>
          )}
          <ul className="flex flex-col gap-3">
            {channels.map((c) => (
              <li key={`${c.group}-${c.source}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-stone-700 flex-1 truncate">
                    {CHANNEL_LABEL[c.group] || c.group}
                    <span className="text-stone-400 text-xs ml-1.5">{c.source}</span>
                  </span>
                  <span className="text-sm font-semibold text-stone-800 shrink-0">{c.sessions}</span>
                </div>
                <div className="mt-1.5"><Bar value={c.sessions} max={maxChannel} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 전환 */}
      <section className="mt-4 bg-white rounded-2xl border border-stone-100 p-5">
        <h2 className="text-sm font-bold text-stone-700 mb-4">블로그 → 가입 전환 (최근 30일)</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card label="블로그 방문자" value={`${conversion.blogUsers}명`} />
          <Card label="신규 가입" value={`${conversion.signUps}명`} />
          <Card label="전환율" value={`${conversion.rate}%`} accent />
        </div>
        <p className="text-xs text-stone-400 mt-3 leading-relaxed">
          가입 시점에 기록된 sign_up 이벤트를 블로그 방문자 수로 나눈 값이에요.
          블로그를 거치지 않고 가입한 경우도 분자에 포함되므로 대략적인 추정치입니다.
        </p>
      </section>

      <p className="text-xs text-stone-300 mt-6">
        GA4 기준 · 최대 5분 캐시 · localhost 접속은 집계에서 제외됩니다.
      </p>
    </div>
  )
}
