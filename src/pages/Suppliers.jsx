import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuppliers } from '../hooks/useSuppliers'
import { useIsMobile } from '../hooks/useIsMobile'

const FIELDS = [
  { key: 'name',         label: '거래처명', required: true,  placeholder: '거래처명 입력' },
  { key: 'contact_name', label: '담당자',   required: false, placeholder: '담당자 이름' },
  { key: 'phone',        label: '연락처',   required: false, placeholder: '010-0000-0000' },
  { key: 'email',        label: '이메일',   required: false, placeholder: 'example@mail.com' },
  { key: 'memo',         label: '메모',     required: false, placeholder: '메모' },
]

const EMPTY = { name: '', contact_name: '', phone: '', email: '', memo: '' }

function SupplierForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FIELDS.map(({ key, label, required, placeholder }) => (
        <div key={key}>
          <label style={{ fontSize: 12, color: 'var(--color-text-sub)', display: 'block', marginBottom: 4 }}>
            {label}{required && ' *'}
          </label>
          <input
            value={form[key]} placeholder={placeholder}
            onChange={e => set(key, e.target.value)}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onSave(form)} disabled={!form.name.trim() || saving} style={{
          flex: 1, padding: '11px', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700,
          background: 'var(--color-primary)', color: 'var(--color-white)',
          border: 'none', cursor: 'pointer', opacity: !form.name.trim() || saving ? 0.5 : 1,
        }}>{saving ? '저장 중...' : '저장'}</button>
        <button onClick={onCancel} style={{
          padding: '11px 20px', borderRadius: 'var(--radius)', fontSize: 14,
          border: '1px solid var(--color-border)', background: 'var(--color-white)',
          color: 'var(--color-text-sub)', cursor: 'pointer',
        }}>취소</button>
      </div>
    </div>
  )
}

export default function Suppliers() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers()

  const [showAdd,  setShowAdd]  = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [keyword,  setKeyword]  = useState('')

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(keyword.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(keyword.toLowerCase())
  )

  async function handleAdd(form) {
    setSaving(true)
    await addSupplier(form)
    setSaving(false)
    setShowAdd(false)
  }

  async function handleUpdate(id, form) {
    setSaving(true)
    await updateSupplier(id, form)
    setSaving(false)
    setEditId(null)
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`"${name}" 거래처를 삭제할까요?`)) return
    await deleteSupplier(id)
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMobile && (
            <button onClick={() => navigate(-1)}
              style={{ fontSize: 22, color: 'var(--color-text)', padding: '4px 8px', marginLeft: -8 }}>←</button>
          )}
          <span style={{ fontWeight: 700, fontSize: 18 }}>거래처 관리</span>
        </div>
        <button onClick={() => { setShowAdd(true); setEditId(null) }} style={{
          background: 'var(--color-primary)', color: 'var(--color-white)',
          padding: '7px 18px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 14,
          border: 'none', cursor: 'pointer',
        }}>+ 거래처 추가</button>
      </header>

      <div style={{
        maxWidth: isMobile ? 480 : 800, margin: '0 auto',
        padding: isMobile ? '16px 16px 40px' : '28px 32px 48px',
      }}>

        {/* 추가 폼 */}
        {showAdd && (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20,
          }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>새 거래처</p>
            <SupplierForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
          </div>
        )}

        {/* 검색 */}
        <input type="text" placeholder="거래처명 / 담당자 검색..." value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 16,
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            background: 'var(--color-white)',
          }} />

        {/* 목록 */}
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-sub)', padding: '40px 0', fontSize: 14 }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '40px 24px',
            textAlign: 'center', color: 'var(--color-text-sub)', fontSize: 14,
          }}>
            {keyword ? '검색 결과가 없습니다.' : '거래처를 추가해보세요.'}
          </div>
        ) : (
          <div style={{
            background: 'var(--color-white)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            {filtered.map((s, i) => (
              <div key={s.id}>
                {editId === s.id ? (
                  <div style={{ padding: 20, borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <SupplierForm
                      initial={{ name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email, memo: s.memo }}
                      onSave={form => handleUpdate(s.id, form)}
                      onCancel={() => setEditId(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-sub)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {s.contact_name && <span>👤 {s.contact_name}</span>}
                        {s.phone        && <span>📞 {s.phone}</span>}
                        {s.email        && <span>✉️ {s.email}</span>}
                        {s.memo         && <span>📝 {s.memo}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditId(s.id)} style={{
                        padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12,
                        border: '1px solid var(--color-border)', background: 'var(--color-white)',
                        color: 'var(--color-text-sub)', cursor: 'pointer',
                      }}>수정</button>
                      <button onClick={() => handleDelete(s.id, s.name)} style={{
                        padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12,
                        border: '1px solid #FCA5A5', background: '#FEF2F2',
                        color: '#DC2626', cursor: 'pointer',
                      }}>삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
