import * as XLSX from 'xlsx'
import { DEFAULT_UNIT } from './constants'

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
