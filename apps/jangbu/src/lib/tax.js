export function vat(totalSales, taxType) {
  if (taxType === 'simple') {
    return Math.round(totalSales * 0.015)
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
