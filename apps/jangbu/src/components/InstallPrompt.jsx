import { useEffect, useState } from 'react'

// 홈 화면 설치 안내 배너.
//
// 매니페스트·아이콘·서비스워커는 진작 갖춰져 있었지만 안내가 없어서, 사장님이
// 브라우저 메뉴에서 '홈 화면에 추가'를 직접 찾아야 했다. 대부분 모른다.
// 아이폰은 홈 화면에 추가한 경우에만 웹 푸시가 오므로 더 중요하다.

const SNOOZE_KEY = 'install-banner-snoozed-at'
const SNOOZE_DAYS = 14

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function snoozed() {
  const at = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
  return Date.now() - at < SNOOZE_DAYS * 86400000
}

export default function InstallPrompt() {
  // 안드로이드·크롬은 beforeinstallprompt 로 설치를 띄울 수 있고,
  // iOS 는 그런 API 가 없어서 직접 하는 방법을 알려주는 수밖에 없다.
  const [deferred, setDeferred] = useState(null)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    if (isStandalone() || snoozed()) return

    function onBeforeInstall(e) {
      e.preventDefault() // 브라우저 기본 배너를 막고 우리 UI 로 대체
      // 마운트 때만 검사하면, '나중에'로 닫은 뒤 이벤트가 한 번 더 올 때
      // 스누즈를 무시하고 다시 뜬다. 받을 때마다 확인한다.
      if (snoozed()) return
      setDeferred(e)
    }
    function onInstalled() {
      setDeferred(null)
      setShowIOS(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    if (isIOS()) setShowIOS(true)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    setDeferred(null)
    setShowIOS(false)
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice // 수락/거절 어느 쪽이든 이 이벤트는 재사용 못 한다
    setDeferred(null)
  }

  if (!deferred && !showIOS) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-warm border border-stone-100 p-4 pointer-events-auto">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-800">홈 화면에 추가하기</p>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
              {showIOS
                ? '아래 공유 버튼을 누르고 "홈 화면에 추가"를 선택하세요. 알림도 그때부터 받을 수 있어요.'
                : '주소창 없이 앱처럼 열리고, 매출 입력 알림도 받을 수 있어요.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-stone-500"
          >
            나중에
          </button>
          {deferred && (
            <button
              onClick={install}
              className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:opacity-80"
            >
              추가하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
