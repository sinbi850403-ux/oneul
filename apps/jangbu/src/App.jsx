import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import Input from './pages/Input.jsx'
import Calendar from './pages/Calendar.jsx'
import Tax from './pages/Tax.jsx'
import Settings from './pages/Settings.jsx'
import History from './pages/History.jsx'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import NavBar from './components/NavBar.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import BizInfo from './pages/dashboard/BizInfo.jsx'
import MonthlyReport from './pages/dashboard/MonthlyReport.jsx'
import ExcelExport from './pages/dashboard/ExcelExport.jsx'
import DashboardTax from './pages/dashboard/DashboardTax.jsx'
import DashboardInput from './pages/dashboard/DashboardInput.jsx'
import DashboardHome from './pages/dashboard/DashboardHome.jsx'
import Purchases     from './pages/dashboard/Purchases.jsx'
import SalesItems    from './pages/dashboard/SalesItems.jsx'
import Workers        from './pages/dashboard/Workers.jsx'
import Board         from './pages/dashboard/Board.jsx'
import FixedExpenses from './pages/dashboard/FixedExpenses.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Onboarding from './pages/Onboarding.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { useAuth } from './hooks/useAuth.js'

// 다른 앱에서 넘어온 경우 SSO 토큰으로 자동 로그인
;(async () => {
  const p = new URLSearchParams(window.location.search)
  const at = p.get('access_token')
  const rt = p.get('refresh_token')
  if (at && rt) {
    await supabase.auth.setSession({ access_token: at, refresh_token: rt })
    window.history.replaceState({}, '', window.location.pathname)
  }
})()

async function goToJaego() {
  const { data: { session } } = await supabase.auth.getSession()
  const base = 'https://oneul-jaego.vercel.app'
  if (session?.access_token) {
    window.location.href = `${base}?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
  } else {
    window.location.href = base
  }
}

function ProtectedLayout() {
  const { session, loading } = useAuth()
  const isPC = window.innerWidth >= 768
  const [onboarded, setOnboarded] = useState(null)

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('onboarded').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setOnboarded(data?.onboarded ?? false))
  }, [session])

  if (loading || (session && onboarded === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400 text-lg">불러오는 중...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (isPC) return <Navigate to="/dashboard" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      {/* 앱 스위처 */}
      <div className="bg-gray-900 flex items-center gap-2 px-4 h-8 shrink-0">
        <span className="text-sm font-bold text-brand">오늘장부</span>
        <span className="text-gray-600 text-sm">/</span>
        <button
          onClick={goToJaego}
          className="text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          오늘재고
        </button>
      </div>
      <div className="flex-1 pb-20">
        <Routes>
          <Route path="/input"    element={<Input />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/history"  element={<History />} />
          <Route path="/tax"      element={<Tax />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <NavBar />
    </div>
  )
}

function Home() {
  const { session, loading } = useAuth()
  if (loading) return null
  return session ? <Navigate to="/input" replace /> : <Landing />
}

function DashboardGuard() {
  const { session, loading } = useAuth()
  const isMobile = window.innerWidth < 768
  const [onboarded, setOnboarded] = useState(null)

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('onboarded').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setOnboarded(data?.onboarded ?? false))
  }, [session])

  if (loading || (session && onboarded === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400 text-lg">불러오는 중...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (isMobile) return <Navigate to="/input" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <DashboardLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<DashboardGuard />}>
          <Route index element={<Navigate to="/dashboard/home" replace />} />
          <Route path="home"      element={<DashboardHome />} />
          <Route path="input"     element={<DashboardInput />} />
          <Route path="biz"       element={<BizInfo />} />
          <Route path="report"    element={<MonthlyReport />} />
          <Route path="excel"     element={<ExcelExport />} />
          <Route path="tax"       element={<DashboardTax />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales"     element={<SalesItems />} />
          <Route path="workers"   element={<Workers />} />
          <Route path="board"          element={<Board />} />
          <Route path="fixed-expenses" element={<FixedExpenses />} />
        </Route>
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
