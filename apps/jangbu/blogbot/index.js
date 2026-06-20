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

// ── 키워드 선택 ──────────────────────────────────────────────────
// 우선순위: --kw=<번호|문자열>(수동) → --category=<섹션>(섹션 내 날짜 순환) → 전체 날짜 순환
function pickKeyword() {
  const dayNum = Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000)
  const arg = (name) => {
    const a = process.argv.find((x) => x.startsWith(name))
    return a ? a.slice(name.length) : null
  }
  const kw = arg('--kw=')
  if (kw) {
    const idx = Number(kw)
    if (Number.isInteger(idx) && keywords[idx]) return keywords[idx]
    const found = keywords.find((k) => k.keyword.includes(kw) || k.category === kw)
    if (found) return found
  }
  const cat = arg('--category=')
  if (cat) {
    const pool = keywords.filter((k) => k.category === cat)
    if (pool.length) return pool[dayNum % pool.length] // 섹션 내 4개를 4일 주기로 순환
  }
  return keywords[dayNum % keywords.length]
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

  const tools = [{ type: 'web_search_20260209', name: 'web_search' }]
  let messages = [{ role: 'user', content: prompt }]
  let resp

  // web_search 서버 루프가 한도에 도달하면 pause_turn → 이어서 재요청
  for (let turn = 0; turn < 6; turn++) {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 20000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      tools,
      messages,
    })
    resp = await stream.finalMessage()
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
function renderPostHtml({ title, description, body, category, tags, thumb }) {
  const url = `${SITE}/blog/posts/${slugGlobal}.html`
  const tagHtml = (tags || [])
    .map((t) => `<a href="/blog/?tag=${encodeURIComponent(t)}" class="tag">${esc(t)}</a>`)
    .join(' ')
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
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px; display: grid; grid-template-columns: 1fr 300px; gap: 40px; }
    @media (max-width: 768px) { .wrap { grid-template-columns: 1fr; } .sidebar { display: none; } }
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
    .article-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
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
  </script>
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

    <div class="ad-slot">광고 영역 (AdSense 승인 후 활성화)</div>

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

    <div class="ad-slot">광고 영역 (AdSense 승인 후 활성화)</div>

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

// ── 메인 ─────────────────────────────────────────────────────────
let slugGlobal = 'post'
async function main() {
  const kw = pickKeyword()
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
  const tag = kw.imageQuery.trim().split(/\s+/).join(',')
  const thumb = `https://loremflickr.com/940/650/${tag}?lock=${seedFromSlug(slugGlobal)}`

  console.log(`글: ${title}`)
  console.log(`slug: ${slugGlobal}`)

  // 1) 글 HTML 작성
  fs.mkdirSync(POSTS_DIR, { recursive: true })
  const html = renderPostHtml({ title, description, body, category, tags, thumb })
  fs.writeFileSync(path.join(POSTS_DIR, `${slugGlobal}.html`), html)

  // 2) 매니페스트 prepend
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  manifest.unshift({ slug: slugGlobal, title, description, category, date: dateISO, thumb, tags })
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  // 3) 사이트맵 갱신
  rebuildSitemap(manifest)

  console.log(`완료: /blog/posts/${slugGlobal}.html (총 ${manifest.length}개 글)`)
}

main().catch((err) => {
  console.error('오류:', err.message)
  process.exit(1)
})
