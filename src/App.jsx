import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import './styles/global.css'

import Home            from './pages/Home'
import StockIn         from './pages/StockIn'
import StockOut        from './pages/StockOut'
import Return          from './pages/Return'
import Products        from './pages/Products'
import ProductAdd      from './pages/ProductAdd'
import Stocktake       from './pages/Stocktake'
import StocktakeDetail from './pages/StocktakeDetail'
import Login           from './pages/Login'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"              element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/stock-in"      element={<PrivateRoute><StockIn /></PrivateRoute>} />
          <Route path="/stock-out"     element={<PrivateRoute><StockOut /></PrivateRoute>} />
          <Route path="/return"        element={<PrivateRoute><Return /></PrivateRoute>} />
          <Route path="/products"      element={<PrivateRoute><Products /></PrivateRoute>} />
          <Route path="/products/add"  element={<PrivateRoute><ProductAdd /></PrivateRoute>} />
          <Route path="/stocktake"     element={<PrivateRoute><Stocktake /></PrivateRoute>} />
          <Route path="/stocktake/:id" element={<PrivateRoute><StocktakeDetail /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
