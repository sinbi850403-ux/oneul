import { vatRateOf } from './vatRates.js'

// 간이과세자는 매출세액-매입세액이 아니라 업종별 부가가치율을 적용한다.
//   납부세액 = 공급대가 × 부가가치율 × 10%
// 예전에는 1.5%로 고정돼 있었는데 그건 음식점업(15%) 기준이라, 숙박업(2.5%)이나
// 부동산임대업(4.0%) 사장님에게는 실제의 절반 이하로 나왔다.
export function vat(totalSales, taxType, bizClass) {
  if (taxType === 'simple') {
    return Math.round((totalSales * vatRateOf(bizClass)) / 1000)
  }
  return Math.round(totalSales / 11)
}

export function dDay(target) {
  return Math.ceil((new Date(target) - new Date()) / 86400000)
}

export function nextVatDeadline() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month <= 7) return `${year}-07-25`
  return `${year + 1}-01-25`
}

export function nextIncomeTaxDeadline() {
  const year = new Date().getFullYear()
  const deadline = new Date(`${year}-05-31`)
  if (deadline < new Date()) return `${year + 1}-05-31`
  return `${year}-05-31`
}
