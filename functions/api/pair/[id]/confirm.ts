import { json, PAIR_TTL_SECONDS, verifyIdToken, createCustomToken, type PairingRecord } from '../../../lib/pairing'
import type { Env } from '../index'

export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const id = String(context.params.id)
  const body = (await context.request.json().catch(() => null)) as { idToken?: string } | null
  const idToken = typeof body?.idToken === 'string' && body.idToken.length > 0 ? body.idToken : null
  if (!idToken) return json({ error: 'Missing idToken' }, 400)

  const { FIREBASE_API_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = context.env
  if (!FIREBASE_API_KEY || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return json({ error: 'Server not configured' }, 500)
  }

  const uid = await verifyIdToken(idToken, FIREBASE_API_KEY)
  if (!uid) return json({ error: 'Invalid session' }, 401)

  const key = `pair:${id}`
  const raw = await context.env.PAIRINGS.get(key)
  if (!raw) return json({ error: 'Not found' }, 404)

  const record = JSON.parse(raw) as PairingRecord
  if (record.status !== 'pending') return json({ error: 'Already used' }, 409)

  const now = Math.floor(Date.now() / 1000)
  if (now - record.created_at > PAIR_TTL_SECONDS) {
    await context.env.PAIRINGS.delete(key)
    return json({ error: 'Expired' }, 410)
  }

  const customToken = await createCustomToken(uid, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  const done: PairingRecord = { status: 'done', created_at: record.created_at, uid, custom_token: customToken }
  await context.env.PAIRINGS.put(key, JSON.stringify(done), {
    expirationTtl: Math.max(1, PAIR_TTL_SECONDS - (now - record.created_at)),
  })

  return json({ ok: true })
}
