import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STOCK_TYPES, STOCK_SOURCES, LOG_LIMIT } from '../lib/constants'

// 입고
export async function stockIn(userId, productId, quantity, note = null) {
  const { error } = await supabase.rpc('handle_stock_in', {
    p_user_id:    userId,
    p_product_id: productId,
    p_quantity:   quantity,
    p_note:       note,
  })
  if (error) throw new Error(error.message)
}

// 출고
export async function stockOut(userId, productId, quantity, note = null) {
  const { error } = await supabase.rpc('handle_stock_out', {
    p_user_id:    userId,
    p_product_id: productId,
    p_quantity:   quantity,
    p_note:       note,
  })
  if (error) throw new Error(error.message)
}

// 반품
export async function stockReturn(userId, productId, quantity, note = null) {
  const { error } = await supabase.rpc('handle_stock_return', {
    p_user_id:    userId,
    p_product_id: productId,
    p_quantity:   quantity,
    p_note:       note,
  })
  if (error) throw new Error(error.message)
}

// 입출고 이력 조회
export function useStockLog(productId = null) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)

  async function fetchLogs() {
    setLoading(true)
    let query = supabase
      .from('stock_log')
      .select('id, type, quantity, source, note, created_at, products(name, unit)')
      .order('created_at', { ascending: false })
      .limit(LOG_LIMIT)

    if (productId) query = query.eq('product_id', productId)

    const { data } = await query
    if (data) setLogs(data)
    setLoading(false)
  }

  return { logs, loading, fetchLogs }
}

// 엑셀 업로드 → products + stock 일괄 INSERT
export async function uploadProductsFromExcel(parsedRows) {
  const { data: { user } } = await supabase.auth.getUser()

  for (const row of parsedRows) {
    // 중복 name은 SKIP
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', row.name)
      .single()

    if (existing) continue

    const { data: product } = await supabase
      .from('products')
      .insert({ user_id: user.id, name: row.name, unit: row.unit })
      .select()
      .single()

    if (product) {
      await supabase
        .from('stock')
        .insert({ user_id: user.id, product_id: product.id, quantity: row.quantity })
    }
  }
}
