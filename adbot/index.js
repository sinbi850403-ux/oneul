import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'
import { keywords } from './keywords.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 오늘 날짜 기준으로 키워드 순환
function pickKeyword() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return keywords[dayOfYear % keywords.length]
}

// Picsum 무료 이미지 URL 생성 (키워드 기반 시드로 일관성 유지)
function getImageUrl(query, width = 800, height = 450) {
  const seed = encodeURIComponent(query).slice(0, 20)
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}

// Claude로 블로그 글 생성
async function generatePost(keyword) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `당신은 소상공인을 위한 실용적인 블로그 글을 쓰는 전문 작가입니다.

키워드: "${keyword}"
앱 이름: 오늘장부 (https://xn--wh1bw0st1gbrb.kr)

다음 조건을 지켜서 블로그 글을 HTML 형식으로 작성해주세요:
1. 제목은 키워드를 포함한 실용적인 제목 (30자 이내)
2. 본문 800~1200자, 소상공인이 실제로 유용하다고 느낄 실용적인 내용
3. 오늘장부를 자연스럽게 1~2회만 언급 (광고 티 나지 않게)
4. SEO를 위해 키워드를 제목과 본문에 자연스럽게 포함
5. HTML 태그 사용: <h2>, <p>, <ul>, <li>, <strong> 등
6. 마지막에 오늘장부 링크 포함: <a href="https://xn--wh1bw0st1gbrb.kr">오늘장부 무료로 시작하기</a>

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
    return json
  } catch {
    return { title: keyword, content: text }
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
  } catch (err) {
    console.error('❌ 오류:', err.message)
    process.exit(1)
  }
}

main()
