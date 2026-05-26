import Anthropic from '@anthropic-ai/sdk'
import { keywords } from '../adbot/keywords.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const WP_TOKEN = process.env.WP_ACCESS_TOKEN
const WP_SITE = process.env.WP_SITE_ID  // oneuljangb.wordpress.com

// 12시간 슬롯 순환 (adbot과 다른 오프셋으로 다른 키워드 사용)
function pickKeyword() {
  const totalSlots = Math.floor(Date.now() / (1000 * 60 * 60 * 12))
  const index = (totalSlots + 29) % keywords.length  // adbot과 다른 오프셋
  return keywords[index]
}

// 이미지 URL 생성
function getImageUrl(query, width = 800, height = 450) {
  const tag = query.replace(/\s+/g, ',')
  return `https://loremflickr.com/${width}/${height}/${tag}`
}

// Claude로 블로그 글 생성
async function generatePost(keyword) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `당신은 한국 독자를 위한 실용적인 블로그 글을 쓰는 전문 작가입니다.

키워드: "${keyword}"
앱 이름: 오늘장부 (https://xn--wh1bw0st1gbrb.kr) - 소상공인 일매출 기록 앱

다음 조건을 지켜서 블로그 글을 HTML 형식으로 작성해주세요:
1. 제목은 키워드를 포함한 흥미로운 제목 (30자 이내)
2. 본문 800~1200자, 독자에게 실제로 유용한 실용적인 내용
3. 키워드가 소상공인/매출/세금 관련일 때만 오늘장부를 자연스럽게 1~2회 언급
4. SEO를 위해 키워드를 제목과 본문에 자연스럽게 포함
5. HTML 태그 사용: <h2>, <p>, <ul>, <li>, <strong> 등
6. 소상공인/매출 관련 글에만 마지막에 링크 포함: <a href="https://xn--wh1bw0st1gbrb.kr">오늘장부 무료로 시작하기</a>

응답 형식 (JSON):
{
  "title": "제목",
  "content": "HTML 본문 전체"
}`
    }]
  })

  const text = message.content[0].text
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
    return {
      title: json.title || keyword,
      content: json.content || `<p>${text}</p>`
    }
  } catch {
    return { title: keyword, content: `<p>${text}</p>` }
  }
}

// WordPress.com에 포스팅
async function postToWordPress(title, content, imageUrl) {
  const imageHtml = `<img src="${imageUrl}" alt="${title}" style="width:100%;border-radius:8px;margin-bottom:20px;" />`
  const fullContent = imageHtml + content

  const resp = await fetch(`https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE}/posts/new`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content: fullContent,
      status: 'publish',
    }),
  })

  const data = await resp.json()
  if (!resp.ok) throw new Error(data.message || JSON.stringify(data))
  return data.URL
}

// Google Indexing API로 URL 색인 요청
async function requestIndexing(url) {
  if (!process.env.GOOGLE_INDEXING_SA_KEY) return
  try {
    const { google } = await import('googleapis')
    const saKey = JSON.parse(process.env.GOOGLE_INDEXING_SA_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials: saKey,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })
    const client = await auth.getClient()
    const res = await client.request({
      url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
      method: 'POST',
      data: { url, type: 'URL_UPDATED' },
    })
    console.log(`색인 요청 완료: ${res.data.urlNotificationMetadata?.url}`)
  } catch (err) {
    console.warn(`색인 요청 실패 (무시): ${err.message}`)
  }
}

// 메인 실행
async function main() {
  try {
    const { keyword, imageQuery } = pickKeyword()
    console.log(`키워드: ${keyword}`)

    const { title, content } = await generatePost(keyword)
    console.log(`글 생성 완료: ${title}`)

    const imageUrl = getImageUrl(imageQuery)
    const postUrl = await postToWordPress(title, content, imageUrl)
    console.log(`포스팅 완료: ${postUrl}`)

    await requestIndexing(postUrl)
  } catch (err) {
    console.error('오류:', err.message)
    process.exit(1)
  }
}

main()
