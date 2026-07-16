import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | undefined

    // Aguarda o resultado do redirect ANTES de liberar o loading.
    // Sem esse await, o onAuthStateChanged dispara user=null enquanto
    // o getRedirectResult ainda está processando, causando redirect para /login.
    getRedirectResult(auth)
      .catch(() => {
        // Usuário cancelou ou erro de rede — segue o fluxo normal
      })
      .finally(() => {
        // Só registra o listener depois que o redirect foi processado
        unsub = onAuthStateChanged(auth, u => {
          setUser(u)
          setLoading(false)
        })
      })

    return () => unsub?.()
  }, [])

  async function signInWithGoogle() {
    await signInWithRedirect(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
