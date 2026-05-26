// PWA 아이콘 및 OG 이미지 생성 스크립트
// 실행: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { mkdirSync } from 'fs'

mkdirSync('./public/icons', { recursive: true })

// 앱 아이콘 SVG
const iconSvg = readFileSync('./public/icons/icon.svg')

// OG 이미지 SVG (1200x630)
const ogSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FF6B35"/>
  <rect x="60" y="60" width="1080" height="510" rx="32" fill="white" opacity="0.12"/>
  <text x="600" y="240" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">오늘장부</text>
  <text x="600" y="340" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" opacity="0.95">1인 소상공인을 위한 무료 일매출 기록 앱</text>
  <text x="600" y="420" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" opacity="0.8">카드 · 현금 · 네이버페이 · 카카오페이 한 번에</text>
  <rect x="440" y="480" width="320" height="72" rx="36" fill="white"/>
  <text x="600" y="527" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#FF6B35" text-anchor="middle">무료로 시작하기</text>
</svg>
`)

console.log('🎨 아이콘 생성 중...')

await Promise.all([
  sharp(iconSvg).resize(192, 192).png().toFile('./public/icons/icon-192.png').then(() => console.log('✅ icon-192.png')),
  sharp(iconSvg).resize(512, 512).png().toFile('./public/icons/icon-512.png').then(() => console.log('✅ icon-512.png')),
  sharp(ogSvg).resize(1200, 630).png().toFile('./public/icons/og-image.png').then(() => console.log('✅ og-image.png')),
])

console.log('🚀 완료!')
