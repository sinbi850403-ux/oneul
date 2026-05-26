import { useEffect } from 'react'

// Google AdSense 광고 배너 컴포넌트
// AdSense 승인 후 data-ad-client, data-ad-slot 값 입력
const AD_CLIENT = 'ca-pub-2764893290310463'
const AD_SLOT = '' // 승인 후 광고 단위 슬롯 ID 입력

export default function AdBanner({ className = '' }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle && AD_SLOT) {
        window.adsbygoogle.push({})
      }
    } catch (e) {
      // 광고 로드 실패 시 무시
    }
  }, [])

  if (!AD_SLOT) return null // 슬롯 ID 없으면 광고 미노출

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
