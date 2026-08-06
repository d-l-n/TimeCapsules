import { json, randomId, PAIR_TTL_SECONDS, parseDevice, type PairingRecord } from '../../lib/pairing'

export interface Env {
  PAIRINGS: KVNamespace
  FIREBASE_CLIENT_EMAIL: string
  FIREBASE_PRIVATE_KEY: string
  FIREBASE_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = (await context.request.json().catch(() => null)) as { device?: unknown } | null
  const device = body ? parseDevice(body.device) : undefined
  const id = randomId()
  const record: PairingRecord = { status: 'pending', created_at: Math.floor(Date.now() / 1000), ...(device ? { device } : {}) }
  await context.env.PAIRINGS.put(`pair:${id}`, JSON.stringify(record), {
    expirationTtl: PAIR_TTL_SECONDS,
  })
  return json({ id })
}
