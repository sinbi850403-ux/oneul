/**
 * 글 본문의 "관련 글" 링크가 옛 슬러그를 가리키는 것을 최종 주소로 바꾼다.
 *
 * 왜 필요한가: 관련 글 링크는 글을 쓰는 시점의 manifest 로 만든다. 나중에 그 글이
 * 중복 정리로 삭제되고 vercel.json 에 리다이렉트만 남으면, 이미 발행된 글들의
 * 링크는 옛 슬러그를 그대로 가리킨 채 남는다. 크롤러는 그때마다 308 을 한 번 더
 * 타야 하고, 링크 점수도 리다이렉트에서 새는데, 정작 사이트맵에는 최종 주소만
 * 들어 있어 서치콘솔에는 "리디렉션이 포함된 페이지"로만 보인다.
 *
 * 중복 정리를 한 뒤에 실행하면 된다.
 *   node scripts/fix-internal-links.mjs [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POSTS_DIR = path.resolve(__dirname, '../public/blog/posts')
const VERCEL_JSON = path.resolve(__dirname, '../vercel.json')

const dryRun = process.argv.includes('--dry-run')

// vercel.json 의 리다이렉트에서 옛 슬러그 → 새 슬러그 표를 만든다.
const { redirects = [] } = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'))
const moved = new Map()
for (const r of redirects) {
  if (!r.source.startsWith('/blog/posts/') || !r.destination.startsWith('/blog/posts/')) continue
  moved.set(r.source, r.destination)
}

// 리다이렉트가 여러 단계로 이어질 수 있다(A→B, B→C). 최종 주소까지 따라간다.
function resolveFinal(url) {
  const seen = new Set()
  let cur = url
  while (moved.has(cur) && !seen.has(cur)) {
    seen.add(cur)
    cur = moved.get(cur)
  }
  return cur
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.html'))
const exists = new Set(files.map((f) => `/blog/posts/${f}`))

let changedFiles = 0
let changedLinks = 0
const dangling = new Set()

for (const file of files) {
  const full = path.join(POSTS_DIR, file)
  const before = fs.readFileSync(full, 'utf8')
  let hits = 0

  const after = before.replace(/href="(\/blog\/posts\/[^"]+\.html)"/g, (m, url) => {
    const final = resolveFinal(url)
    if (!exists.has(final)) dangling.add(final)
    if (final === url) return m
    hits++
    return `href="${final}"`
  })

  if (hits) {
    changedFiles++
    changedLinks += hits
    if (!dryRun) fs.writeFileSync(full, after)
    console.log(`${dryRun ? '[dry] ' : ''}${file} — 링크 ${hits}개`)
  }
}

console.log(`\n글 ${changedFiles}개에서 링크 ${changedLinks}개 정리${dryRun ? ' 예정' : ' 완료'}`)
if (dangling.size) {
  console.log('\n⚠ 파일도 리다이렉트도 없는 링크(수동 확인 필요):')
  for (const d of dangling) console.log('  ' + d)
  process.exitCode = 1
}
