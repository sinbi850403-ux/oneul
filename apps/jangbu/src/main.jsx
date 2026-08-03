import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 서비스워커는 앱을 열 때 등록한다. 예전에는 알림을 켤 때(usePush)만 등록해서,
// 알림을 안 켠 사장님에게는 서비스워커 자체가 없었다 — 오프라인도, 홈 화면
// 설치도 그 상태로는 동작하지 않는다.
// 첫 화면 렌더를 늦추지 않도록 load 이후로 미룬다.
if ('serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 오프라인·설치는 부가 기능이다. 실패해도 앱은 그대로 쓸 수 있어야 한다.
    })
  }
  // load 를 무조건 기다리면 안 된다. 모듈 실행이 load 보다 늦으면 이벤트가
  // 이미 지나가 리스너가 영영 안 불린다(실제로 그래서 등록이 안 됐다).
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
