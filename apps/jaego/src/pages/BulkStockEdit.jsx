import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { exportBulkStockTemplate, parseBulkStockExcel } from '../lib/excel'
import { useIsMobile } from '../hooks/useIsMobile'

export default function BulkStockEdit() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [results,   setResults]   = useState(null)  // { updated, skipped }
  const [toast,     setToast]     = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('products')
        .select('id, name, unit, category, stock(quantity)')
        .eq('user_id', user.id)
        .order('name')
      setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleDownloadTemplate() {
    exportBulkStockTemplate(products)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setResults(null)
    try {
      const rows = await parseBulkStockExcel(file)
      const { data: { user } } = await supabase.auth.getUser()

      let updated = 0
      let skipped = 0

      for (const row of rows) {
        // 상품명으로 매칭
        const product = products.find(p => p.name === row.name)
        if (!product) { skipped++; continue }
        if (row.newQty == null || isNaN(row.newQty)) { skipped++; continue }

        const { error } = await supabase
          .from('stock')
          .update({ quantity: row.newQty })
          .eq('product_id', product.id)
          .eq('user_id', user.id)

        if (error) skipped++
        else updated++
      }

      setResults({ updated, skipped, total: rows.length })

      // 목록 갱신
      const { data } = await supabase
        .from('products')
        .select('id, name, unit, category, stock(quantity)')
        .eq('user_id', user.id)
        .order('name')
      setProducts(data ?? [])

    } catch (err) {
      setToast('엑셀 파일 형식을 확인해주세요.')
    } finally {
      setUploading(false)
      e.target.value = ''
      setTimeout(() => setToast(''), 3000)
    }
  }

  const containerStyle = {
    background: 'var(--color-bg)',
    minHeight: '100vh',
  }
  const cardStyle = {
    background: 'var(--color-white)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    marginBottom: 16,
  }

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 20px' : '0 32px',
        height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text)', padding: '4px 8px' }}>
          ←
        </button>
        <span style={{ fontWeight: 700, fontSize: 18 }}>재고 일괄 수정</span>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '20px 16px 40px' : '28px 32px 48px' }}>

        {/* 안내 */}
        <div style={{ ...cardStyle, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', marginBottom: 8 }}>📋 사용 방법</p>
          <ol style={{ fontSize: 13, color: '#1E40AF', lineHeight: 2, paddingLeft: 20, margin: 0 }}>
            <li>아래 <strong>템플릿 다운로드</strong> 버튼으로 현재 재고 목록을 받아요</li>
            <li>Excel에서 <strong>수정 재고</strong> 열만 변경해요 (D열)</li>
            <li>저장 후 <strong>엑셀 업로드</strong> 버튼으로 올리면 일괄 반영돼요</li>
          </ol>
          <p style={{ fontSize: 12, color: '#3B82F6', marginTop: 8 }}>
            ⚠️ 상품명은 변경하지 마세요 — 이름으로 매칭합니다
          </p>
        </div>

        {/* 액션 버튼 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadTemplate}
              disabled={loading || products.length === 0}
              style={{
                flex: 1, minWidth: 160, padding: '12px',
                border: '1px solid var(--color-primary)', borderRadius: 'var(--radius)',
                background: 'var(--color-white)', color: 'var(--color-primary)',
                fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              ⬇ 템플릿 다운로드
            </button>

            <label style={{
              flex: 1, minWidth: 160, padding: '12px',
              background: uploading ? '#9CA3AF' : 'var(--color-primary)', color: '#fff',
              borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 14,
              cursor: uploading ? 'not-allowed' : 'pointer',
              textAlign: 'center', display: 'block',
              opacity: uploading ? 0.7 : 1,
            }}>
              <input
                type="file" accept=".xlsx,.xls,.csv"
                onChange={handleUpload} disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploading ? '업로드 중...' : '⬆ 엑셀 업로드'}
            </label>
          </div>
        </div>

        {/* 업로드 결과 */}
        {results && (
          <div style={{
            ...cardStyle,
            background: results.updated > 0 ? '#F0FDF4' : '#FFF7ED',
            border: `1px solid ${results.updated > 0 ? '#86EFAC' : '#FED7AA'}`,
          }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: results.updated > 0 ? '#166534' : '#92400E', marginBottom: 8 }}>
              {results.updated > 0 ? '✅ 업로드 완료!' : '⚠️ 업로드 결과'}
            </p>
            <div style={{ fontSize: 13, color: results.updated > 0 ? '#15803D' : '#B45309', lineHeight: 1.8 }}>
              <div>총 <strong>{results.total}</strong>개 행 처리</div>
              <div>수정 완료: <strong style={{ color: '#16A34A' }}>{results.updated}개</strong></div>
              {results.skipped > 0 && (
                <div>건너뜀: <strong style={{ color: '#DC2626' }}>{results.skipped}개</strong> (상품명 불일치 또는 오류)</div>
              )}
            </div>
          </div>
        )}

        {/* 현재 재고 목록 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 14, fontWeight: 600 }}>
            현재 재고 목록 ({products.length}개)
          </p>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
              불러오는 중...
            </p>
          ) : products.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-sub)', fontSize: 14 }}>
              등록된 상품이 없습니다
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['상품명', '카테고리', '단위', '현재 재고'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === '현재 재고' ? 'right' : 'left',
                        fontSize: 12, fontWeight: 600, color: 'var(--color-text-sub)',
                        borderBottom: '1px solid var(--color-border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const qty = p.stock?.[0]?.quantity ?? 0
                    return (
                      <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--color-primary)' }}>{p.name}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--color-text-sub)' }}>{p.category ?? '일반'}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--color-text-sub)' }}>{p.unit}</td>
                        <td style={{
                          padding: '9px 12px', textAlign: 'right', fontWeight: 700,
                          color: qty === 0 ? '#DC2626' : 'var(--color-text)',
                        }}>
                          {qty.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '12px 24px',
          borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
          zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
