import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, ChevronRight, Users, Heart, MapPin, Utensils, Save, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import * as dbApi from '../lib/db'
import { getPronouns } from '../lib/gender'
import type { PartnerGender, PreferenceCategory } from '../types'

const EMPTY_PREFS: PreferenceCategory = {
  activitiesLoves: [],
  placesLoves: [],
  placesNever: [],
  placesTolerate: [],
  foodLoves: [],
  foodNever: [],
  foodTolerate: [],
  otherNotes: '',
}

// ─── Mini componente de lista de tags editável ────────────────────────────────
function TagList({
  label,
  color,
  items,
  onChange,
}: {
  label: string
  color: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [input, setInput] = useState('')

  function add() {
    const val = input.trim()
    if (!val || items.includes(val)) return
    onChange([...items, val])
    setInput('')
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-stone-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}
          >
            {item}
            <button onClick={() => remove(i)} className="hover:opacity-70">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="input text-xs flex-1 py-1.5"
          placeholder="Adicionar…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button
          onClick={add}
          className="btn-secondary text-xs px-2 py-1"
          title="Adicionar"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { dates, ideas, partnerGender, ownerGender, refreshOwnerGender } = useApp()
  const navigate = useNavigate()

  const [prefs, setPrefs] = useState<PreferenceCategory>(EMPTY_PREFS)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [savingGender, setSavingGender] = useState(false)

  const stats = [
    { label: 'Dates criados', value: dates.length },
    { label: 'Realizados', value: dates.filter(d => d.status === 'done').length },
    { label: 'Ideias salvas', value: ideas.length },
    { label: 'Favoritos', value: ideas.filter(i => i.favorite).length },
  ]

  useEffect(() => {
    if (!user) return
    dbApi.getUserPreferences(user.uid).then(p => {
      if (p) setPrefs(p)
      setLoadingPrefs(false)
    })
  }, [user])

  async function handleGenderChange(g: PartnerGender) {
    if (!user) return
    setSavingGender(true)
    await dbApi.saveUserGender(user.uid, g)
    await refreshOwnerGender()
    setSavingGender(false)
  }

  const hasAnyPref = !loadingPrefs && (
    prefs.activitiesLoves.length > 0 ||
    prefs.placesLoves.length > 0 ||
    prefs.placesNever.length > 0 ||
    prefs.placesTolerate.length > 0 ||
    prefs.foodLoves.length > 0 ||
    prefs.foodNever.length > 0 ||
    prefs.foodTolerate.length > 0 ||
    prefs.otherNotes.trim().length > 0
  )

  function setField<K extends keyof PreferenceCategory>(key: K, value: PreferenceCategory[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  async function savePrefs() {
    if (!user) return
    setSaving(true)
    await dbApi.saveUserPreferences(user.uid, prefs)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const pg = getPronouns(partnerGender)

  return (
    <div className="p-5 md:p-7 max-w-lg">
      <h1 className="text-base font-semibold text-stone-900 mb-5">Perfil</h1>

      {/* ── User card ── */}
      <div className="card p-5 flex items-center gap-4 mb-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
            <User size={20} className="text-stone-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900">{user?.displayName}</p>
          <p className="text-sm text-stone-500 truncate">{user?.email}</p>
        </div>
      </div>

      {/* ── Meu gênero — como a parceira/parceiro me vê ── */}
      <div className="card p-4 mb-4">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Meu gênero</p>
        <p className="text-xs text-stone-400 mb-3">
          Define como {pg.subject} vai te ver: "ele planejou" ou "ela planejou".
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenderChange('m')}
            disabled={savingGender}
            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
              ownerGender === 'm' || ownerGender === undefined
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'border-stone-200 text-stone-400 hover:bg-stone-50'
            }`}
          >
            Homem
          </button>
          <button
            onClick={() => handleGenderChange('f')}
            disabled={savingGender}
            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
              ownerGender === 'f'
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'border-stone-200 text-stone-400 hover:bg-stone-50'
            }`}
          >
            Mulher
          </button>
        </div>
        {savingGender && <p className="text-xs text-stone-400 mt-2">Salvando…</p>}
      </div>

      {/* ── Banner CTA: aparece só quando preferências estão totalmente vazias ── */}
      {!loadingPrefs && !hasAnyPref && (
        <button
          onClick={() => setPrefsOpen(true)}
          className="w-full mb-4 text-left card p-4 border border-dashed border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
              <Heart size={15} className="text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">Conte suas preferências</p>
              <p className="text-xs text-rose-600 mt-0.5 leading-relaxed">
                Adicione o que você gosta, onde quer ir e o que come — {pg.subject} usará isso para planejar os dates perfeitos para você.
              </p>
              <p className="text-xs font-medium text-rose-500 mt-2">Toque para preencher →</p>
            </div>
          </div>
        </button>
      )}

      {/* ── Preferências (accordion) ── */}
      {!loadingPrefs && (
        <div className="card mb-5 overflow-hidden">
          {/* Cabeçalho clicável */}
          <button
            onClick={() => setPrefsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              <span className="text-sm font-medium text-stone-900">Minhas preferências</span>
              {hasAnyPref
                ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Preenchidas</span>
                : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-semibold">Vazio</span>
              }
            </span>
            <ChevronRight
              size={14}
              className={`text-stone-400 transition-transform duration-200 shrink-0 ${prefsOpen ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Resumo quando fechado */}
          {!prefsOpen && (
            <p className="px-4 pb-3.5 text-xs text-stone-400 -mt-1">
              {hasAnyPref
                ? `${pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} vê essas informações ao planejar os dates.`
                : `Toque para preencher — ${pg.subject} vai adorar saber o que você gosta.`}
            </p>
          )}

          {/* Conteúdo expandido */}
          {prefsOpen && (
            <div className="border-t border-stone-100 px-4 pt-4 pb-4 space-y-4">
              <p className="text-xs text-stone-400">
                {pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} verá essas informações ao planejar os dates com você.
              </p>

              {/* Atividades */}
              <div className="border border-stone-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Heart size={12} className="text-rose-400" />
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Atividades</p>
                </div>
                <TagList
                  label="Adora fazer"
                  items={prefs.activitiesLoves}
                  color="bg-rose-50 text-rose-700 border border-rose-100"
                  onChange={v => setField('activitiesLoves', v)}
                />
              </div>

              {/* Lugares */}
              <div className="border border-stone-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-violet-400" />
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Lugares</p>
                </div>
                <TagList
                  label="Adora ir"
                  items={prefs.placesLoves}
                  color="bg-violet-50 text-violet-700 border border-violet-100"
                  onChange={v => setField('placesLoves', v)}
                />
                <TagList
                  label="Não vai de jeito nenhum"
                  items={prefs.placesNever}
                  color="bg-red-50 text-red-700 border border-red-100"
                  onChange={v => setField('placesNever', v)}
                />
                <TagList
                  label="Não gosta mas vai"
                  items={prefs.placesTolerate}
                  color="bg-amber-50 text-amber-700 border border-amber-100"
                  onChange={v => setField('placesTolerate', v)}
                />
              </div>

              {/* Comida */}
              <div className="border border-stone-100 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Utensils size={12} className="text-emerald-500" />
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Comida</p>
                </div>
                <TagList
                  label="Adora comer"
                  items={prefs.foodLoves}
                  color="bg-emerald-50 text-emerald-700 border border-emerald-100"
                  onChange={v => setField('foodLoves', v)}
                />
                <TagList
                  label="Não come de jeito nenhum"
                  items={prefs.foodNever}
                  color="bg-red-50 text-red-700 border border-red-100"
                  onChange={v => setField('foodNever', v)}
                />
                <TagList
                  label="Come com exceção"
                  items={prefs.foodTolerate}
                  color="bg-amber-50 text-amber-700 border border-amber-100"
                  onChange={v => setField('foodTolerate', v)}
                />
              </div>

              {/* Outros */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-stone-700">Outras observações</p>
                <textarea
                  className="textarea text-sm"
                  rows={3}
                  placeholder={`Qualquer outra coisa que ${pg.subject} deva saber sobre você…`}
                  value={prefs.otherNotes}
                  onChange={e => setField('otherNotes', e.target.value)}
                />
              </div>

              <button
                onClick={savePrefs}
                disabled={saving}
                className="btn-primary text-sm w-full justify-center"
              >
                <Save size={14} />
                {saving ? 'Salvando…' : saved ? '✓ Salvo!' : 'Salvar preferências'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-semibold text-stone-900">{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Ações ── */}
      <div className="card divide-y divide-stone-100">
        <button
          onClick={() => navigate('/partner')}
          className="flex items-center justify-between w-full px-4 py-3.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors rounded-t-xl"
        >
          <span className="flex items-center gap-2">
            <Users size={15} className="text-stone-400" />
            Acesso compartilhado
          </span>
          <ChevronRight size={14} className="text-stone-300" />
        </button>
        <button
          onClick={logout}
          className="flex items-center justify-between w-full px-4 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
        >
          <span className="flex items-center gap-2">
            <LogOut size={15} />
            Sair da conta
          </span>
          <ChevronRight size={14} className="text-stone-300" />
        </button>
      </div>
    </div>
  )
}
