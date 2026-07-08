import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

async function goToJaego() {
  const { data: { session } } = await supabase.auth.getSession()
  const base = 'https://oneul-jaego.vercel.app'
  if (session?.access_token) {
    window.location.href = `${base}?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
  } else {
    window.location.href = base
  }
}

const menus = [
  { to: '/dashboard/home',      label: '대시보드' },
  { to: '/dashboard/input',     label: '매출 입력' },
  { to: '/dashboard/report',    label: '월별 손익' },
  { to: '/dashboard/purchases', label: '매입 내역' },
  { to: '/dashboard/sales',     label: '매출 내역' },
  { to: '/dashboard/excel',     label: '엑셀 다운로드' },
  { to: '/dashboard/tax',       label: '세금 요약' },
  { to: '/dashboard/workers',        label: '알바 급여' },
  { to: '/dashboard/fixed-expenses', label: '정기 고정비' },
  { to: '/dashboard/board',          label: '게시판' },
  { to: '/dashboard/biz',       label: '설정' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [shopName, setShopName] = useState('')

  useEffect(() => {
    async function loadShopName() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('shop_name').eq('user_id', user.id).maybeSingle()
      if (data?.shop_name) setShopName(data.shop_name)
    }
    loadShopName()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    if (!window.confirm('정말 탈퇴하시겠어요?\n모든 매출 데이터와 계정이 즉시 삭제되며 복구할 수 없습니다.')) return
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      setDeleting(false)
      alert(json.error || '탈퇴 처리 중 오류가 발생했어요.')
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 앱 스위처 바 */}
      <div className="bg-stone-900 flex items-center gap-2 px-5 h-8 shrink-0">
        <span className="text-sm font-bold text-brand">오늘장부</span>
        <span className="text-stone-600 text-sm">/</span>
        <button
          onClick={goToJaego}
          className="text-sm font-medium text-stone-400 hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          오늘재고
        </button>
      </div>

      <div className="flex flex-1 bg-stone-50">
      <aside className="w-56 bg-white border-r border-stone-100 shadow-[4px_0_20px_-8px_rgba(41,33,26,0.05)] flex flex-col">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 text-brand font-bold flex items-center justify-center shrink-0">
            {(shopName || '내')[0]}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-stone-800 truncate">{shopName || '내 가게'}</p>
            <p className="text-xs text-stone-400 mt-0.5">관리자 대시보드</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {menus.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-brand font-semibold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-stone-100 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl text-sm text-stone-400 hover:bg-stone-50"
          >
            로그아웃
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="text-xs text-stone-300 hover:text-red-400 py-1 disabled:opacity-50 transition-colors"
          >
            {deleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-10 overflow-y-auto">
        <Outlet context={{ setShopName }} />
      </main>
      </div>
    </div>
  )
}
