import { describe, it, expect } from 'vitest'
import { createCustomToken, parseDevice } from '../../functions/lib/pairing'

const toB64 = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
}

const toBytes = (s: string) => {
  const bin = atob(toB64(s))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str)
}

describe('createCustomToken', () => {
  it('emits an RS256 JWT with the expected claims and a valid signature', async () => {
    const keys = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
    const pem = `-----BEGIN PRIVATE KEY-----\n${toBase64(pkcs8)}\n-----END PRIVATE KEY-----`

    const email = 'svc@test.iam.gserviceaccount.com'
    const token = await createCustomToken('uid-123', email, pem)

    const [header, payload, signature] = token.split('.')
    expect(header).toBeTruthy()
    expect(payload).toBeTruthy()
    expect(signature).toBeTruthy()

    expect(JSON.parse(atob(toB64(header)))).toEqual({ alg: 'RS256', typ: 'JWT' })
    const claims = JSON.parse(atob(toB64(payload))) as Record<string, string | number>
    expect(claims.uid).toBe('uid-123')
    expect(claims.iss).toBe(email)
    expect(claims.sub).toBe(email)
    expect(claims.aud).toBe(
      'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    )
    expect(Number(claims.exp) - Number(claims.iat)).toBe(3600)

    const publicKey = await crypto.subtle.importKey(
      'spki',
      await crypto.subtle.exportKey('spki', keys.publicKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      toBytes(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    )
    expect(valid).toBe(true)
  })
})

describe('parseDevice', () => {
  it('accepts a valid device payload', () => {
    expect(parseDevice({ type: 'desktop', browser: 'Chrome', os: 'Windows' })).toEqual({
      type: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
    })
    expect(parseDevice({ type: 'tablet', browser: 'Safari', os: 'iPadOS' })).toEqual({
      type: 'tablet',
      browser: 'Safari',
      os: 'iPadOS',
    })
  })

  it('trims and caps string fields', () => {
    expect(parseDevice({ type: 'mobile', browser: '  Chrome  ', os: 'Android' })).toEqual({
      type: 'mobile',
      browser: 'Chrome',
      os: 'Android',
    })
    expect(parseDevice({ type: 'mobile', browser: 'X'.repeat(80), os: 'Android' })?.browser.length).toBe(40)
  })

  it('rejects invalid payloads', () => {
    expect(parseDevice(null)).toBeUndefined()
    expect(parseDevice('nope')).toBeUndefined()
    expect(parseDevice({ type: 'smartwatch', browser: 'Chrome', os: 'Windows' })).toBeUndefined()
    expect(parseDevice({ type: 'desktop', browser: '', os: 'Windows' })).toBeUndefined()
    expect(parseDevice({ type: 'desktop', browser: 'Chrome' })).toBeUndefined()
    expect(parseDevice({ type: 'desktop', browser: '   ', os: 'Windows' })).toBeUndefined()
  })
})
