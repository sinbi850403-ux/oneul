import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import Toast from '../../components/Toast.jsx'

function won(n) { return '₩ ' + (n ?? 0).toLocaleString('ko-KR') }

const CATS = [
  { value: 'rent',    label: '임대료',  color: 'bg-indigo-50 text-indigo-600' },
  { value: 'utility', label: '공과금',  color: 'bg-orange-50 text-orange-600' },
  { value: 'labor',   label: '인건비',  color: 'bg-blue-50 text-blue-600'     },
  { value: 'other',   label: '기타',    color: 'bg-stone-100 text-stone-500'     },
]
const catInfo = (val) => CATS.find(c => c.value === val) ?? CATS[3]

export default function FixedExpenses() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState('')
  const [form,    setForm]    = useState({ name: '', amount: '', category: 'rent' })
  const [saving,  setSaving]  = useState(false)
  const [userId,  setUserId]  = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)
      const { data } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleAdd() {
    if (!form.name.trim() || !form.amount) return
    setSaving(true)
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({ user_id: userId, name: form.name.trim(), amount: Number(form.amount), category: form.category })
      .select()
      .single()
    if (error) { setToast('추가 실패: ' + error.message); setSaving(false); return }
    setItems(prev => [...prev, data])
    setForm({ name: '', amount: '', category: 'rent' })
    setSaving(false)
    setToast('고정비가 추가됐어요')
  }

  async function handleDelete(id) {
    if (!window.confirm('이 항목을 삭제할까요?')) return
    await supabase.from('fixed_expenses').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
    setToast('삭제됐어요')
  }

  const total = items.reduce((a, r) => a + (r.amount ?? 0), 0)

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-stone-800 mb-1">정기 고정비</h2>
      <p className="text-sm text-stone-400 mb-6">
        매월 나가는 고정 지출이에요. 대시보드 순이익에서 자동으로 차감됩니다.
      </p>

      {/* 합계 카드 */}
      <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 mb-6 flex justify-between items-center">
        <span className="text-sm font-semibold text-stone-600">월 고정비 합계</span>
        <span className="text-2xl font-bold text-red-500">{won(total)}</span>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-6">
        {loading ? (
          <p className="text-center py-8 text-stone-400 text-sm">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-8 text-stone-400 text-sm">아직 고정비가 없어요. 아래에서 추가해주세요.</p>
        ) : (
          items.map((item, i) => {
            const ci = catInfo(item.category)
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < items.length - 1 ? 'border-b border-stone-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${ci.color}`}>
                    {ci.label}
                  </span>
                  <span className="text-sm font-semibold text-stone-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-red-500">{won(item.amount)}</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-stone-300 hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 추가 폼 */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="text-base font-bold text-stone-800 mb-4">고정비 추가</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {CATS.map(c => (
            <button
              key={c.value}
              onClick={() => setForm(f => ({ ...f, category: c.value }))}
              className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                form.category === c.value
                  ? `${c.color} border-current`
                  : 'bg-stone-50 text-stone-400 border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="항목명 (예: 건물 임대료)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
          <div className="flex items-center border border-stone-200 rounded-xl px-3 gap-1">
            <input
              type="number"
              placeholder="금액"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-28 py-2.5 text-sm outline-none"
            />
            <span className="text-sm text-stone-400 whitespace-nowrap">원</span>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim() || !form.amount}
          className="w-full bg-brand text-white rounded-xl py-3 text-sm font-bold hover:opacity-90 disabled:opacity-40"
        >
          {saving ? '추가 중...' : '추가하기'}
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
