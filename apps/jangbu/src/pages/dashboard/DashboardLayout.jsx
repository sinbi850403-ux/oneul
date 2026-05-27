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
  { to: '/dashboard/home',      label: '🏠 대시보드' },
  { to: '/dashboard/input',     label: '매출 입력' },
  { to: '/dashboard/report',    label: '월별 손익' },
  { to: '/dashboard/purchases', label: '매입 내역' },
  { to: '/dashboard/sales',     label: '매출 내역' },
  { to: '/dashboard/excel',     label: '엑셀 다운로드' },
  { to: '/dashboard/tax',       label: '세금 요약' },
  { to: '/dashboard/biz',       label: '⚙️ 설정' },
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
      <div className="bg-gray-900 flex items-center gap-2 px-5 h-8 shrink-0">
        <span className="text-sm font-bold text-brand">오늘장부</span>
        <span className="text-gray-600 text-sm">/</span>
        <button
          onClick={goToJaego}
          className="text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          오늘재고
        </button>
      </div>

      <div className="flex flex-1 bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-base font-bold text-gray-800">{shopName || '내 가게'}</p>
          <p className="text-xs text-gray-400 mt-0.5">관리자 대시보드</p>
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
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50"
          >
            로그아웃
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="text-xs text-gray-300 hover:text-red-400 py-1 disabled:opacity-50 transition-colors"
          >
            {deleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet context={{ setShopName }} />
      </main>
      </div>
    </div>
  )
}
