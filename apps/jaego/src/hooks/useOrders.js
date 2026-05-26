import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { stockIn } from './useStock'
import { ORDER_STATUS } from '../lib/constants'

export function useOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, note, created_at, completed_at, suppliers(name)')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
    setLoading(false)
  }

  async function createOrder({ supplier_id = null, note = '' } = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: order } = await supabase
      .from('orders')
      .insert({ user_id: user.id, supplier_id: supplier_id || null, note, status: ORDER_STATUS.PENDING })
      .select()
      .single()
    fetchAll()
    return order
  }

  async function cancelOrder(orderId) {
    await supabase.from('orders').update({ status: ORDER_STATUS.CANCELLED }).eq('id', orderId)
    fetchAll()
  }

  return { orders, loading, createOrder, cancelOrder, refetch: fetchAll }
}

export function useOrderDetail(orderId) {
  const [order,   setOrder]   = useState(null)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (orderId) fetchDetail() }, [orderId])

  async function fetchDetail() {
    setLoading(true)
    const [{ data: orderData }, { data: itemsData }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, status, note, created_at, completed_at, suppliers(name)')
        .eq('id', orderId)
        .single(),
      supabase
        .from('order_items')
        .select('id, quantity, products(id, name, unit, stock(quantity))')
        .eq('order_id', orderId),
    ])
    if (orderData) setOrder(orderData)
    if (itemsData) setItems(itemsData)
    setLoading(false)
  }

  async function addItem(productId, quantity) {
    await supabase.from('order_items').insert({ order_id: orderId, product_id: productId, quantity })
    fetchDetail()
  }

  async function removeItem(itemId) {
    await supabase.from('order_items').delete().eq('id', itemId)
    fetchDetail()
  }

  async function updateItemQty(itemId, quantity) {
    await supabase.from('order_items').update({ quantity }).eq('id', itemId)
    fetchDetail()
  }

  async function completeOrder() {
    const { data: { user } } = await supabase.auth.getUser()
    for (const item of items) {
      await stockIn(user.id, item.products.id, item.quantity, `발주 입고 #${orderId.slice(0, 8)}`)
    }
    await supabase
      .from('orders')
      .update({ status: ORDER_STATUS.COMPLETED, completed_at: new Date().toISOString() })
      .eq('id', orderId)
    fetchDetail()
  }

  return { order, items, loading, addItem, removeItem, updateItemQty, completeOrder, refetch: fetchDetail }
}
