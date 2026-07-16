import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as db from '../lib/db'
import type { DateEvent, Idea } from '../types'

interface AppContextType {
  dates: DateEvent[]
  ideas: Idea[]
  loading: boolean
  refreshDates: () => Promise<void>
  refreshIdeas: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [dates, setDates] = useState<DateEvent[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (!user) {
      setDates([])
      setIdeas([])
      return
    }
    setLoading(true)
    Promise.all([refreshDates(), refreshIdeas()]).finally(() => setLoading(false))
  }, [user, refreshDates, refreshIdeas])

  return (
    <AppContext.Provider value={{ dates, ideas, loading, refreshDates, refreshIdeas }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
