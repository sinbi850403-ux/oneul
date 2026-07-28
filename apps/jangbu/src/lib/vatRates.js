// 간이과세자 업종별 부가가치율 — 국세청 기준(2021-07-01 이후).
// 납부세액 = 공급대가 × 부가가치율 × 세율 10%  이므로 실효 세율은 부가가치율의 1/10이다.
//
// public/tools/vat-simplified-calculator/ 의 RATES 배열과 순서·값이 같아야 한다.
// 요율이 바뀌면 두 곳을 함께 고칠 것.

export const VAT_BIZ_CLASSES = [
  { value: 0, rate: 15, label: '소매업 · 음식점업 · 재생용 재료수집 및 판매업' },
  { value: 1, rate: 20, label: '제조업 · 농업 임업 및 어업 · 소화물 전문 운송업' },
  { value: 2, rate: 25, label: '숙박업' },
  { value: 3, rate: 30, label: '건설업 · 운수 및 창고업 · 정보통신업' },
  { value: 4, rate: 30, label: '그 밖의 서비스업' },
  { value: 5, rate: 40, label: '금융·보험 · 전문·과학·기술 · 사업시설관리 · 부동산 관련 · 부동산임대업' },
]

// 저장된 값이 없거나 범위를 벗어나면 소매·음식점(15%)으로 본다.
// 이 값이 기존 동작(1.5% 고정)과 같아서 마이그레이션 이전 데이터도 그대로 맞는다.
export function vatRateOf(bizClass) {
  const found = VAT_BIZ_CLASSES.find((c) => c.value === Number(bizClass))
  return (found ?? VAT_BIZ_CLASSES[0]).rate
}
