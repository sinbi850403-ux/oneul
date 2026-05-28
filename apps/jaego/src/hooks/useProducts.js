import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SEARCH_LIMIT, FAVORITE_LIMIT } from '../lib/constants'

// 즐겨찾기 상품 + 재고 조회
export function useFavoriteProducts() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    fetchFavorites()
  }, [])

  async function fetchFavorites() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, unit, price, selling_price, is_favorite, min_quantity, stock(quantity, avg_cost)')
      .eq('is_favorite', true)
      .order('name')
      .limit(FAVORITE_LIMIT)

    if (error) setError(error.message)
    else setProducts(data)
    setLoading(false)
  }

  return { products, loading, error, refetch: fetchFavorites }
}

// 상품 검색 자동완성
export function useProductSearch() {
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)

  async function search(keyword) {
    if (!keyword || keyword.length < 1) {
      setResults([])
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, unit, price, selling_price, min_quantity, stock(quantity, avg_cost)')
      .ilike('name', `${keyword}%`)
      .limit(SEARCH_LIMIT)

    if (!error) setResults(data)
    setLoading(false)
  }

  function clear() { setResults([]) }

  return { results, loading, search, clear }
}

// 상품 전체 목록
export function useAllProducts() {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, unit, price, selling_price, is_favorite, min_quantity, category, stock(quantity, avg_cost)')
      .order('name')

    if (data) setProducts(data)
    setLoading(false)
  }

  async function toggleFavorite(productId, current) {
    await supabase
      .from('products')
      .update({ is_favorite: !current })
      .eq('id', productId)

    fetchAll()
  }

  async function addProduct({ name, unit, quantity, price = 0, sellingPrice = 0, category = '일반' }) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: product } = await supabase
      .from('products')
      .insert({ user_id: user.id, name, unit, price, selling_price: sellingPrice, category })
      .select()
      .single()

    if (product) {
      await supabase
        .from('stock')
        .insert({ user_id: user.id, product_id: product.id, quantity })
    }

    fetchAll()
  }

  async function updateMinQuantity(productId, minQty) {
    await supabase.from('products').update({ min_quantity: minQty }).eq('id', productId)
    fetchAll()
  }

  return { products, loading, toggleFavorite, addProduct, updateMinQuantity, refetch: fetchAll }
}
