import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Shell } from './App'
import { asAlive, asDead, buildRow, partnerNeedsDeath, placeRow, reorderTeam, upsertLocal, withStatus } from './lib/edits'
import { loadSettings, saveSettings } from './lib/settings'
import { pushToast } from './lib/toast'
import { clip } from './lib/text'
import { CUSTOM_ORDER_START } from './data/routes'
import {
  DEFAULT_RULES,
  type Catch,
  type CatchDraft,
  type CustomRoute,
  type DeathPrompt,
  type PlayerId,
  type Run,
  type Settings,
  type Status,
} from './lib/types'
import { AppContext, type AppContextValue } from './state/context'

const RUN: Run = {
  id: 'demo-run',
  name: 'Azure Platinum Soul-Link',
  rules: DEFAULT_RULES,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function row(partial: Omit<Catch, 'run_id' | 'created_at' | 'updated_at'> & Partial<Pick<Catch, 'created_at' | 'updated_at'>>): Catch {
  const now = '2026-10-20T18:00:00.000Z'
  return { run_id: RUN.id, created_at: now, updated_at: now, ...partial }
}

const SEED: Catch[] = [
  row({ id: 'f201', player: 'fisi', route: 'Route 201', route_order: 20, pokemon: 'Pikachu', dex_id: 25, nickname: 'Blitzi', status: 'alive', in_team: true, team_order: 1, level: 12, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 's201', player: 'seri', route: 'Route 201', route_order: 20, pokemon: 'Evoli', dex_id: 133, nickname: 'Mochi', status: 'alive', in_team: true, team_order: 1, level: 12, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 'fsee', player: 'fisi', route: 'See der Wahrheit', route_order: 40, pokemon: 'Chelast', dex_id: 387, nickname: 'Knödel', status: 'alive', in_team: true, team_order: 2, level: 16, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 'ssee', player: 'seri', route: 'See der Wahrheit', route_order: 40, pokemon: 'Plinfa', dex_id: 393, nickname: 'Flocke', status: 'boxed', in_team: false, team_order: null, level: 15, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 'f203', player: 'fisi', route: 'Route 203', route_order: 60, pokemon: 'Panflam', dex_id: 390, nickname: 'Chili', status: 'dead', in_team: false, team_order: null, level: 14, note: null, death_cause: "von Rivale Lucas' Garados", epitaph: 'Du hast mutig gebrannt.', died_at: '2026-10-18T21:12:00.000Z' }),
  row({ id: 's203', player: 'seri', route: 'Route 203', route_order: 60, pokemon: 'Staralili', dex_id: 396, nickname: 'Pieps', status: 'dead', in_team: false, team_order: null, level: 13, note: null, death_cause: "von Rivale Lucas' Garados", epitaph: 'Kleiner Pieps, großer Mut.', died_at: '2026-10-18T21:12:00.000Z' }),
  row({ id: 'f202', player: 'fisi', route: 'Route 202', route_order: 50, pokemon: 'Bidiza', dex_id: 399, nickname: 'Waldi', status: 'alive', in_team: false, team_order: null, level: 8, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 'f204', player: 'fisi', route: 'Route 204', route_order: 100, pokemon: null, dex_id: null, nickname: null, status: 'missed', in_team: false, team_order: null, level: null, note: null, death_cause: null, epitaph: null, died_at: null }),
  row({ id: 's204', player: 'seri', route: 'Route 204', route_order: 100, pokemon: 'Taubsi', dex_id: 16, nickname: 'Wolke', status: 'alive', in_team: false, team_order: null, level: 11, note: null, death_cause: null, epitaph: null, died_at: null }),
]

export function DemoApp() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  )
}

function DemoProvider({ children }: { children: ReactNode }) {
  const me: PlayerId = 'fisi'
  const [run, setRun] = useState<Run>(RUN)
  const [catches, setCatches] = useState<Catch[]>(SEED)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [customRoutes, setCustomRoutes] = useState<CustomRoute[]>([])
  const [death, setDeath] = useState<DeathPrompt | null>(null)
  const glow = null

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const commit = useCallback((next: Catch, previous: Catch | null, text: string) => {
    setCatches((current) => upsertLocal(current, next))
    pushToast(text, {
      label: 'Rückgängig',
      onClick: () => setCatches((current) => (previous ? upsertLocal(current, previous) : current.filter((row) => row.id !== next.id))),
    })
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    me,
    run,
    catches,
    sync: 'live',
    settings,
    customRoutes,
    glow,
    death,
    updateSettings,
    signOut: async () => { pushToast('Im Vorschau-Modus bleibst du Fisi.') },
    saveCatch: async (draft: CatchDraft) => {
      if (!draft.route) {
        pushToast('Wähl zuerst eine Route.')
        return 'invalid'
      }
      if (draft.status !== 'missed' && !draft.dexId) {
        pushToast('Welches Pokémon?')
        return 'invalid'
      }
      const existing = catches.find((row) => row.player === me && row.route === draft.route) ?? null
      const next = buildRow(draft, existing, me, run.id, catches)
      if (next.status === 'dead') {
        const partner = partnerNeedsDeath(next, catches)
        if (partner) {
          setDeath({ next, previous: existing, partner })
          return 'death'
        }
      }
      commit(next, existing, existing ? 'Fang aktualisiert' : 'Fang gespeichert')
      return 'saved'
    },
    setStatus: async (id: string, status: Status) => {
      const current = catches.find((row) => row.id === id)
      if (!current || current.player !== me) return
      const next = withStatus(current, status)
      if (status === 'dead') {
        const partner = partnerNeedsDeath(next, catches)
        if (partner) {
          setDeath({ next, previous: current, partner })
          return
        }
      }
      commit(next, current, 'Status geändert')
    },
    deleteCatch: async (id: string) => {
      const current = catches.find((row) => row.id === id)
      if (!current) return
      setCatches((list) => list.filter((row) => row.id !== id))
      pushToast('Fang gelöscht', { label: 'Rückgängig', onClick: () => setCatches((list) => upsertLocal(list, current)) })
    },
    place: async (id, where) => {
      const current = catches.find((row) => row.id === id)
      if (!current) return
      const next = placeRow(current, where, catches)
      if (next === 'full') {
        pushToast('Nur sechs Pokémon im Team.')
        return
      }
      commit(next, current, where === 'team' ? 'Im Team' : 'In der Box')
    },
    moveTeam: async (id, dir) => {
      const next = reorderTeam(catches, me, id, dir)
      if (!next) return
      setCatches(next)
      pushToast('Reihenfolge geändert')
    },
    saveEpitaph: async (id, epitaph) => {
      const current = catches.find((row) => row.id === id)
      if (!current) return
      commit({ ...current, epitaph: clip(epitaph, 140) || null }, current, 'Epitaph gespeichert')
    },
    saveRules: async (rules) => {
      setRun({ ...run, rules })
      pushToast('Regeln gespeichert')
    },
    resetRun: async () => {
      setCatches([])
      pushToast('Run zurückgesetzt.')
      return 'ok'
    },
    deleteMyCatches: async () => setCatches((list) => list.filter((row) => row.player !== me)),
    newRun: async () => {
      setCatches([])
      pushToast('Neuer Run ist bereit.')
    },
    resolveDeath: async (choice, cause) => {
      const prompt = death
      setDeath(null)
      if (!prompt || choice === 'cancel') return
      const next = asDead(prompt.next, clip(cause, 160))
      if (choice === 'mine') {
        commit(next, prompt.previous, 'In den Friedhof gelegt')
        return
      }
      setCatches((list) => upsertLocal(upsertLocal(list, next), asDead(prompt.partner, cause)))
      pushToast('Beide in den Friedhof gelegt', {
        label: 'Rückgängig',
        onClick: () => setCatches((list) => {
          const restored = upsertLocal(list, prompt.partner)
          return prompt.previous ? upsertLocal(restored, prompt.previous) : restored.filter((row) => row.id !== next.id)
        }),
      })
    },
    addCustomRoute: (name) => {
      const clean = clip(name, 40)
      if (!clean) return null
      const created = { name: clean, order: CUSTOM_ORDER_START + customRoutes.length + 1 }
      setCustomRoutes((list) => [...list, created])
      return created
    },
    revivePair: async (routeName) => {
      setCatches((list) => list.map((row) => (row.route === routeName && row.status !== 'missed' ? asAlive(row) : row)))
      pushToast('Wiederbelebt')
    },
  }), [catches, commit, customRoutes.length, death, run, settings, updateSettings])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
