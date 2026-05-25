import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Input from './pages/Input.jsx'
import Calendar from './pages/Calendar.jsx'
import Tax from './pages/Tax.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Landing from './pages/Landing.jsx'
import NavBar from './components/NavBar.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import BizInfo from './pages/dashboard/BizInfo.jsx'
import MonthlyReport from './pages/dashboard/MonthlyReport.jsx'
import ExcelExport from './pages/dashboard/ExcelExport.jsx'
import DashboardTax from './pages/dashboard/DashboardTax.jsx'
import DashboardInput from './pages/dashboard/DashboardInput.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import { useAuth } from './hooks/useAuth.js'

function ProtectedLayout() {
  const { session, loading } = useAuth()
  const isPC = window.innerWidth >= 768

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400 text-lg">불러오는 중...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (isPC) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <div className="flex-1 pb-20">
        <Routes>
          <Route path="/input" element={<Input />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/tax" element={<Tax />} />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-400 text-lg">불러오는 중...</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (isMobile) return <Navigate to="/input" replace />
  return <DashboardLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/dashboard" element={<DashboardGuard />}>
          <Route index element={<Navigate to="/dashboard/input" replace />} />
          <Route path="input"  element={<DashboardInput />} />
          <Route path="biz"    element={<BizInfo />} />
          <Route path="report" element={<MonthlyReport />} />
          <Route path="excel"  element={<ExcelExport />} />
          <Route path="tax"    element={<DashboardTax />} />
        </Route>
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
