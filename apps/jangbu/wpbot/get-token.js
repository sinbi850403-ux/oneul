import http from 'http'

const CLIENT_ID = process.env.WP_CLIENT_ID
const CLIENT_SECRET = process.env.WP_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3000'

const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`

console.log('\n아래 URL을 브라우저에서 열어주세요:\n')
console.log(authUrl)
console.log('\n승인 대기 중...\n')

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT_URI).searchParams.get('code')
  if (!code) { res.end('코드 없음'); return }

  res.end('<h2>완료! 터미널을 확인하세요.</h2>')
  server.close()

  // 코드 → 액세스 토큰 교환
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
    grant_type: 'authorization_code',
  })

  const resp = await fetch('https://public-api.wordpress.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await resp.json()

  console.log('\nWP_ACCESS_TOKEN (GitHub Secrets에 저장하세요):')
  console.log(data.access_token)
  console.log('\n블로그 URL:')
  console.log(data.blog_url)
})

server.listen(3000)
