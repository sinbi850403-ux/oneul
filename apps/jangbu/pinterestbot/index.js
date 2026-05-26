import Anthropic from '@anthropic-ai/sdk'
import { keywords } from '../adbot/keywords.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const PINTEREST_TOKEN = process.env.PINTEREST_ACCESS_TOKEN
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID

// 12시간 슬롯 (다른 봇들과 다른 오프셋)
function pickKeyword() {
  const totalSlots = Math.floor(Date.now() / (1000 * 60 * 60 * 12))
  const index = (totalSlots + 17) % keywords.length
  return keywords[index]
}

function getImageUrl(query, width = 1000, height = 1500) {
  const tag = query.replace(/\s+/g, ',')
  return `https://loremflickr.com/${width}/${height}/${tag}`
}

// Claude로 Pinterest 핀 설명 생성
async function generatePin(keyword) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Pinterest 핀 설명을 작성해주세요.

키워드: "${keyword}"
앱: 오늘장부 (https://xn--wh1bw0st1gbrb.kr) - 소상공인 일매출 기록 앱

조건:
1. 제목: 키워드 포함, 20자 이내, 흥미롭게
2. 설명: 150~200자, 실용적이고 유익한 내용
3. 소상공인/매출/세금 관련일 때만 오늘장부 자연스럽게 언급
4. 해시태그 5개 포함 (#소상공인 #매출관리 등 관련 태그)

응답 형식 (JSON):
{
  "title": "제목",
  "description": "설명 + 해시태그"
}`
    }]
  })

  const text = message.content[0].text
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
    return {
      title: json.title || keyword,
      description: json.description || text,
    }
  } catch {
    return { title: keyword, description: text }
  }
}

// Pinterest API v5로 핀 생성
async function postToPinterest(title, description, imageUrl) {
  const resp = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINTEREST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      title,
      description,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
      link: 'https://xn--wh1bw0st1gbrb.kr',
    }),
  })

  const data = await resp.json()
  if (!resp.ok) throw new Error(data.message || JSON.stringify(data))
  return `https://pinterest.com/pin/${data.id}`
}

async function main() {
  try {
    const { keyword, imageQuery } = pickKeyword()
    console.log(`키워드: ${keyword}`)

    const { title, description } = await generatePin(keyword)
    console.log(`핀 생성: ${title}`)

    const imageUrl = getImageUrl(imageQuery)
    const pinUrl = await postToPinterest(title, description, imageUrl)
    console.log(`핀 업로드 완료: ${pinUrl}`)
  } catch (err) {
    console.error('오류:', err.message)
    process.exit(1)
  }
}

main()
