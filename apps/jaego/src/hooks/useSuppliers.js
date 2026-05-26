import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, contact_name, phone, email, memo, created_at')
      .order('name')
    if (data) setSuppliers(data)
    setLoading(false)
  }

  async function addSupplier({ name, contact_name = '', phone = '', email = '', memo = '' }) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('suppliers').insert({ user_id: user.id, name, contact_name, phone, email, memo })
    fetchAll()
  }

  async function updateSupplier(id, updates) {
    await supabase.from('suppliers').update(updates).eq('id', id)
    fetchAll()
  }

  async function deleteSupplier(id) {
    await supabase.from('suppliers').delete().eq('id', id)
    fetchAll()
  }

  return { suppliers, loading, addSupplier, updateSupplier, deleteSupplier, refetch: fetchAll }
}
