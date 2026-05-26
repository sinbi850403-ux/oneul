import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'
import { keywords } from './keywords.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 하루 2회 (오전/오후) 키워드 순환 - 12시간 단위 슬롯으로 순환
function pickKeyword() {
  const totalSlots = Math.floor(Date.now() / (1000 * 60 * 60 * 12))
  const index = totalSlots % keywords.length
  return keywords[index]
}

// loremflickr 이미지 URL 생성 (키워드 기반, 직접 URL, API 키 불필요)
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
3. 키워드가 소상공인/매출/세금 관련일 때만 오늘장부를 자연스럽게 1~2회 언급 (다른 주제엔 언급 생략)
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

// Google Blogger에 포스팅
async function postToBlogger(title, content, imageUrl) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })

  const blogger = google.blogger({ version: 'v3', auth })

  const imageHtml = `<img src="${imageUrl}" alt="${title}" style="width:100%;border-radius:8px;margin-bottom:20px;" />`
  const fullContent = imageHtml + content

  const res = await blogger.posts.insert({
    blogId: process.env.BLOGGER_BLOG_ID,
    requestBody: {
      title,
      content: fullContent,
    },
  })

  return res.data.url
}

// Google Indexing API로 URL 색인 요청
async function requestIndexing(url) {
  if (!process.env.GOOGLE_INDEXING_SA_KEY) return  // SA 키 없으면 스킵
  try {
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
    console.log(`🔍 색인 요청 완료: ${res.data.urlNotificationMetadata?.url}`)
  } catch (err) {
    console.warn(`⚠️  색인 요청 실패 (무시): ${err.message}`)
  }
}

// 메인 실행
async function main() {
  try {
    const { keyword, imageQuery } = pickKeyword()
    console.log(`📝 키워드: ${keyword}`)

    const { title, content } = await generatePost(keyword)
    console.log(`✅ 글 생성 완료: ${title}`)

    const imageUrl = getImageUrl(imageQuery)
    console.log(`🖼️  이미지: ${imageUrl}`)

    const postUrl = await postToBlogger(title, content, imageUrl)
    console.log(`🚀 포스팅 완료: ${postUrl}`)

    await requestIndexing(postUrl)
  } catch (err) {
    console.error('❌ 오류:', err.message)
    process.exit(1)
  }
}

main()
