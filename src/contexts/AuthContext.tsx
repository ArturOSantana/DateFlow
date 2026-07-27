import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { signInWithGoogle as signInWithGoogleMobile } from '../lib/mobileAuth'

interface AuthContextType {
  user: User | null
  loading: boolean
  authError: string | null
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    setAuthError(null)
    setSigningIn(true)
    try {
      await signInWithGoogleMobile(auth)
    } catch (err) {
      console.error('[Auth] Google Sign-In error:', err)
      setAuthError(err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.')
    } finally {
      setSigningIn(false)
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading: loading || signingIn, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
