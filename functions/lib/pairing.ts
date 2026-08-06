export const PAIR_TTL_SECONDS = 180

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
}

export function parseDevice(raw: unknown): DeviceInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const d = raw as Record<string, unknown>
  if (d.type !== 'mobile' && d.type !== 'tablet' && d.type !== 'desktop') return undefined
  if (typeof d.browser !== 'string' || typeof d.os !== 'string') return undefined
  const browser = d.browser.trim().slice(0, 40)
  const os = d.os.trim().slice(0, 40)
  if (!browser || !os) return undefined
  return { type: d.type, browser, os }
}

export interface PairingRecord {
  status: 'pending' | 'done'
  created_at: number
  device?: DeviceInfo
  uid?: string
  custom_token?: string
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })

export const randomId = () => crypto.randomUUID()

const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let str = ''
  for (const byte of bytes) str += String.fromCharCode(byte)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function verifyIdToken(idToken: string, apiKey: string): Promise<string | null> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { users?: Array<{ localId?: string }> }
  return data.users?.[0]?.localId ?? null
}

export async function createCustomToken(uid: string, clientEmail: string, privateKey: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: now,
        exp: now + 3600,
        uid,
      }),
    ),
  )
  const pem = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  )
  return `${header}.${payload}.${b64url(signature)}`
}
