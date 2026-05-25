import { useNavigate } from 'react-router-dom'

function Section({ children, className = '' }) {
  return (
    <section className={`px-6 py-16 max-w-4xl mx-auto ${className}`}>
      {children}
    </section>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

function TrustItem({ icon, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="text-2xl mt-0.5">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-0.5">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand">오늘장부</h1>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-500 hover:text-brand transition-colors"
          >
            로그인
          </button>
        </div>
      </header>

      {/* 히어로 */}
      <Section>
        <div className="text-center py-8">
          <div className="inline-block bg-orange-50 text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            완전 무료 · 광고 지원
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            매일 매출 기록,<br />
            이제 30초면 끝
          </h2>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            1인 소상공인을 위한 일매출 기록 앱.<br />
            카드·현금·간편결제 한 번에 입력하고<br />
            부가세 예상액까지 바로 확인하세요.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-brand text-white text-lg font-bold px-10 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
          >
            지금 무료로 시작하기
          </button>
          <p className="text-xs text-gray-400 mt-3">이메일만 있으면 바로 시작 · 신용카드 불필요</p>
        </div>
      </Section>

      {/* 기능 소개 */}
      <div className="bg-white">
        <Section>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">핵심 기능</h2>
          <p className="text-gray-400 text-center text-sm mb-10">사장님이 꼭 필요한 것만 담았어요</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureCard
              icon="✏️"
              title="매출 입력"
              desc="카드·현금·네이버페이 등 8가지 결제수단을 한 화면에서 입력"
            />
            <FeatureCard
              icon="📅"
              title="달력 대시보드"
              desc="한눈에 보는 월별 매출. 날짜 탭하면 바로 수정 가능"
            />
            <FeatureCard
              icon="💰"
              title="세금 안내"
              desc="부가세 예상액과 신고 마감일 D-day를 자동으로 계산"
            />
            <FeatureCard
              icon="💻"
              title="PC 대시보드"
              desc="월별 리포트 조회, 엑셀 다운로드, 사업자 정보 관리"
            />
          </div>
        </Section>
      </div>

      {/* 보안 신뢰 */}
      <Section>
        <div className="bg-white rounded-3xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">내 데이터는 나만 봅니다</h2>
          <p className="text-gray-400 text-sm mb-8">매출 정보는 민감한 자산입니다. 철저하게 보호합니다.</p>
          <div className="flex flex-col gap-6">
            <TrustItem
              icon="🔒"
              title="본인 데이터만 접근 가능"
              desc="데이터베이스 레벨에서 강제 차단합니다. 같은 서비스 이용자도 다른 사람의 매출은 절대 볼 수 없어요."
            />
            <TrustItem
              icon="📋"
              title="이메일만 수집"
              desc="이름, 전화번호, 주민번호 수집 없음. 로그인에 필요한 이메일과 직접 입력하신 가게 정보만 저장합니다."
            />
            <TrustItem
              icon="🚫"
              title="데이터 절대 판매 안 함"
              desc="광고는 Google AdSense가 노출하지만, 매출·사업자 정보는 어떤 광고주에도 제공하지 않습니다."
            />
            <TrustItem
              icon="🗑️"
              title="언제든 탈퇴 가능"
              desc="탈퇴 즉시 모든 매출 데이터와 계정 정보가 삭제됩니다."
            />
          </div>
        </div>
      </Section>

      {/* 광고 안내 */}
      <div className="bg-orange-50">
        <Section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">왜 무료인가요?</h2>
            <p className="text-gray-500 leading-relaxed max-w-xl mx-auto">
              오늘장부는 <strong>Google 광고</strong>로 운영됩니다.<br />
              광고는 보여도, 사장님의 매출 데이터는 광고와 완전히 분리되어 있어요.<br />
              광고 없는 버전은 추후 유료 플랜으로 제공할 예정입니다.
            </p>
          </div>
        </Section>
      </div>

      {/* CTA */}
      <Section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            오늘 매출, 지금 바로 기록해보세요
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-brand text-white text-lg font-bold px-10 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
          >
            무료로 시작하기
          </button>
          <p className="text-xs text-gray-400 mt-3">신용카드 불필요 · 언제든 탈퇴 가능</p>
        </div>
      </Section>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center text-xs text-gray-400">
          <span>© 2026 오늘장부</span>
          <div className="flex gap-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition-colors">개인정보처리방침</button>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition-colors">이용약관</button>
            <span>문의: sinbi850403@gmail.com</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
