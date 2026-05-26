import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error('Supabase URL과 Key가 필요합니다.')
  }
  return createClient(url, key)
}
