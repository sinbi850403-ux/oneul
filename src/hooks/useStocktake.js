import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STOCKTAKE_STATUS } from '../lib/constants'

// 실사 세션 목록
export function useStocktakeList() {
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    setLoading(true)
    const { data } = await supabase
      .from('stocktake')
      .select('id, status, started_at, finished_at')
      .order('started_at', { ascending: false })

    if (data) setList(data)
    setLoading(false)
  }

  // 실사 시작 → 현재 stock 스냅샷 저장
  async function startStocktake() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: session } = await supabase
      .from('stocktake')
      .insert({ user_id: user.id, status: STOCKTAKE_STATUS.IN_PROGRESS })
      .select()
      .single()

    if (!session) return null

    const { data: stocks } = await supabase
      .from('stock')
      .select('product_id, quantity')
      .eq('user_id', user.id)

    if (stocks?.length) {
      await supabase.from('stocktake_item').insert(
        stocks.map(s => ({
          stocktake_id: session.id,
          product_id:   s.product_id,
          system_qty:   s.quantity,
          actual_qty:   0,
        }))
      )
    }

    fetchList()
    return session.id
  }

  return { list, loading, startStocktake, refetch: fetchList }
}

// 실사 항목 조회 및 처리
export function useStocktakeDetail(stocktakeId) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [status,  setStatus]  = useState(null)

  useEffect(() => {
    if (stocktakeId) fetchItems()
  }, [stocktakeId])

  async function fetchItems() {
    setLoading(true)
    const [{ data: session }, { data }] = await Promise.all([
      supabase.from('stocktake').select('status').eq('id', stocktakeId).single(),
      supabase
        .from('stocktake_item')
        .select('id, system_qty, actual_qty, diff, adjusted, products(id, name, unit)')
        .eq('stocktake_id', stocktakeId)
        .order('products(name)'),
    ])

    if (session) setStatus(session.status)
    if (data) setItems(data)
    setLoading(false)
  }

  // 실물 수량 입력
  async function updateActualQty(itemId, actualQty) {
    await supabase
      .from('stocktake_item')
      .update({ actual_qty: actualQty })
      .eq('id', itemId)

    fetchItems()
  }

  // 오차 조정 처리
  async function adjustItem(itemId, productId, actualQty) {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.rpc('handle_stocktake_adjust', {
      p_item_id:    itemId,
      p_user_id:    user.id,
      p_product_id: productId,
      p_actual_qty: actualQty,
    })

    fetchItems()
  }

  // 실사 완료
  async function finishStocktake() {
    await supabase
      .from('stocktake')
      .update({ status: STOCKTAKE_STATUS.DONE, finished_at: new Date().toISOString() })
      .eq('id', stocktakeId)
  }

  return { items, loading, status, updateActualQty, adjustItem, finishStocktake, refetch: fetchItems }
}
