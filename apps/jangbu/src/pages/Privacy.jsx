import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="text-2xl font-bold text-brand">오늘장부</button>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-gray-600">← 뒤로</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 bg-white mt-6 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 25일</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">1. 수집하는 개인정보 항목</h2>
            <p>오늘장부(이하 "서비스")는 최소한의 정보만 수집합니다.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>이메일 주소 (회원가입 및 로그인용)</li>
              <li>가게 이름, 과세 유형 (사용자가 직접 입력한 경우)</li>
              <li>일매출 데이터 (사용자가 직접 입력한 내용)</li>
            </ul>
            <p className="mt-2 text-sm text-gray-500">이름, 전화번호, 주민등록번호 등 기타 개인정보는 수집하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>회원 식별 및 로그인 서비스 제공</li>
              <li>매출 데이터 저장 및 조회 서비스 제공</li>
              <li>서비스 관련 공지 및 문의 응대</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">3. 개인정보 보유 및 이용 기간</h2>
            <p className="text-sm">회원 탈퇴 시 즉시 모든 개인정보 및 매출 데이터를 삭제합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">4. 개인정보 제3자 제공</h2>
            <p className="text-sm">오늘장부는 사용자의 개인정보 및 매출 데이터를 제3자에게 제공하지 않습니다.</p>
            <p className="mt-2 text-sm">서비스 운영을 위해 아래 업체의 서비스를 이용합니다.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>Supabase Inc. — 데이터베이스 및 인증 서비스 (미국)</li>
              <li>Google LLC — 광고 서비스(AdSense), 클라우드 서비스 (미국)</li>
              <li>Vercel Inc. — 웹 호스팅 서비스 (미국)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">5. 광고 서비스 안내</h2>
            <p className="text-sm">본 서비스는 Google AdSense를 통한 광고를 표시합니다. Google은 쿠키를 사용하여 사용자의 관심사에 맞는 광고를 표시할 수 있습니다. 사용자의 매출 데이터는 광고 목적으로 사용되지 않습니다.</p>
            <p className="mt-2 text-sm">광고 개인화를 원하지 않으실 경우 <a href="https://www.google.com/settings/ads" className="text-brand underline" target="_blank" rel="noreferrer">Google 광고 설정</a>에서 변경하실 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">6. 쿠키(Cookie) 사용</h2>
            <p className="text-sm">서비스는 로그인 상태 유지 및 광고 서비스(Google AdSense)를 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">7. 이용자의 권리</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>언제든지 서비스 내 '회원 탈퇴'를 통해 모든 데이터를 삭제할 수 있습니다.</li>
              <li>개인정보 열람, 정정, 삭제를 아래 이메일로 요청하실 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">8. 개인정보 보호 책임자</h2>
            <ul className="text-sm space-y-1">
              <li>서비스명: 오늘장부</li>
              <li>문의 이메일: sinbi850403@gmail.com</li>
            </ul>
          </section>

        </div>
      </div>

      <footer className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
        © 2026 오늘장부
      </footer>
    </div>
  )
}
