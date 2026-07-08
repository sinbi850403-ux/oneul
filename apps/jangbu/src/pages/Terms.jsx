import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()
  return (
    <div className="bg-stone-50 min-h-screen">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="text-2xl font-bold text-brand">오늘장부</button>
          <button onClick={() => navigate(-1)} className="text-sm text-stone-400 hover:text-stone-600">← 뒤로</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 bg-white mt-6 rounded-2xl shadow-card">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">이용약관</h1>
        <p className="text-sm text-stone-400 mb-8">최종 수정일: 2026년 5월 25일</p>

        <div className="space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제1조 (목적)</h2>
            <p className="text-sm">이 약관은 오늘장부(이하 "서비스")의 이용 조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제2조 (서비스 소개)</h2>
            <p className="text-sm">오늘장부는 1인 소상공인을 위한 일매출 기록 및 세금 안내 서비스입니다. 서비스는 Google AdSense 광고 수익으로 운영되며 기본 기능은 무료로 제공됩니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제3조 (회원가입 및 이용)</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>이메일 주소를 통해 회원가입할 수 있습니다.</li>
              <li>타인의 정보를 도용하거나 허위 정보를 등록한 경우 서비스 이용이 제한될 수 있습니다.</li>
              <li>1인 1계정 원칙을 준수해 주세요.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제4조 (서비스 이용 제한)</h2>
            <p className="text-sm">다음 행위를 금지합니다.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm">
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>타인의 계정 및 데이터에 무단 접근하는 행위</li>
              <li>자동화된 방법으로 서비스를 남용하는 행위</li>
              <li>관련 법령을 위반하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제5조 (데이터 및 책임)</h2>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>서비스에 입력된 매출 데이터는 사용자 본인이 관리·책임합니다.</li>
              <li>서비스의 세금 계산은 참고용 추정치이며, 정확한 세금 신고는 세무사와 상담하시기 바랍니다.</li>
              <li>천재지변, 기술적 장애 등 불가항력적 사유로 인한 데이터 손실에 대해 서비스는 책임지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제6조 (광고)</h2>
            <p className="text-sm">서비스는 Google AdSense를 통해 광고를 표시합니다. 광고 콘텐츠는 Google이 제공하며, 서비스는 광고 내용에 대해 책임지지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제7조 (서비스 변경 및 중단)</h2>
            <p className="text-sm">서비스는 운영 사정에 따라 서비스 내용을 변경하거나 중단할 수 있습니다. 이 경우 사전에 공지합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제8조 (회원 탈퇴)</h2>
            <p className="text-sm">회원은 언제든지 서비스 내 설정 화면에서 탈퇴할 수 있습니다. 탈퇴 즉시 모든 데이터는 삭제되며 복구되지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">제9조 (준거법 및 관할)</h2>
            <p className="text-sm">이 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 관할 법원은 민사소송법에 따릅니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">문의</h2>
            <p className="text-sm">sinbi850403@gmail.com</p>
          </section>

        </div>
      </div>

      <footer className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-stone-400">
        © 2026 오늘장부
      </footer>
    </div>
  )
}
