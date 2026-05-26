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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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

function StepCard({ step, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full bg-brand text-white font-bold text-lg flex items-center justify-center shrink-0">
        {step}
      </div>
      <div className="pt-1">
        <h4 className="font-bold text-gray-800 mb-1">{title}</h4>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

function MockScreen() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-xs mx-auto">
      {/* 상단 바 */}
      <div className="bg-brand px-5 py-4">
        <div className="text-white font-bold text-lg">오늘 매출</div>
        <div className="text-orange-100 text-sm">2026년 5월 25일 일요일</div>
      </div>
      {/* 입력 항목 */}
      <div className="p-4 space-y-2">
        {[
          { label: '카드', value: '320,000' },
          { label: '현금', value: '85,000' },
          { label: '네이버페이', value: '47,000' },
          { label: '카카오페이', value: '23,000' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600 font-medium">{label}</span>
            <span className="font-bold text-gray-800">{value}원</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-200 pt-2 mt-2 flex justify-between items-center px-1">
          <span className="text-sm font-bold text-gray-700">합계</span>
          <span className="text-xl font-bold text-brand">475,000원</span>
        </div>
      </div>
      {/* 저장 버튼 */}
      <div className="px-4 pb-4">
        <div className="bg-brand text-white text-center py-3 rounded-xl font-bold text-sm">
          저장하기
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-brand">오늘장부</h1>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-brand border border-brand px-4 py-1.5 rounded-full hover:bg-orange-50 transition-colors"
          >
            로그인
          </button>
        </div>
      </header>

      {/* 히어로 */}
      <Section>
        <div className="flex flex-col md:flex-row items-center gap-12 py-4">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-orange-50 text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              🎉 완전 무료 · 광고 지원
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              매일 매출 기록,<br />
              <span className="text-brand">30초</span>면 끝
            </h2>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              카드·현금·네이버페이·카카오페이<br />
              8가지 결제수단을 한 화면에서 입력.<br />
              부가세 예상액까지 자동으로 계산해드려요.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-brand text-white text-lg font-bold px-10 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
            >
              지금 무료로 시작하기
            </button>
            <p className="text-xs text-gray-400 mt-3">이메일만 있으면 바로 시작 · 신용카드 불필요</p>
          </div>
          <div className="flex-1 flex justify-center">
            <MockScreen />
          </div>
        </div>
      </Section>

      {/* 이런 분께 */}
      <div className="bg-white">
        <Section>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">이런 사장님께 딱 맞아요</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: '☕', who: '카페·음식점 사장님', pain: '매일 엑셀 켜기 귀찮고 실수도 잦다' },
              { emoji: '🛒', who: '편의점·소매점 사장님', pain: '카드·현금 합계 계산이 헷갈린다' },
              { emoji: '🚚', who: '배달·1인 사업자', pain: '앱별 매출을 따로 정리하기 번거롭다' },
            ].map(({ emoji, who, pain }) => (
              <div key={who} className="bg-orange-50 rounded-2xl p-6">
                <div className="text-3xl mb-3">{emoji}</div>
                <div className="font-bold text-gray-800 mb-2">{who}</div>
                <div className="text-sm text-gray-500">"{pain}"</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 사용 방법 */}
      <Section>
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">딱 3단계예요</h2>
        <p className="text-gray-400 text-center text-sm mb-10">복잡한 설정 없이 바로 시작</p>
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <StepCard step="1" title="회원가입 (10초)" desc="이메일 입력하고 비밀번호 설정. 끝." />
          <StepCard step="2" title="오늘 매출 입력 (30초)" desc="카드, 현금, 간편결제 금액 입력 후 저장." />
          <StepCard step="3" title="달력에서 확인" desc="월별 매출 달력, 부가세 예상액 자동 계산." />
        </div>
      </Section>

      {/* 기능 소개 */}
      <div className="bg-white">
        <Section>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">핵심 기능</h2>
          <p className="text-gray-400 text-center text-sm mb-10">사장님이 꼭 필요한 것만 담았어요</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FeatureCard icon="✏️" title="매출 입력" desc="8가지 결제수단을 한 화면에서 빠르게 입력" />
            <FeatureCard icon="📅" title="달력 보기" desc="월별 매출 한눈에 확인, 날짜 탭하면 바로 수정" />
            <FeatureCard icon="💰" title="세금 안내" desc="부가세 예상액과 신고 마감 D-day 자동 계산" />
            <FeatureCard icon="💻" title="PC 대시보드" desc="월별 리포트, 엑셀 다운로드, 사업자 정보 관리" />
          </div>
        </Section>
      </div>

      {/* 보안 신뢰 */}
      <Section>
        <div className="bg-white rounded-3xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">내 데이터는 나만 봅니다</h2>
          <p className="text-gray-400 text-sm mb-8">매출 정보는 민감한 자산입니다. 철저하게 보호합니다.</p>
          <div className="flex flex-col gap-6">
            <TrustItem icon="🔒" title="본인 데이터만 접근 가능" desc="데이터베이스 레벨에서 강제 차단. 다른 이용자는 내 매출을 절대 볼 수 없어요." />
            <TrustItem icon="📋" title="이메일만 수집" desc="이름, 전화번호, 주민번호 수집 없음. 이메일과 직접 입력하신 가게 정보만 저장합니다." />
            <TrustItem icon="🚫" title="데이터 절대 판매 안 함" desc="광고는 Google AdSense가 노출하지만, 매출·사업자 정보는 어떤 광고주에도 제공하지 않습니다." />
            <TrustItem icon="🗑️" title="언제든 탈퇴 가능" desc="탈퇴 즉시 모든 매출 데이터와 계정 정보가 즉시 삭제됩니다." />
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
              <span className="text-sm text-gray-400 mt-2 block">광고 없는 버전은 추후 유료 플랜으로 제공 예정</span>
            </p>
          </div>
        </Section>
      </div>

      {/* CTA */}
      <Section>
        <div className="text-center bg-white rounded-3xl shadow-sm p-12">
          <div className="text-4xl mb-4">📒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            오늘 매출, 지금 바로 기록해보세요
          </h2>
          <p className="text-gray-400 text-sm mb-8">가입 10초 · 첫 기록 30초 · 완전 무료</p>
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
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-400">
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
