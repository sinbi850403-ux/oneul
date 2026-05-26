export function todayKST() {
  return new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '')
}

export function toKSTDateString(date) {
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '')
}

export function formatKoreanDate(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`
}

export function getMonthRange(year, month) {
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const end = new Date(year, month, 0)
  const endStr = `${year}-${pad(month)}-${pad(end.getDate())}`
  return { start, end: endStr }
}
