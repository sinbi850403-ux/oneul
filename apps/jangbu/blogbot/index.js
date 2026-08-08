import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { keywords } from './keywords.js'

// ── 경로 (이 파일 위치 기준이라 어디서 실행해도 동일) ──────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOG_DIR = path.resolve(__dirname, '../public/blog')
const POSTS_DIR = path.join(BLOG_DIR, 'posts')
const MANIFEST = path.join(BLOG_DIR, 'blog-manifest.json')
const SITEMAP = path.resolve(__dirname, '../public/sitemap.xml')

const SITE = 'https://xn--wh1bw0st1gbrb.kr' // 오늘장부.kr (punycode)

// public/tools 아래 정적 계산기 페이지들. 사이트맵 색인용.
const TOOL_PAGES = ['delivery-fee-calculator', 'card-fee-calculator', 'vat-simplified-calculator']

// 글 카테고리 → 관련 계산기. 본문 아래에 링크 박스를 붙여 내부 링크를 늘린다.
// 매칭되는 게 없으면 두 개를 모두 보여준다.
const TOOLS = {
  'delivery-fee-calculator': { label: '배달앱 수수료 계산기', desc: '중개·결제 수수료와 배달비를 빼면 실제로 얼마가 입금되는지 계산합니다' },
  'card-fee-calculator':     { label: '카드수수료 계산기',   desc: '연매출로 우대수수료율 구간을 확인하고 환급 대상인지 알아봅니다' },
  'vat-simplified-calculator': { label: '간이과세자 부가세 계산기', desc: '업종별 부가가치율로 납부세액을 계산하고 납부의무 면제 대상인지 확인합니다' },
}
// 글마다 최대 2개까지만 노출한다. 세 개를 다 붙이면 링크 박스가 본문을 밀어낸다.
const CATEGORY_TOOLS = {
  '배달앱':      ['delivery-fee-calculator'],
  '카드수수료':  ['card-fee-calculator'],
  '부가세/세금': ['vat-simplified-calculator'],
  '절세꿀팁':    ['vat-simplified-calculator', 'card-fee-calculator'],
  '매출관리':    ['card-fee-calculator', 'delivery-fee-calculator'],
  '사업자등록':  ['vat-simplified-calculator', 'card-fee-calculator'],
}
const DEFAULT_TOOLS = ['card-fee-calculator', 'vat-simplified-calculator']

function toolBoxHtml(category) {
  const slugs = CATEGORY_TOOLS[category] || DEFAULT_TOOLS
  const items = slugs
    .map((slug) => {
      const t = TOOLS[slug]
      return `<li style="padding:10px 0;border-bottom:1px solid #ffe6d9;"><a href="/tools/${slug}/" style="color:#FF6B35;text-decoration:none;font-weight:700;font-size:15px;">${t.label}</a><div style="font-size:13px;color:#777;margin-top:2px;">${t.desc}</div></li>`
    })
    .join('\n        ')
  return `<section style="background:#fff8f5;border-radius:16px;padding:24px 28px;margin-top:24px;">
      <h2 style="font-size:18px;font-weight:800;color:#1a1a1a;margin:0 0 14px;">무료 계산기로 바로 확인하기</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${items}
      </ul>
    </section>`
}
const SITE_KR = 'https://오늘장부.kr'
const DRY_RUN = process.argv.includes('--dry-run')

// ── KST 날짜 (러너는 UTC이므로 +9h 후 UTC getter 사용) ──────────────
function kstParts() {
  const d = new Date(Date.now() + 9 * 3600 * 1000)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() }
}
const { y, m, day } = kstParts()
const pad = (n) => String(n).padStart(2, '0')
const dateISO = `${y}-${pad(m)}-${pad(day)}`
const dateKR = `${y}년 ${pad(m)}월 ${pad(day)}일`

// ── 이미 다룬 주제인지 판별 ──────────────────────────────────────
// 키워드 풀은 카테고리당 20개뿐인데 날짜 나머지로만 순환시키면 20일마다 한 바퀴
// 돌아 같은 주제를 또 쓴다. 실제로 201편 중 38편이 재탕이었고 애드센스가
// "가치가 별로 없는 콘텐츠"로 게재를 거절했다.

// 모든 제목에 깔린 상투구 — 유사도 계산에서 빼지 않으면 서로 다른 주제까지 겹쳐 보인다.
const TITLE_STOPWORDS = new Set([
  '사장님', '사장님이', '사장님을', '소상공인', '소상공인이', '소상공인이라면', '꼭', '알아야',
  '할', '핵심', '정리', '총정리', '완전', '완전정복', '가이드', '전략', '실전', '방법', '법',
  '필수', '필독', '체크리스트', '최신', '위한', '및', 'vs', '한눈에', '기준',
])

function topicTokens(s) {
  return new Set(
    String(s || '')
      .match(/[가-힣A-Za-z0-9]+/g)
      ?.filter((t) => !TITLE_STOPWORDS.has(t) && !/^20\d\d년?$/.test(t)) || []
  )
}

// 어미만 다른 같은 말을 같게 본다. "활용"/"활용법", "입금"/"입금일" 처럼
// 붙는 접미사 하나 때문에 중복을 놓치는 경우가 많다.
function tokenMatches(t, set) {
  if (set.has(t)) return true
  for (const u of set) {
    if (t.length >= 2 && u.length >= 2 && (u.startsWith(t) || t.startsWith(u))) return true
  }
  return false
}

// 단어 희소성(IDF). "배달"·"계산" 같은 흔한 말이 겹치는 것과
// "키오스크"·"손익분기점" 같은 고유한 말이 겹치는 것은 무게가 달라야 한다.
function buildIdf(manifest) {
  const df = new Map()
  for (const p of manifest) {
    for (const t of topicTokens(p.title)) df.set(t, (df.get(t) || 0) + 1)
  }
  const n = manifest.length || 1
  return (t) => Math.log((n + 1) / ((df.get(t) || 0) + 1)) + 1
}

// 키워드의 단어들이 제목 안에 얼마나 들어있는지를 희소성으로 가중해 계산한다.
function weightedContainment(kt, pt, idf) {
  let hit = 0, total = 0
  for (const t of kt) {
    const w = idf(t)
    total += w
    if (tokenMatches(t, pt)) hit += w
  }
  return total ? hit / total : 0
}

// 기존 발행글 163편에 사람이 정답을 붙여 맞춘 값. 같은 주제 9건은 0.65 이상,
// 다른 주제 중 가장 높은 "배달 손익분기점 계산"이 0.60이라 그 사이를 잡았다.
// 여유가 좁으므로 애매하면 막는 쪽으로 기울인다 — 잘못 막으면 주제 하나를
// 건너뛰고 말지만, 잘못 통과시키면 중복 글이 그대로 발행된다.
const TOPIC_DUP_THRESHOLD = 0.63

function isAlreadyCovered(kw, manifest, idf) {
  // 발행 시 keyword를 기록하므로 정확히 일치하면 바로 중복.
  if (manifest.some((p) => p.keyword === kw.keyword)) return true
  // 기록 이전에 발행된 글은 제목으로 판정한다.
  // 카테고리로 좁히면 안 된다. 같은 주제가 다른 섹션에 들어간 경우가 실제로 있었다
  // ("매입세액 공제"는 부가세/세금과 절세꿀팁에 흩어져 3편이나 있었다).
  const kt = topicTokens(kw.keyword)
  return manifest.some(
    (p) => weightedContainment(kt, topicTokens(p.title), idf) >= TOPIC_DUP_THRESHOLD
  )
}

// ── 키워드 선택 ──────────────────────────────────────────────────
// 우선순위: --kw=<번호|문자열>(수동) → --category=<섹션> → 전체
// 날짜 순환 위치에서 시작해 아직 안 쓴 주제를 찾을 때까지 앞으로 훑는다.
function pickKeyword(manifest = []) {
  const dayNum = Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000)
  const arg = (name) => {
    const a = process.argv.find((x) => x.startsWith(name))
    return a ? a.slice(name.length) : null
  }
  // 수동 지정은 중복 검사를 건너뛴다 — 사람이 의도적으로 고른 것이다.
  const kw = arg('--kw=')
  if (kw) {
    const idx = Number(kw)
    if (Number.isInteger(idx) && keywords[idx]) return keywords[idx]
    const found = keywords.find((k) => k.keyword.includes(kw) || k.category === kw)
    if (found) return found
  }

  const cat = arg('--category=')
  const pool = cat ? keywords.filter((k) => k.category === cat) : keywords
  if (!pool.length) return keywords[dayNum % keywords.length]

  const idf = buildIdf(manifest)
  const start = dayNum % pool.length
  for (let i = 0; i < pool.length; i++) {
    const cand = pool[(start + i) % pool.length]
    if (!isAlreadyCovered(cand, manifest, idf)) {
      if (i > 0) console.log(`주제 중복 ${i}건 건너뜀 → "${cand.keyword}"`)
      return cand
    }
  }

  // 풀이 전부 소진됐다. 재탕하느니 발행을 멈추는 편이 낫다.
  return null
}

// ── 유틸 ─────────────────────────────────────────────────────────
function sanitizeSlug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post'
}
function seedFromSlug(slug) {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % 100000
}
function uniqueSlug(base) {
  const existing = new Set(
    fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).map((f) => f.replace(/\.html$/, '')) : []
  )
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Claude(Opus 4.8 + 웹검색)로 사실 확인 후 글 생성 ───────────────
// 정확성이 최우선. 웹검색으로 2026년 한국 기준 사실을 확인한 뒤 작성한다.
async function generatePost(kw) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `당신은 한국 자영업자(소상공인)를 위한 실전 정보 블로그 "오늘장부 블로그"의 시니어 에디터입니다.
정확성이 최우선입니다. 독자(사장님)는 이 글을 보고 세금·비용에 관한 실제 의사결정을 합니다.

키워드: "${kw.keyword}"
카테고리: "${kw.category}"
앱: 오늘장부 (${SITE_KR}) — 카드·현금·배달앱 매출을 한 번에 기록하고 부가세 예상액을 자동 계산해주는 소상공인 일매출 기록 앱

[사실 검증 — 매우 중요]
- 글을 쓰기 전에 web_search 도구로 2026년 현재 한국 기준 사실을 반드시 확인하세요. 특히 세율·과세 기준금액·신고 기한·카드수수료율·4대보험·주휴수당 등 숫자와 제도는 공식/신뢰 출처(국세청·홈택스, 정부 보도자료, 최신 자료)로 확인합니다.
- 확인되지 않은 구체적 수치·날짜·제도는 단정하지 마세요. 확신이 없으면 "정확한 금액·기준은 홈택스/국세청 또는 세무사에게 확인"처럼 안내하고 일반 원칙 위주로 씁니다.
- 추측·과장·허위·오래된 정보는 절대 금지. 거짓을 넣느니 범위를 좁혀 일반론으로 쓰는 편이 낫습니다.
- 검색으로 확인한 사실을 본문에 자연스럽게 녹이되, 각주·인용표시([1] 등)·URL은 본문에 넣지 마세요.

[글 형식 — 예시처럼 깊이 있게]
- 한국어 1500~2500자. 사장님이 바로 써먹을 실전 정보.
- 구조: 도입 <p> → 여러 개의 <h2> 섹션(필요시 <h3>) → 비교·정리는 <table>(thead/tbody) 또는 <ul>/<ol> → 마지막에 짧은 FAQ(<h2>자주 묻는 질문</h2> 아래 <h3>질문</h3><p>답</p> 2~3개).
- 사용 태그: <h2> <h3> <p> <ul> <ol> <li> <strong> <table> <thead> <tbody> <tr> <th> <td> <blockquote>. <h1>과 <img>는 절대 넣지 마세요(제목·대표사진은 템플릿이 처리).
- 매출·세금 주제이므로 본문 중간에 "오늘장부"를 1~2회 자연스럽게 언급하고, 마지막 문단에 링크 1회: <a href="${SITE_KR}">오늘장부 무료로 시작하기</a>
- 세금·신고·금액이 포함되면 본문 맨 끝에 <p>로: "※ 본 글은 2026년 기준 참고용 정보이며, 정확한 신고·금액은 국세청 홈택스 또는 세무사와 상담하세요."

[출력 — JSON만]
검색과 사고가 끝나면 마지막에 아래 JSON 객체 "하나만" 출력하세요. JSON 앞뒤에 설명·코드블록·인용표시를 절대 넣지 마세요.
{
  "title": "제목 (키워드 포함, 40자 이내, 클릭 유도)",
  "slug": "english-lowercase-hyphenated-slug",
  "description": "카드 목록용 70~120자 요약",
  "tags": ["태그1","태그2","태그3","태그4"],
  "body": "<h2>...</h2> ... 본문 HTML 전체"
}`

  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }]
  let messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
  let resp

  // 턴마다 누적 대화(검색 결과 포함)를 통째로 재전송하므로, 매 요청 직전에
  // 마지막 블록에만 cache_control을 찍어 이전 프리픽스를 캐시에서 읽는다.
  // (재전송분 입력 단가 $3/M → $0.30/M)
  const setCacheBreakpoint = (on) => {
    for (const msg of messages) {
      if (!Array.isArray(msg.content)) continue
      for (const block of msg.content) delete block.cache_control
    }
    if (!on) return
    const last = messages[messages.length - 1]
    if (Array.isArray(last.content) && last.content.length) {
      last.content[last.content.length - 1].cache_control = { type: 'ephemeral' }
    }
  }

  // web_search 서버 루프가 한도에 도달하면 pause_turn → 이어서 재요청
  let useCache = true
  for (let turn = 0; turn < 3; turn++) {
    setCacheBreakpoint(useCache)
    try {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        tools,
        messages,
      })
      resp = await stream.finalMessage()
    } catch (err) {
      // 캐시 브레이크포인트를 못 붙이는 블록 타입이면 캐시 없이 한 번 더
      if (useCache && err?.status === 400 && /cache_control/i.test(err?.message || '')) {
        console.warn('  ⚠ cache_control 거부 - 캐시 없이 재시도')
        useCache = false
        turn--
        continue
      }
      throw err
    }
    if (resp.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: resp.content })
      continue
    }
    break
  }

  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON 응답 파싱 실패: ' + text.slice(0, 300))
  return JSON.parse(match[0])
}

// ── 글 HTML 템플릿 (기존 글과 동일한 인라인 스타일/구조) ──────────
function renderPostHtml({ title, description, body, category, tags, thumb, related }) {
  const url = `${SITE}/blog/posts/${slugGlobal}.html`
  const tagHtml = (tags || [])
    .map((t) => `<a href="/blog/?tag=${encodeURIComponent(t)}" class="tag">${esc(t)}</a>`)
    .join(' ')
  // FAQ 리치스니펫: 본문 "자주 묻는 질문" 섹션의 Q/A를 FAQPage 스키마로 (구글 검색결과 Q&A 박스)
  const faqLd = (() => {
    const i = body.indexOf('자주 묻는 질문')
    if (i === -1) return null
    const re = /<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g
    const items = []
    let mm
    while ((mm = re.exec(body.slice(i))) !== null) {
      const q = mm[1].replace(/<[^>]+>/g, '').trim()
      const a = mm[2].replace(/<[^>]+>/g, '').trim()
      if (q && a) items.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })
    }
    return items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items } : null
  })()
  // 관련 글 내부링크 (체류·색인 도움)
  const relatedHtml = (related && related.length)
    ? `<section style="background:#fff8f5;border-radius:16px;padding:24px 28px;margin-top:24px;">
      <h2 style="font-size:18px;font-weight:800;color:#1a1a1a;margin:0 0 14px;">함께 보면 좋은 글</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${related.map((r) => `<li style="padding:8px 0;border-bottom:1px solid #ffe6d9;"><a href="/blog/posts/${r.slug}.html" style="color:#FF6B35;text-decoration:none;font-weight:600;font-size:14px;">${esc(r.title)}</a></li>`).join('\n        ')}
      </ul>
    </section>`
    : ''
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: dateISO,
    dateModified: dateISO,
    image: thumb,
    author: { '@type': 'Organization', name: '오늘장부', url: SITE_KR },
    publisher: {
      '@type': 'Organization',
      name: '오늘장부',
      logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-192.png` },
    },
    mainEntityOfPage: url,
    keywords: (tags || []).join(', '),
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} | 오늘장부 블로그</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(thumb)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/icons/icon-192.png">
  <!-- 방문자 분석 (GA4 + Clarity + 네이버). ID는 /analytics.js 상단에서 관리. -->
  <script defer src="/analytics.js"></script>
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2764893290310463" crossorigin="anonymous"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif; background: #f8f9fa; color: #1a1a1a; line-height: 1.7; }
    header { background: #fff; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 100; }
    .header-inner { max-width: 1100px; margin: 0 auto; padding: 0 20px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .logo-icon { width: 32px; height: 32px; background: #FF6B35; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 16px; }
    .logo-text { font-size: 18px; font-weight: 800; color: #FF6B35; }
    .logo-sub { font-size: 13px; color: #888; margin-left: 4px; }
    .header-cta { background: #FF6B35; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
    /* minmax(0, ...): 표처럼 최소폭이 큰 콘텐츠가 그리드 트랙을 밀어내 페이지 전체가
       가로로 스크롤되는 것을 막는다. 1fr만 쓰면 트랙 최소폭이 auto라 끌려간다. */
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; }
    @media (max-width: 768px) { .wrap { grid-template-columns: minmax(0, 1fr); } .sidebar { display: none; } }
    article { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .article-head { padding: 32px 32px 24px; border-bottom: 1px solid #f0f0f0; }
    .article-cat { font-size: 12px; font-weight: 700; color: #FF6B35; text-transform: uppercase; margin-bottom: 12px; }
    .article-cat a { color: #FF6B35; text-decoration: none; }
    .article-title { font-size: clamp(20px, 4vw, 28px); font-weight: 900; line-height: 1.4; color: #1a1a1a; margin-bottom: 16px; }
    .article-meta { font-size: 13px; color: #aaa; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .hero-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #f0f0f0; }
    .article-body { padding: 32px; }
    .article-body h2 { font-size: 20px; font-weight: 800; color: #1a1a1a; margin: 32px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #FF6B35; }
    .article-body h3 { font-size: 16px; font-weight: 700; color: #333; margin: 20px 0 10px; }
    .article-body p { margin-bottom: 14px; color: #333; font-size: 15px; }
    .article-body ul, .article-body ol { padding-left: 20px; margin-bottom: 14px; }
    .article-body li { margin-bottom: 6px; color: #333; font-size: 15px; }
    article { min-width: 0; }
    /* 좁은 화면에서는 표만 자기 안에서 가로 스크롤시킨다. min-width:100%가 있어야
       넓은 화면에서 기존처럼 폭을 꽉 채운다. */
    .article-body table { display: block; width: max-content; min-width: 100%; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .article-body th { background: #FF6B35; color: white; padding: 10px 14px; text-align: left; }
    .article-body td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
    .article-body tr:nth-child(even) td { background: #fff8f5; }
    .article-body img { width: 100%; border-radius: 12px; margin: 16px 0; }
    .article-body strong { color: #1a1a1a; }
    .article-body blockquote { background: #fff8f5; border-left: 4px solid #FF6B35; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 16px 0; font-style: italic; color: #555; }
    .article-body a { color: #FF6B35; }
    .tags { padding: 20px 32px; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { background: #fff3ee; color: #FF6B35; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; text-decoration: none; }
    .tag:hover { background: #FF6B35; color: white; }
    .ad-slot { background: #f0f0f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 12px; min-height: 90px; margin: 24px 0; }
    .cta-box { background: linear-gradient(135deg, #FF6B35, #ff8c42); border-radius: 20px; padding: 32px; text-align: center; color: white; margin-top: 24px; }
    .cta-box h3 { font-size: 22px; font-weight: 900; margin-bottom: 10px; }
    .cta-box p { font-size: 14px; opacity: 0.9; line-height: 1.6; margin-bottom: 20px; }
    .cta-box a { background: white; color: #FF6B35; border-radius: 12px; padding: 13px 28px; font-weight: 800; font-size: 15px; text-decoration: none; display: inline-block; }
    .nav-links { display: flex; gap: 16px; margin-top: 24px; }
    .nav-back { color: #FF6B35; text-decoration: none; font-size: 14px; font-weight: 600; }
    .nav-back::before { content: '\\2190 '; }
    .sidebar-cta { background: linear-gradient(135deg, #FF6B35, #ff8c42); color: white; border-radius: 16px; padding: 24px; text-align: center; position: sticky; top: 80px; }
    .sidebar-cta h3 { font-size: 16px; font-weight: 900; margin-bottom: 8px; }
    .sidebar-cta p { font-size: 13px; opacity: 0.9; line-height: 1.5; margin-bottom: 16px; }
    .sidebar-cta a { background: white; color: #FF6B35; border-radius: 8px; padding: 10px 20px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; }
    footer { background: #1a1a1a; color: #888; padding: 40px 20px; margin-top: 60px; }
    .footer-inner { max-width: 1100px; margin: 0 auto; }
    .footer-links { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .footer-links a { color: #888; text-decoration: none; font-size: 13px; }
    .footer-copy { font-size: 12px; }
  </style>
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>${faqLd ? `\n  <script type="application/ld+json">\n${JSON.stringify(faqLd, null, 2)}\n  </script>` : ''}
</head>
<body>

<header>
  <div class="header-inner">
    <a href="/" class="logo">
      <div class="logo-icon">장</div>
      <span class="logo-text">오늘장부</span>
      <span class="logo-sub">블로그</span>
    </a>
    <a href="/" class="header-cta">무료로 시작하기</a>
  </div>
</header>

<div class="wrap">
  <main>
    <div class="nav-links">
      <a href="/blog/" class="nav-back">블로그 목록으로</a>
    </div>

    <!-- 자동 광고(Auto ads)가 배치를 정하므로 유닛을 직접 넣지 않는다. 여백만 확보한다. -->
    <div class="ad-slot"></div>

    <article>
      <div class="article-head">
        <div class="article-cat"><a href="/blog/">${esc(category)}</a></div>
        <h1 class="article-title">${esc(title)}</h1>
        <div class="article-meta">
          <span>오늘장부 편집팀</span>
          <span>${dateKR}</span>
        </div>
      </div>
      <img src="${esc(thumb)}" alt="${esc(title)}" class="hero-img" loading="lazy">
      <div class="article-body">
${body}
      </div>
      <div class="tags">
        ${tagHtml}
      </div>
    </article>
${relatedHtml ? '\n    ' + relatedHtml + '\n' : ''}
    ${toolBoxHtml(category)}

    <!-- 자동 광고(Auto ads)가 배치를 정하므로 유닛을 직접 넣지 않는다. 여백만 확보한다. -->
    <div class="ad-slot"></div>

    <div class="cta-box">
      <h3>매일 매출 기록, 30초면 끝!</h3>
      <p>카드·현금·네이버페이·카카오페이<br>여러 결제수단을 한 화면에서 입력<br>부가세 예상액도 자동으로 계산해드려요</p>
      <a href="/">지금 무료로 시작하기</a>
    </div>
  </main>

  <aside class="sidebar">
    <div class="sidebar-cta">
      <h3>매일 매출 기록,<br>30초면 끝!</h3>
      <p>카드·현금·배달앱 한 번에<br>부가세 예상액도 자동 계산</p>
      <a href="/">무료로 시작하기</a>
    </div>
  </aside>
</div>

<footer>
  <div class="footer-inner">
    <div class="footer-links">
      <a href="/">서비스 홈</a>
      <a href="/blog/">블로그</a>
      <a href="/privacy">개인정보처리방침</a>
      <a href="/terms">이용약관</a>
    </div>
    <div class="footer-copy">© ${y} 오늘장부. All rights reserved.</div>
  </div>
</footer>

</body>
</html>
`
}

// ── 사이트맵 재생성 (정적 URL + 모든 글) ──────────────────────────
function rebuildSitemap(manifest) {
  const urls = [
    `  <url><loc>${SITE}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE}/login</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`,
    `  <url><loc>${SITE}/blog/</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    // 무료 계산기 — public/tools 아래 정적 페이지. 사이트맵을 여기서 통째로 다시 쓰므로
    // 도구를 추가하면 이 목록에도 넣어야 색인된다.
    ...TOOL_PAGES.map(
      (slug) =>
        `  <url><loc>${SITE}/tools/${slug}/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>`
    ),
    ...manifest.map(
      (p) =>
        `  <url><loc>${SITE}/blog/posts/${p.slug}.html</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
  fs.writeFileSync(SITEMAP, xml)
}

// ── 구글 색인 요청 (GOOGLE_INDEXING_SA_KEY 있을 때만, 실패해도 발행엔 영향 없음) ──
async function requestIndexing(url) {
  if (DRY_RUN || !process.env.GOOGLE_INDEXING_SA_KEY) return
  try {
    const { google } = await import('googleapis')
    const sa = JSON.parse(process.env.GOOGLE_INDEXING_SA_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials: sa,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })
    const client = await auth.getClient()
    await client.request({
      url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
      method: 'POST',
      data: { url, type: 'URL_UPDATED' },
    })
    console.log(`구글 색인 요청 완료: ${url}`)
  } catch (err) {
    console.warn(`구글 색인 요청 실패(무시): ${err.message}`)
  }
}

// ── IndexNow (네이버·Bing 즉시 통보; 키는 공개값이라 시크릿 불필요, 실패해도 무시) ──
const INDEXNOW_KEY = '6a0955fc5b1f45db0a7ebfee87e7cbba'
async function submitIndexNow(url) {
  if (DRY_RUN) return
  const host = 'www.xn--wh1bw0st1gbrb.kr'
  const wwwUrl = url.replace('https://xn--', 'https://www.xn--')
  const body = JSON.stringify({
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: [wwwUrl],
  })
  for (const ep of ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
      })
      console.log(`IndexNow ${ep}: ${r.status}`)
    } catch (err) {
      console.warn(`IndexNow ${ep} 실패(무시): ${err.message}`)
    }
  }
}

// ── 대표 이미지 (PEXELS_API_KEY 있으면 주제 사진, 없으면 Picsum 고유 사진) ──
// loremflickr는 태그 미매칭 시 동일한 기본이미지를 반환(사진 중복 원인)해서 폐기.
async function resolveThumb(imageQuery, slug) {
  const key = process.env.PEXELS_API_KEY
  if (key) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(imageQuery)}&per_page=20&orientation=landscape`,
        { headers: { Authorization: key } }
      )
      if (res.ok) {
        const photos = (await res.json()).photos || []
        if (photos.length) {
          let h = 0
          for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
          return photos[h % photos.length].src.landscape
        }
      }
    } catch (err) {
      console.warn(`Pexels 실패, Picsum 폴백: ${err.message}`)
    }
  }
  // 폴백: Picsum — 슬러그 시드로 글마다 고유·안정 (키 불필요)
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/940/650`
}

// ── 메인 ─────────────────────────────────────────────────────────
let slugGlobal = 'post'
async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  const kw = pickKeyword(manifest)
  if (!kw) {
    console.log(
      '키워드 풀의 모든 주제를 이미 다뤘습니다 — 재탕을 피하기 위해 발행하지 않습니다.\n' +
        'blogbot/keywords.js 에 새 주제를 추가하세요.'
    )
    return
  }
  console.log(`키워드: ${kw.keyword} (${kw.category})${DRY_RUN ? ' [DRY RUN]' : ''}`)

  let post
  if (DRY_RUN) {
    post = {
      title: `[테스트] ${kw.keyword}`,
      slug: `test-${kw.imageQuery.split(' ').join('-')}`,
      description: `${kw.keyword} 관련 드라이런 테스트 글입니다. 실제 발행 시 Claude가 본문을 생성합니다.`,
      tags: [kw.category, '테스트'],
      body: `<h2>드라이런 테스트</h2><p>이 글은 <strong>--dry-run</strong> 으로 생성된 테스트 본문입니다. 파일 생성·매니페스트·사이트맵 동작을 확인하기 위한 것입니다.</p><h3>확인 항목</h3><ul><li>글 HTML 파일 생성</li><li>매니페스트 prepend</li><li>사이트맵 갱신</li></ul><p>실제 발행 글은 <a href="${SITE_KR}">오늘장부</a> 를 자연스럽게 안내합니다.</p>`,
    }
  } else {
    post = await generatePost(kw)
  }

  // 정규화
  const title = (post.title || kw.keyword).trim()
  const description = (post.description || '').trim()
  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 6) : []
  const body = post.body || `<p>${esc(title)}</p>`
  const category = kw.category // 카테고리는 키워드에 고정 (탭과 일치 보장)

  slugGlobal = uniqueSlug(sanitizeSlug(post.slug || title))
  const thumb = await resolveThumb(kw.imageQuery, slugGlobal)

  console.log(`글: ${title}`)
  console.log(`slug: ${slugGlobal}`)

  // 관련 글(같은 섹션 우선, 그다음 최근) — 내부링크 SEO
  const related = [
    ...manifest.filter((p) => p.category === category),
    ...manifest.filter((p) => p.category !== category),
  ]
    .slice(0, 4)
    .map((p) => ({ slug: p.slug, title: p.title }))

  // 1) 글 HTML 작성
  fs.mkdirSync(POSTS_DIR, { recursive: true })
  const html = renderPostHtml({ title, description, body, category, tags, thumb, related })
  fs.writeFileSync(path.join(POSTS_DIR, `${slugGlobal}.html`), html)

  // 2) 매니페스트 prepend
  // keyword를 남겨야 다음 실행이 같은 주제를 다시 고르지 않는다.
  manifest.unshift({
    slug: slugGlobal, title, description, category,
    date: dateISO, thumb, tags, keyword: kw.keyword,
  })
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  // 3) 사이트맵 갱신
  rebuildSitemap(manifest)

  // 4) 구글 색인 요청 (베스트에포트 — 키 없거나 실패해도 발행은 정상)
  await requestIndexing(`${SITE}/blog/posts/${slugGlobal}.html`)

  // 5) IndexNow — 네이버·Bing 즉시 통보
  await submitIndexNow(`${SITE}/blog/posts/${slugGlobal}.html`)

  console.log(`완료: /blog/posts/${slugGlobal}.html (총 ${manifest.length}개 글)`)
}

main().catch((err) => {
  console.error('오류:', err.message)
  process.exit(1)
})
