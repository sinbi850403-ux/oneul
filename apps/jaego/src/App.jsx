import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import SuiteBar from './components/SuiteBar'
import { supabase } from './lib/supabase'
import './styles/global.css'

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

import Home            from './pages/Home'
import StockIn         from './pages/StockIn'
import StockOut        from './pages/StockOut'
import Return          from './pages/Return'
import Products        from './pages/Products'
import ProductAdd      from './pages/ProductAdd'
import ProductDetail   from './pages/ProductDetail'
import Stocktake       from './pages/Stocktake'
import StocktakeDetail from './pages/StocktakeDetail'
import StockStatus     from './pages/StockStatus'
import History         from './pages/History'
import Suppliers       from './pages/Suppliers'
import Orders          from './pages/Orders'
import OrderDetail     from './pages/OrderDetail'
import Settings        from './pages/Settings'
import Board           from './pages/Board'
import SalesRanking    from './pages/SalesRanking'
import BulkStockEdit   from './pages/BulkStockEdit'
import Onboarding      from './pages/Onboarding'
import Login           from './pages/Login'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SuiteBar />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"              element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/stock-in"      element={<PrivateRoute><StockIn /></PrivateRoute>} />
          <Route path="/stock-out"     element={<PrivateRoute><StockOut /></PrivateRoute>} />
          <Route path="/return"        element={<PrivateRoute><Return /></PrivateRoute>} />
          <Route path="/products"      element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/products/add"  element={<PrivateRoute><ProductAdd /></PrivateRoute>} />
          <Route path="/products/:id"  element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
          <Route path="/stocktake"     element={<PrivateRoute><Stocktake /></PrivateRoute>} />
          <Route path="/stocktake/:id" element={<PrivateRoute><StocktakeDetail /></PrivateRoute>} />
          <Route path="/stock-status"  element={<PrivateRoute><StockStatus /></PrivateRoute>} />
          <Route path="/history"       element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/suppliers"     element={<PrivateRoute><Suppliers /></PrivateRoute>} />
          <Route path="/orders"        element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/orders/:id"    element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
          <Route path="/settings"       element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/bulk-stock-edit" element={<PrivateRoute><BulkStockEdit /></PrivateRoute>} />
          <Route path="/board"          element={<PrivateRoute><Board /></PrivateRoute>} />
          <Route path="/sales-ranking" element={<PrivateRoute><SalesRanking /></PrivateRoute>} />
          <Route path="/onboarding"    element={<Onboarding />} />
        </Routes>
      </BrowserRouter>
      </div>
    </AuthProvider>
  )
}
