// Edge Function: 재고부족 푸시 알림
// 호출: stockOut 이후 클라이언트에서 직접 호출
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID JWT 생성 (web-push 라이브러리 없이 직접 구현)
async function makeVapidJwt(endpoint: string, privateKeyB64: string): Promise<string> {
  const origin = new URL(endpoint).origin
  const now    = Math.floor(Date.now() / 1000)
  const header  = { alg: 'ES256', typ: 'JWT' }
  const payload = { aud: origin, exp: now + 12 * 3600, sub: 'mailto:admin@oneul.app' }

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const sigInput = `${b64url(header)}.${b64url(payload)}`

  // Import private key
  const keyData = Uint8Array.from(
    atob(privateKeyB64.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  )
  const privKey = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(sigInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${sigInput}.${sigB64}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { userId, productName, currentStock, minQuantity } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 해당 유저의 push subscription 조회
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.subscription) {
      return new Response(JSON.stringify({ ok: false, reason: 'no subscription' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const subscription = JSON.parse(sub.subscription)
    const { endpoint, keys } = subscription

    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!

    const jwt = await makeVapidJwt(endpoint, VAPID_PRIVATE_KEY)

    // 알림 페이로드
    const payload = JSON.stringify({
      title: '⚠️ 재고 부족 알림',
      body: `${productName} 재고가 ${currentStock}개 남았어요 (안전재고: ${minQuantity}개)`,
      url: 'https://oneul-jaego.vercel.app/stock-status',
    })

    // Web Push 암호화 (Content-Encoding: aes128gcm)
    // auth, p256dh keys 사용
    const authKey = Uint8Array.from(
      atob(keys.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)
    )
    const p256dhKey = Uint8Array.from(
      atob(keys.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)
    )

    // Import subscriber public key
    const subscriberPublicKey = await crypto.subtle.importKey(
      'raw', p256dhKey.buffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, []
    )

    // Generate ephemeral key pair
    const serverKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true, ['deriveBits']
    )
    const serverPublicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
    )

    // Derive shared secret
    const sharedBits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'ECDH', public: subscriberPublicKey },
        serverKeyPair.privateKey, 256
      )
    )

    // salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // PRK (HMAC-SHA256)
    async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
      const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
    }
    function concat(...arrays: Uint8Array[]): Uint8Array {
      const len = arrays.reduce((a, b) => a + b.length, 0)
      const out = new Uint8Array(len)
      let pos = 0
      for (const arr of arrays) { out.set(arr, pos); pos += arr.length }
      return out
    }
    function str(s: string) { return new TextEncoder().encode(s) }

    const prk = await hmac(salt, sharedBits)

    // info strings
    const keyInfo    = concat(str('Content-Encoding: aes128gcm\0'), new Uint8Array([0x01]))
    const nonceInfo  = concat(str('Content-Encoding: nonce\0'), new Uint8Array([0x01]))

    const [contentKey, nonce] = await Promise.all([
      hmac(prk, keyInfo).then(k => k.slice(0, 16)),
      hmac(prk, nonceInfo).then(n => n.slice(0, 12)),
    ])

    // Encrypt
    const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt'])
    const payloadBytes = new TextEncoder().encode(payload)
    const paddedPayload = concat(payloadBytes, new Uint8Array([2])) // delimiter
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload)
    )

    // Build header
    const recordSize = new Uint8Array(4)
    new DataView(recordSize.buffer).setUint32(0, encrypted.length + 16, false)
    const header = concat(
      salt,
      recordSize,
      new Uint8Array([serverPublicKeyRaw.length]),
      serverPublicKeyRaw,
    )

    const body = concat(header, encrypted)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '60',
      },
      body,
    })

    if (res.status === 410 || res.status === 404) {
      // 구독 만료 — 삭제
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }

    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
