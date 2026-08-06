import type { DeviceInfo } from './deviceInfo'

export type { DeviceInfo }

const base = (import.meta.env.VITE_PAIR_WORKER_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

export type PairingStatus = 'pending' | 'done' | 'expired' | 'not_found'

export interface PairingPoll {
  status: PairingStatus
  customToken?: string
  device?: DeviceInfo
}

export async function createPairing(device?: DeviceInfo): Promise<{ id: string }> {
  const res = await fetch(`${base}/api/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device ? { device } : {}),
  })
  if (!res.ok) throw new Error('pairing:create')
  return res.json() as Promise<{ id: string }>
}

export async function pollPairing(id: string): Promise<PairingPoll> {
  const res = await fetch(`${base}/api/pair/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('pairing:poll')
  return res.json() as Promise<PairingPoll>
}

export async function confirmPairing(id: string, idToken: string): Promise<void> {
  const res = await fetch(`${base}/api/pair/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    let message = 'pairing:confirm'
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = `pairing:${data.error}`
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }
}
