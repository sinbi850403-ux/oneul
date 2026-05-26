import * as XLSX from 'xlsx'
import { DEFAULT_UNIT } from './constants'

export function exportLogsToExcel(logs, filename = '재고이력') {
  const TYPE_LABEL = { in: '입고', out: '출고', return: '반품' }
  const rows = logs.map(l => ({
    '일시':   new Date(l.created_at).toLocaleString('ko-KR'),
    '유형':   TYPE_LABEL[l.type] ?? l.type,
    '상품명': l.products?.name ?? '-',
    '단위':   l.products?.unit ?? '',
    '수량':   l.type === 'out' ? -l.quantity : l.quantity,
    '메모':   l.note ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '이력')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportStockToExcel(products, filename = '재고현황') {
  const rows = products.map(p => ({
    '상품명':    p.name,
    '단위':      p.unit,
    '현재 재고': p.stock?.[0]?.quantity ?? 0,
    '안전재고':  p.min_quantity ?? 0,
    '상태':      (p.stock?.[0]?.quantity ?? 0) <= (p.min_quantity ?? 0) && (p.min_quantity ?? 0) > 0 ? '부족' : '정상',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '재고현황')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// 엑셀 파일 → 상품 배열 변환
// A열: name, B열: unit, C열: quantity
export function parseProductsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

        const products = rows
          .slice(1) // 헤더 제거
          .filter(row => row[0]) // name 없으면 제외
          .map(row => ({
            name:     String(row[0]).trim(),
            unit:     row[1] ? String(row[1]).trim() : DEFAULT_UNIT,
            quantity: row[2] ? parseInt(row[2]) || 0 : 0,
          }))

        resolve(products)
      } catch (err) {
        reject(new Error('엑셀 파싱 실패: ' + err.message))
      }
    }

    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}
