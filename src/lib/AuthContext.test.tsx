import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nProvider } from './I18nContext'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('./firebase-auth', () => ({
  app: {},
  auth: {},
  googleProvider: {},
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('./firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
}))

vi.mock('../services/listService', () => ({
  ensureDefaultLists: vi.fn(() => Promise.resolve()),
  syncDefaultLists: vi.fn(() => Promise.resolve()),
}))

vi.mock('../services/dashboardData', () => ({
  gatherSeedData: vi.fn(() => Promise.resolve({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

const firebaseAuth = await import('firebase/auth')

const mockUser = { uid: 'user-1', email: 'test@test.com', displayName: 'Test User' } as any

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  )
}

describe('AuthContext', () => {
  let authStateCallback: ((user: any) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((_auth, cb) => {
      authStateCallback = cb as (user: any) => void
      return () => {}
    })
  })

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user and stops loading after auth state resolves', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => { authStateCallback?.(mockUser) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(mockUser)
  })

  it('sets user=null when signed out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => { authStateCallback?.(mockUser) })
    await waitFor(() => expect(result.current.user).toBeTruthy())

    act(() => { authStateCallback?.(null) })
    await waitFor(() => expect(result.current.user).toBeNull())
  })

  it('loginGoogle calls signInWithPopup', async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue({} as any)
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => { authStateCallback?.(mockUser) })

    await act(() => result.current.loginGoogle())
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledOnce()
  })

  it('loginEmail calls signInWithEmailAndPassword', async () => {
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({} as any)
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => { authStateCallback?.(mockUser) })

    await act(() => result.current.loginEmail('a@b.com', 'pass'))
    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'a@b.com', 'pass')
  })

  it('registerEmail calls createUserWithEmailAndPassword', async () => {
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({} as any)
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => { authStateCallback?.(mockUser) })

    await act(() => result.current.registerEmail('a@b.com', 'pass'))
    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'a@b.com', 'pass')
  })

  it('logout calls signOut', async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => { authStateCallback?.(mockUser) })

    await act(() => result.current.logout())
    expect(firebaseAuth.signOut).toHaveBeenCalledOnce()
  })
})
