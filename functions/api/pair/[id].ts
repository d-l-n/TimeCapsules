import { json, PAIR_TTL_SECONDS, type PairingRecord } from '../../lib/pairing'
import type { Env } from './index'

export const onRequestGet: PagesFunction<Env, 'id'> = async (context) => {
  const id = String(context.params.id)
  const key = `pair:${id}`
  const raw = await context.env.PAIRINGS.get(key)
  if (!raw) return json({ status: 'not_found' })

  const record = JSON.parse(raw) as PairingRecord
  const now = Math.floor(Date.now() / 1000)
  if (now - record.created_at > PAIR_TTL_SECONDS) {
    await context.env.PAIRINGS.delete(key)
    return json({ status: 'expired' })
  }

  if (record.status === 'done' && record.custom_token) {
    await context.env.PAIRINGS.delete(key)
    return json({ status: 'done', customToken: record.custom_token })
  }

  return json({ status: 'pending', device: record.device })
}
