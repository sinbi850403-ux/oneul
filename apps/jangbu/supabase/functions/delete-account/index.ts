import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '인증 정보가 없습니다.' }), {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: '유효하지 않은 토큰입니다.' }), {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  await adminClient.from('sales').delete().eq('user_id', user.id)
  await adminClient.from('profiles').delete().eq('user_id', user.id)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
})
