// 매출 입력 항목 — sales 테이블 컬럼과 1:1 대응한다.
// Input / DashboardInput / MonthlyReport / ExcelExport 네 곳이 같은 목록을 쓰므로
// 여기서만 관리한다. 항목을 늘리면 sales 테이블에도 같은 이름의 컬럼을 추가해야 한다.

export const PAYMENT_FIELDS = [
  { key: 'card',    label: '카드' },
  { key: 'cash',    label: '현금영수증' },
  { key: 'bank',    label: '무통장입금' },
  { key: 'vbank',   label: '가상계좌' },
  { key: 'phone',   label: '휴대폰결제' },
  { key: 'npay',    label: '네이버페이' },
  { key: 'kpay',    label: '카카오페이' },
  { key: 'baemin',  label: '배달의민족' },
  { key: 'coupang', label: '쿠팡이츠' },
  { key: 'yogiyo',  label: '요기요' },
  { key: 'etc',     label: '기타' },
]

export const EMPTY_SALES = Object.fromEntries(PAYMENT_FIELDS.map((f) => [f.key, 0]))

export const DELIVERY_KEYS = ['baemin', 'coupang', 'yogiyo']

export const DELIVERY_FIELDS = PAYMENT_FIELDS.filter((f) => DELIVERY_KEYS.includes(f.key))

export const EMPTY_DELIVERY_RATES = Object.fromEntries(DELIVERY_KEYS.map((k) => [k, 0]))

// 배달앱은 주문 총액이 매출이고 수수료는 비용이다. 매출에서 빼버리면 부가세 신고가
// 틀어지므로 total은 총액 그대로 두고, 실제로 통장에 꽂히는 금액만 따로 계산해 보여준다.
//
// rates: 앱별 실효 수수료율(%). 중개·결제·배달비를 합친 값이며 계산기 페이지에서 산출한다.
//        0이면 아직 설정하지 않은 것으로 보고 그 앱은 차감 대상에서 뺀다.
export function calcDeliverySettlement(values, rates) {
  let gross = 0
  let fee = 0
  let hasUnsetRate = false

  for (const key of DELIVERY_KEYS) {
    const amount = Number(values?.[key]) || 0
    if (amount <= 0) continue

    gross += amount
    const rate = Number(rates?.[key]) || 0
    if (rate > 0) fee += Math.round((amount * rate) / 100)
    else hasUnsetRate = true
  }

  return { gross, fee, net: gross - fee, hasUnsetRate }
}
