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
  /** Gênero da parceria ativa (como o usuário chama a outra pessoa: ela/ele) */
  partnerGender: PartnerGender | undefined
  /** Gênero do próprio usuário logado (como ele/ela aparece para a outra pessoa) */
  ownerGender: PartnerGender | undefined
  /** Dates planejados pelo parceiro/parceira para o usuário logado */
  incomingDates: DateEvent[]
  /** Nome do parceiro/parceira que planejou os incomingDates */
  partnerName: string
  /** Recarrega todos os dados que dependem da parceria ativa de uma vez */
  refreshPartnerData: () => Promise<void>
  /** @deprecated use refreshPartnerData */
  refreshPartnerGender: () => Promise<void>
  /** @deprecated use refreshPartnerData */
  refreshOwnerGender: () => Promise<void>
  /** @deprecated use refreshPartnerData */
  refreshIncomingDates: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [dates, setDates] = useState<DateEvent[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [partnerGender, setPartnerGender] = useState<PartnerGender | undefined>(undefined)
  const [ownerGender, setOwnerGender] = useState<PartnerGender | undefined>(undefined)
  const [incomingDates, setIncomingDates] = useState<DateEvent[]>([])
  const [partnerName, setPartnerName] = useState('')

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

  /**
   * Busca tudo que depende da parceria com um único round de reads ao Firestore:
   * partnerships (1 query) + ownerGender (1 getDoc) → se há parceiro ativo:
   * partnerGender (1 getDoc) + incomingDates (1 query) em paralelo.
   */
  const refreshPartnerData = useCallback(async () => {
    if (!user) return
    const { partnerGender, ownerGender, incomingDates, partnerName } =
      await db.getPartnerBootstrap(user.uid, user.email ?? undefined)
    setPartnerGender(partnerGender)
    setOwnerGender(ownerGender)
    setIncomingDates(incomingDates)
    setPartnerName(partnerName)
  }, [user])

  // Aliases de compatibilidade para código existente que chama os três refreshes separados
  const refreshPartnerGender  = refreshPartnerData
  const refreshOwnerGender    = refreshPartnerData
  const refreshIncomingDates  = refreshPartnerData

  useEffect(() => {
    if (!user) {
      setDates([])
      setIdeas([])
      setPartnerGender(undefined)
      setOwnerGender(undefined)
      setIncomingDates([])
      setPartnerName('')
      return
    }
    setLoading(true)
    Promise.all([
      refreshDates(),
      refreshIdeas(),
      refreshPartnerData(),
    ]).finally(() => setLoading(false))
  }, [user, refreshDates, refreshIdeas, refreshPartnerData])

  return (
    <AppContext.Provider value={{
      dates, ideas, loading,
      refreshDates, refreshIdeas,
      partnerGender,
      ownerGender,
      incomingDates, partnerName,
      refreshPartnerData,
      refreshPartnerGender,
      refreshOwnerGender,
      refreshIncomingDates,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
