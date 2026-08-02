/* 오늘장부 방문자 분석 — GA4 + Microsoft Clarity + 네이버 애널리틱스
 *
 * 이 파일 하나만 고치면 앱·블로그·모든 블로그 글에 동시 반영된다.
 * (각 페이지는 <script defer src="/analytics.js"></script> 한 줄만 넣는다)
 *
 * ┌─ ID 넣는 법 ───────────────────────────────────────────────
 * │ GA4      analytics.google.com → 관리 → 데이터 스트림 → 웹 스트림 추가
 * │          → 측정 ID 'G-XXXXXXXXXX' 복사
 * │ Clarity  clarity.microsoft.com → New project → 프로젝트 ID 복사
 * │ 네이버    searchadvisor.naver.com 에서 사이트 등록 후
 * │          네이버 애널리틱스(analytics.naver.com) → 사이트 등록 → 등록 ID 복사
 * └────────────────────────────────────────────────────────────
 * 빈 문자열로 두면 해당 도구는 로드되지 않는다(에러 없음). 하나씩 채워도 된다.
 */
var GA4_ID = 'G-L5ML58DZ05'
var CLARITY_ID = 'xvzhgeccu8'
var NAVER_ID = '1a2b9e9892ddbb0'

/* Clarity는 화면을 그대로 녹화한다. 로그인한 앱 화면에는 사장님의 실제 매출
 * 금액이 떠 있으므로 공개 콘텐츠(/blog)에서만 켠다. 이 줄을 지우지 말 것. */
var CLARITY_ONLY_ON_BLOG = true

;(function () {
  // 로컬 개발·프리뷰 트래픽이 통계를 오염시키지 않게 한다.
  var host = location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return

  var isBlog = location.pathname.indexOf('/blog') === 0

  // ── GA4 ──────────────────────────────────────────────────
  // SPA 라우트 이동은 GA4 향상된 측정의 '브라우저 기록 변경'이 자동 수집한다.
  if (GA4_ID) {
    var s = document.createElement('script')
    s.async = true
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID
    document.head.appendChild(s)

    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', GA4_ID)
  }

  // ── Microsoft Clarity (블로그 전용) ────────────────────────
  if (CLARITY_ID && (isBlog || !CLARITY_ONLY_ON_BLOG)) {
    ;(function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
    })(window, document, 'clarity', 'script', CLARITY_ID)
  }

  // ── 네이버 애널리틱스 ──────────────────────────────────────
  // wcslog.js가 wcs_do를 정의하므로 로드 완료 후에 호출해야 한다.
  if (NAVER_ID) {
    var n = document.createElement('script')
    n.async = true
    n.src = 'https://wcs.pstatic.net/wcslog.js'
    n.onload = function () {
      if (!window.wcs) return
      window.wcs_add = window.wcs_add || {}
      window.wcs_add['wa'] = NAVER_ID
      window.wcs_do()
    }
    document.head.appendChild(n)
  }
})()
