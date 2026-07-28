import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as db from '../lib/db'
import type { DateEvent, Idea, PartnerGender, Partnership } from '../types'

interface AppContextType {
  dates: DateEvent[]
  ideas: Idea[]
  loading: boolean
  /** Parcerias do usuário — carregadas no boot, sem re-fetch adicional */
  partnerships: Partnership[]
  refreshDates: () => Promise<void>
  refreshIdeas: () => Promise<void>
  /**
   * Atualiza um date localmente no state sem fazer nova leitura ao Firestore.
   * Use após qualquer `db.updateDate(id, patch)` para economizar reads.
   */
  updateDateLocally: (id: string, patch: Partial<DateEvent>) => void
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
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [partnerGender, setPartnerGender] = useState<PartnerGender | undefined>(undefined)
  const [ownerGender, setOwnerGender] = useState<PartnerGender | undefined>(undefined)
  const [incomingDates, setIncomingDates] = useState<DateEvent[]>([])
  const [partnerName, setPartnerName] = useState('')

  const refreshDates = useCallback(async () => {
    if (!user) return
    const data = await db.getDates(user.uid)
    setDates(data)
  }, [user])

  /** Atualiza um date em memória sem re-fetch ao Firestore */
  const updateDateLocally = useCallback((id: string, patch: Partial<DateEvent>) => {
    setDates(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }, [])

  const refreshIdeas = useCallback(async () => {
    if (!user) return
    const data = await db.getIdeas(user.uid)
    setIdeas(data)
  }, [user])

  /**
   * Busca tudo que depende da parceria com um único round de reads ao Firestore:
   * partnerships (1 query) + ownerGender (1 getDoc) → se há parceiro ativo:
   * partnerGender (1 getDoc) + incomingDates (1 query) em paralelo.
   *
   * As parcerias brutas são cacheadas em `partnerships` para que páginas
   * como DateForm, DateDetail e WatchlistPage não precisem re-fetchar.
   */
  const refreshPartnerData = useCallback(async () => {
    if (!user) return
    // Busca as parcerias separadamente para cachear no state
    const allPartnerships = await db.getMyPartnerships(user.uid, user.email ?? undefined)
    setPartnerships(allPartnerships)
    const { partnerGender, ownerGender, incomingDates, partnerName } =
      await db.getPartnerBootstrapFromPartnerships(allPartnerships, user.uid, user.email ?? undefined)
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
      setPartnerships([])
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
      partnerships,
      refreshDates, refreshIdeas,
      updateDateLocally,
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
