/**
 * /blog/ 대문에 크롤러가 따라갈 수 있는 정적 링크를 심는다.
 *
 * 왜 필요한가: 대문은 blog-manifest.json 을 fetch 해서 카드를 그리고, 페이지 넘김도
 * onclick 이라 원본 HTML 에는 글 링크가 한 개도 없었다. 그래서 글에 닿는 경로가
 * 사이트맵뿐이었고 — 사이트맵은 "여기 주소가 있다"고 알려줄 뿐 링크 점수를 주지
 * 않는다 — 서치콘솔에 "발견됨, 현재 색인이 생성되지 않음"이 쌓였다.
 *
 * 두 곳을 채운다.
 *  1) 최신 글 카드 — JS 가 로드되면 같은 내용으로 덮어쓰므로 화면은 그대로다.
 *  2) 전체 글 목록 — 카테고리별 <details>. 사람에게도 쓸모 있는 목차이고,
 *     크롤러에게는 180개 글로 가는 유일한 링크 경로다.
 *
 * blogbot 이 글을 발행할 때마다 자동으로 호출된다. 수동 실행도 된다.
 *   node scripts/rebuild-blog-index.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BLOG_DIR = path.resolve(__dirname, '../public/blog')
const INDEX_HTML = path.join(BLOG_DIR, 'index.html')
const MANIFEST = path.join(BLOG_DIR, 'blog-manifest.json')

// 대문 JS 의 POSTS_PER_PAGE 와 같아야 로드 전후 화면이 안 튄다.
const LATEST_COUNT = 9

// 카테고리 탭과 같은 순서. 여기 없는 카테고리는 뒤에 알파벳순으로 붙는다.
const CATEGORY_ORDER = [
  '매출관리', '부가세/세금', '절세꿀팁', '배달앱', '카드수수료', '사업자등록', '직원관리',
]

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fmtDate = (d) => (d ? String(d).replace(/-/g, '.') : '')

function latestCardsHtml(posts) {
  return posts
    .slice(0, LATEST_COUNT)
    .map(
      (p) => `      <a href="/blog/posts/${p.slug}.html" class="post-card">
        ${
          p.thumb
            ? `<img src="${esc(p.thumb)}" alt="${esc(p.title)}" class="post-thumb" loading="lazy">`
            : `<div class="post-thumb" style="background:linear-gradient(135deg,#FF6B35,#ff8c42)"></div>`
        }
        <div class="post-body">
          <div class="post-cat">${esc(p.category || '자영업')}</div>
          <div class="post-title">${esc(p.title)}</div>
          <div class="post-desc">${esc(p.description || '')}</div>
          <div class="post-date">${fmtDate(p.date)}</div>
        </div>
      </a>`
    )
    .join('\n')
}

function archiveHtml(posts) {
  const byCat = new Map()
  for (const p of posts) {
    const cat = p.category || '자영업'
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat).push(p)
  }

  const cats = [...byCat.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b, 'ko')
  })

  const sections = cats
    .map((cat) => {
      const items = byCat
        .get(cat)
        .map(
          (p) =>
            `        <li><a href="/blog/posts/${p.slug}.html">${esc(p.title)}</a> <span class="archive-date">${fmtDate(p.date)}</span></li>`
        )
        .join('\n')
      return `    <details class="archive-cat">
      <summary>${esc(cat)} <span class="archive-count">${byCat.get(cat).length}</span></summary>
      <ul>
${items}
      </ul>
    </details>`
    })
    .join('\n')

  return `  <h2 class="archive-title">전체 글 ${posts.length}개</h2>
${sections}`
}

function replaceBlock(html, name, body) {
  const start = `<!-- BLOGBOT:${name}:START -->`
  const end = `<!-- BLOGBOT:${name}:END -->`
  const re = new RegExp(`${start}[\\s\\S]*?${end}`)
  if (!re.test(html)) throw new Error(`${INDEX_HTML} 에 ${start} … ${end} 표시가 없다`)
  return html.replace(re, `${start}\n${body}\n${end}`)
}

export function rebuildBlogIndex() {
  const posts = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)))

  let html = fs.readFileSync(INDEX_HTML, 'utf8')
  html = replaceBlock(html, 'LATEST', latestCardsHtml(posts))
  html = replaceBlock(html, 'ARCHIVE', archiveHtml(posts))
  fs.writeFileSync(INDEX_HTML, html)
  return posts.length
}

// 직접 실행했을 때만 돈다. blogbot 은 import 해서 쓴다.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const n = rebuildBlogIndex()
  console.log(`/blog/ 대문 정적 링크 갱신 완료 — 글 ${n}개`)
}
