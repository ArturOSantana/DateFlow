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
  refreshPartnerGender: () => Promise<void>
  /** Gênero do próprio usuário logado (como ele/ela aparece para a outra pessoa) */
  ownerGender: PartnerGender | undefined
  refreshOwnerGender: () => Promise<void>
  /** Dates planejados pelo parceiro/parceira para o usuário logado */
  incomingDates: DateEvent[]
  /** Nome do parceiro/parceira que planejou os incomingDates */
  partnerName: string
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

  const refreshPartnerGender = useCallback(async () => {
    if (!user) return
    const all = await db.getMyPartnerships(user.uid, user.email ?? undefined)
    const active = all.find(p => p.status === 'accepted')
    if (!active) { setPartnerGender(undefined); return }
    // Usa o gênero que o próprio parceiro definiu no perfil dele
    const partnerId = active.requesterId === user.uid ? active.recipientId : active.requesterId
    if (!partnerId) { setPartnerGender(undefined); return }
    const gender = await db.getUserGender(partnerId)
    setPartnerGender(gender)
  }, [user])

  const refreshOwnerGender = useCallback(async () => {
    if (!user) return
    const g = await db.getUserGender(user.uid)
    setOwnerGender(g)
  }, [user])

  const refreshIncomingDates = useCallback(async () => {
    if (!user) return
    const all = await db.getMyPartnerships(user.uid, user.email ?? undefined)
    const active = all.find(p => p.status === 'accepted')
    if (!active) { setIncomingDates([]); setPartnerName(''); return }
    const ownerId = active.requesterId === user.uid ? active.recipientId : active.requesterId
    const name    = active.requesterId === user.uid ? active.recipientName : active.requesterName
    const email   = active.requesterId === user.uid ? active.recipientEmail : active.requesterEmail
    if (!ownerId) { setIncomingDates([]); setPartnerName(''); return }
    const data = await db.getDatesByOwnerForViewer(ownerId, user.uid)
    setIncomingDates(data)
    setPartnerName(name || email || '')
  }, [user])

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
      refreshPartnerGender(),
      refreshOwnerGender(),
      refreshIncomingDates(),
    ]).finally(() => setLoading(false))
  }, [user, refreshDates, refreshIdeas, refreshPartnerGender, refreshOwnerGender, refreshIncomingDates])

  return (
    <AppContext.Provider value={{
      dates, ideas, loading,
      refreshDates, refreshIdeas,
      partnerGender, refreshPartnerGender,
      ownerGender, refreshOwnerGender,
      incomingDates, partnerName, refreshIncomingDates,
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
