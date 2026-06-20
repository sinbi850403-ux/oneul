// 오늘장부 블로그 전용 키워드 (자영업 주제만)
// category 는 blog/index.html 의 카테고리 탭과 정확히 일치해야 함:
//   매출관리 · 부가세/세금 · 절세꿀팁 · 배달앱 · 카드수수료 · 사업자등록 · 직원관리
export const keywords = [
  // 매출관리
  { keyword: '카페 일매출 관리하는 법', category: '매출관리', imageQuery: 'cafe coffee owner' },
  { keyword: '음식점 매출 관리 엑셀 vs 앱', category: '매출관리', imageQuery: 'restaurant owner laptop' },
  { keyword: '소상공인 매출 장부 정리법', category: '매출관리', imageQuery: 'small business bookkeeping' },
  { keyword: '편의점 일매출 기록 꿀팁', category: '매출관리', imageQuery: 'convenience store counter' },

  // 부가세/세금
  { keyword: '자영업자 부가세 신고 방법', category: '부가세/세금', imageQuery: 'tax document calculator' },
  { keyword: '간이과세자 일반과세자 차이', category: '부가세/세금', imageQuery: 'tax paperwork desk' },
  { keyword: '부가세 신고 마감일 총정리', category: '부가세/세금', imageQuery: 'calendar deadline office' },
  { keyword: '자영업자 종합소득세 신고법', category: '부가세/세금', imageQuery: 'income tax form' },

  // 절세꿀팁
  { keyword: '소상공인 절세 방법 총정리', category: '절세꿀팁', imageQuery: 'saving money coins' },
  { keyword: '자영업자 경비 처리 꿀팁', category: '절세꿀팁', imageQuery: 'receipt expense accounting' },
  { keyword: '매입세액 공제 제대로 받는 법', category: '절세꿀팁', imageQuery: 'invoice tax deduction' },
  { keyword: '사업용 신용카드 절세 활용', category: '절세꿀팁', imageQuery: 'credit card business' },

  // 배달앱
  { keyword: '배달앱 수수료 절약 방법', category: '배달앱', imageQuery: 'food delivery rider' },
  { keyword: '배민 쿠팡이츠 정산 이해하기', category: '배달앱', imageQuery: 'delivery food packaging' },
  { keyword: '배달 매출 부가세 처리법', category: '배달앱', imageQuery: 'delivery business owner' },
  { keyword: '배달앱 매출 누락 방지하는 법', category: '배달앱', imageQuery: 'smartphone food order' },

  // 카드수수료
  { keyword: '카드 수수료 우대 신청 방법', category: '카드수수료', imageQuery: 'payment card terminal' },
  { keyword: '영세 중소가맹점 수수료율 정리', category: '카드수수료', imageQuery: 'card machine shop' },
  { keyword: '카드 매출 정산 주기 이해하기', category: '카드수수료', imageQuery: 'card payment store' },
  { keyword: '카드수수료 절감 현실 전략', category: '카드수수료', imageQuery: 'cash register payment' },

  // 사업자등록
  { keyword: '사업자등록 절차 한눈에 정리', category: '사업자등록', imageQuery: 'business registration documents' },
  { keyword: '간이과세 일반과세 선택 기준', category: '사업자등록', imageQuery: 'choosing business form' },
  { keyword: '업종코드 정하는 법 자영업', category: '사업자등록', imageQuery: 'office paperwork checklist' },
  { keyword: '공동사업자 등록 주의사항', category: '사업자등록', imageQuery: 'business partners meeting' },

  // 직원관리
  { keyword: '알바 4대보험 가입 기준', category: '직원관리', imageQuery: 'part time worker store' },
  { keyword: '주휴수당 계산법 자영업자', category: '직원관리', imageQuery: 'work schedule calendar' },
  { keyword: '알바 연차 수당 계산 방법', category: '직원관리', imageQuery: 'employee shop staff' },
  { keyword: '직원 급여 신고 방법 소상공인', category: '직원관리', imageQuery: 'payroll salary document' },
]
