import { todayKST } from './date.js'
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

// 마감일 계산은 전부 KST 기준이다. 브라우저 로컬 시간을 쓰면 자정 근처나
// 해외 로밍 중에 D-day 가 하루씩 어긋난다.
//
// 'YYYY-MM-DD' 를 UTC 자정으로 읽어 날짜끼리만 뺀다. 양쪽 다 같은 방식이라
// 시차·서머타임의 영향을 받지 않고 정확히 일수 차이가 나온다.
const asUTC = (dateStr) => Date.parse(`${dateStr}T00:00:00Z`)

// 오늘(KST) 기준 남은 일수. 마감 당일이면 0.
export function dDay(target) {
  return Math.round((asUTC(target) - asUTC(todayKST())) / 86400000)
}

// 개인사업자 부가세 확정신고 기한은 1기 7/25, 2기 다음해 1/25 두 번이다.
// 월로만 비교하면 두 군데가 어긋난다 — 1월 1~25일에는 코앞인 1/25 를 건너뛰고
// 7/25 를 보여줬고, 7월 26~31일에는 이미 지난 7/25 를 그대로 띄워 D-day 가 음수였다.
// 날짜 문자열끼리 비교하면(YYYY-MM-DD 는 사전순 = 시간순) 둘 다 사라진다.
export function nextVatDeadline() {
  const today = todayKST()
  const year = Number(today.slice(0, 4))
  // 마감 당일까지는 그 기한을 보여준다.
  if (today <= `${year}-01-25`) return `${year}-01-25`
  if (today <= `${year}-07-25`) return `${year}-07-25`
  return `${year + 1}-01-25`
}

export function nextIncomeTaxDeadline() {
  const today = todayKST()
  const year = Number(today.slice(0, 4))
  const deadline = `${year}-05-31`
  // 마감 당일까지는 올해 기한을 보여준다.
  return today > deadline ? `${year + 1}-05-31` : deadline
}
