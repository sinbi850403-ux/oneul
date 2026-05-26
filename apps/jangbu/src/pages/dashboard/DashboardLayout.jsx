import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

const menus = [
  { to: '/dashboard/input',     label: '매출 입력' },
  { to: '/dashboard/report',    label: '월별 손익' },
  { to: '/dashboard/purchases', label: '매입 내역' },
  { to: '/dashboard/sales',     label: '매출 내역' },
  { to: '/dashboard/excel',     label: '엑셀 다운로드' },
  { to: '/dashboard/tax',       label: '세금 요약' },
  { to: '/dashboard/biz',       label: '사업자 정보' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [shopName, setShopName] = useState('')

  useEffect(() => {
    async function loadShopName() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('shop_name').eq('user_id', user.id).single()
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
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-lg font-bold text-brand">오늘장부</span>
            <span className="text-gray-300 text-sm">/</span>
            <a
              href={import.meta.env.VITE_JAEGO_URL || '#'}
              className="text-lg font-semibold text-gray-400 hover:text-blue-500 transition-colors"
            >
              오늘재고
            </a>
          </div>
          <p className="text-sm font-medium text-gray-700">{shopName || '내 가게'}</p>
          <p className="text-xs text-gray-400">관리자 대시보드</p>
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
  )
}
