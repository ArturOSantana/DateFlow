import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as db from '../lib/db'
import type { DateEvent, Idea, PartnerGender } from '../types'

interface AppContextType {
  dates: DateEvent[]
  ideas: Idea[]
  loading: boolean
  refreshDates: () => Promise<void>
  refreshIdeas: () => Promise<void>
  /** Gênero da parceria ativa do usuário (para textos dinâmicos na UI) */
  partnerGender: PartnerGender | undefined
  refreshPartnerGender: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [dates, setDates] = useState<DateEvent[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [partnerGender, setPartnerGender] = useState<PartnerGender | undefined>(undefined)

  const refreshDates = useCallback(async () => {
    if (!user) return
    const data = await db.getDates(user.uid)
    setDates(data)
  }, [user])

  const refreshIdeas = useCallback(async () => {
    if (!user) return
    const data = await db.getIdeas(user.uid)
    setIdeas(data)
  }, [user])

  const refreshPartnerGender = useCallback(async () => {
    if (!user) return
    const all = await db.getMyPartnerships(user.uid, user.email ?? undefined)
    const active = all.find(p => p.status === 'accepted')
    setPartnerGender(active?.partnerGender)
  }, [user])

  useEffect(() => {
    if (!user) {
      setDates([])
      setIdeas([])
      setPartnerGender(undefined)
      return
    }
    setLoading(true)
    Promise.all([refreshDates(), refreshIdeas(), refreshPartnerGender()]).finally(() => setLoading(false))
  }, [user, refreshDates, refreshIdeas, refreshPartnerGender])

  return (
    <AppContext.Provider value={{ dates, ideas, loading, refreshDates, refreshIdeas, partnerGender, refreshPartnerGender }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
