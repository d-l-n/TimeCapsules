import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from './firebase-auth'
import { useI18n } from './I18nContext'

interface AuthCtx {
  user: User | null
  loading: boolean
  loginGoogle: () => Promise<void>
  loginEmail: (email: string, password: string) => Promise<void>
  registerEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const seeded = useRef(false)
  const { lang } = useI18n()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    if (!user?.uid || seeded.current) return
    seeded.current = true
    ;(async () => {
      const [{ ensureDefaultLists, syncDefaultLists }, { gatherSeedData }] = await Promise.all([
        import('../services/listService'),
        import('../services/dashboardData'),
      ])
      await ensureDefaultLists(user.uid, lang)
      const seed = await gatherSeedData(user.uid, lang)
      await syncDefaultLists(user.uid, seed)
    })().catch(() => {})
  }, [user?.uid, lang])

  const loginGoogle = async () => { await signInWithPopup(auth, googleProvider) }
  const loginEmail = async (email: string, password: string) => { await signInWithEmailAndPassword(auth, email, password) }
  const registerEmail = async (email: string, password: string) => { await createUserWithEmailAndPassword(auth, email, password) }
  const logout = async () => { await signOut(auth) }
  const refreshUser = async () => { if (auth.currentUser) { await auth.currentUser.reload(); setUser({ ...auth.currentUser }) } }

  return <AuthContext.Provider value={{ user, loading, loginGoogle, loginEmail, registerEmail, logout, refreshUser }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
