import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Shell } from './App'
import { abandonHistory } from './lib/history'
import { DEFAULT_OPTIONS, optionsOf } from './lib/options'
import { applyTheme, DEFAULT_SETTINGS } from './lib/settings'
import { pushToast } from './lib/toast'
import { DEFAULT_RULES, type Catch, type RunOptions, type Settings } from './lib/types'
import { AppContext, type AppContextValue } from './state/context'

const DEMO_TOAST = "Demo mode – changes aren't saved"

const RUN = {
  id: 'demo-run',
  name: 'Demo run',
  rules: `Sample data for showing the app. Not the real run.\n\n${DEFAULT_RULES}`,
  active: true,
  badges: 2,
  level_cap: 29,
  options: { ...DEFAULT_OPTIONS, randomizerSpecies: true, ngPlus: true, carried: ['Pikachu', 'Eevee'] },
  created_at: '2026-10-12T09:00:00.000Z',
  updated_at: '2026-10-22T19:40:00.000Z',
}

function row(partial: Omit<Catch, 'run_id' | 'created_at' | 'updated_at'>): Catch {
  return {
    run_id: RUN.id,
    created_at: '2026-10-12T09:00:00.000Z',
    updated_at: '2026-10-22T19:40:00.000Z',
    ...partial,
  }
}

function side(
  id: string,
  player: Catch['player'],
  route: string,
  routeOrder: number,
  pokemon: string,
  dexId: number,
  nickname: string,
  extra: Partial<Catch>,
): Catch {
  return row({
    id,
    player,
    route,
    route_order: routeOrder,
    pokemon,
    dex_id: dexId,
    form: null,
    nickname,
    status: 'alive',
    in_team: false,
    team_order: null,
    level: 20,
    note: null,
    death_cause: null,
    epitaph: null,
    died_at: null,
    ...extra,
  })
}

/** Eleven linked pairs on early Unbound routes. Invented nicknames, real species. */
const SEED: Catch[] = [
  side('f-r1', 'fisi', 'route-1', 2, 'Delibird', 225, 'Frost', { in_team: true, team_order: 1, level: 28 }),
  side('s-r1', 'seri', 'route-1', 2, 'Snorunt', 361, 'Snow', { in_team: true, team_order: 1, level: 27 }),
  side('f-ice', 'fisi', 'icicle-cave', 4, 'Sandshrew', 27, 'Spike', { form: 'Alolan', in_team: true, team_order: 2, level: 26 }),
  side('s-ice', 'seri', 'icicle-cave', 4, 'Zubat', 41, 'Nacht', { in_team: true, team_order: 2, level: 25 }),
  side('f-r2', 'fisi', 'route-2', 5, 'Rattata', 19, 'Nib', { in_team: true, team_order: 3, level: 24 }),
  side('s-r2', 'seri', 'route-2', 5, 'Krabby', 98, 'Pinch', { in_team: true, team_order: 3, level: 24 }),
  side('f-dresco', 'fisi', 'dresco-town', 6, 'Staryu', 120, 'Star', { in_team: true, team_order: 4, level: 27 }),
  side('s-dresco', 'seri', 'dresco-town', 6, 'Basculin', 550, 'Stripe', { in_team: true, team_order: 4, level: 26 }),
  side('f-r3', 'fisi', 'route-3', 8, 'Poliwag', 60, 'Puddle', {
    status: 'dead', level: 18, death_cause: 'a trainer’s Tangela', epitaph: 'The flowers were not friendly.', died_at: '2026-10-16T15:10:00.000Z',
  }),
  side('s-r3', 'seri', 'route-3', 8, 'Slowpoke', 79, 'Daze', {
    status: 'dead', level: 17, death_cause: 'a trainer’s Tangela', epitaph: 'Too slow for the grass.', died_at: '2026-10-16T15:10:00.000Z',
  }),
  side('f-flower', 'fisi', 'flower-paradise', 9, 'Roselia', 315, 'Thorn', { level: 22 }),
  side('s-flower', 'seri', 'flower-paradise', 9, 'Combee', 415, 'Buzz', { level: 21 }),
  side('f-grim', 'fisi', 'grim-woods', 10, 'Gastly', 92, 'Haze', {
    status: 'dead', level: 20, death_cause: 'a wild Haunter', epitaph: 'The woods kept this one.', died_at: '2026-10-18T21:40:00.000Z',
  }),
  side('s-grim', 'seri', 'grim-woods', 10, 'Seedot', 273, 'Acorn', {
    status: 'dead', level: 19, death_cause: 'a wild Haunter', epitaph: 'One shadow was enough.', died_at: '2026-10-18T21:40:00.000Z',
  }),
  side('f-r4', 'fisi', 'route-4', 11, 'Ekans', 23, 'Coil', { status: 'boxed', level: 23 }),
  side('s-r4', 'seri', 'route-4', 11, 'Mankey', 56, 'Fury', { status: 'boxed', level: 22 }),
  side('f-cinder', 'fisi', 'cinder-volcano', 12, 'Vulpix', 37, 'Ember', { in_team: true, team_order: 5, level: 29 }),
  side('s-cinder', 'seri', 'cinder-volcano', 12, 'Slugma', 218, 'Lava', { in_team: true, team_order: 5, level: 28 }),
  side('f-r5', 'fisi', 'route-5', 13, 'Growlithe', 58, 'Scout', { in_team: true, team_order: 6, level: 30 }),
  side('s-r5', 'seri', 'route-5', 13, 'Venonat', 48, 'Lamp', { in_team: true, team_order: 6, level: 28 }),
  side('f-r6', 'fisi', 'route-6', 18, 'Goldeen', 118, 'Goldie', { level: 27 }),
  side('s-r6', 'seri', 'route-6', 18, 'Ledyba', 165, 'Dot', { level: 26 }),
]

function deny() {
  pushToast(DEMO_TOAST, undefined, 'demo-locked')
}

export function DemoApp({ onExit }: { onExit: () => void }) {
  return (
    <DemoProvider onExit={onExit}>
      <Shell />
    </DemoProvider>
  )
}

function DemoProvider({ onExit, children }: { onExit: () => void; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, theme: 'light' })
  const [run, setRun] = useState({ ...RUN })
  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])
  const value = useMemo<AppContextValue>(() => ({
    me: 'fisi',
    run,
    catches: SEED,
    sync: 'live',
    settings,
    customRoutes: [],
    glow: null,
    pulse: null,
    death: null,
    demo: true,
    exitDemo: () => {
      abandonHistory()
      onExit()
    },
    updateSettings: (patch) => {
      const keys = Object.keys(patch)
      if (keys.every((key) => key === 'theme' || key === 'reduceMotion')) {
        setSettings((current) => ({ ...current, ...patch }))
        return
      }
      deny()
    },
    saveProgress: async () => deny(),
    saveOptions: async (patch: Partial<RunOptions>) => {
      setRun((current) => ({ ...current, options: { ...optionsOf(current), ...patch } }))
      deny()
    },
    signOut: async () => deny(),
    saveCatch: async () => {
      deny()
      return 'invalid'
    },
    setStatus: async () => deny(),
    deleteCatch: async () => deny(),
    place: async () => deny(),
    moveTeam: async () => deny(),
    saveEpitaph: async () => deny(),
    saveRules: async () => deny(),
    resetRun: async () => {
      deny()
      return 'ok'
    },
    deleteMyCatches: async () => deny(),
    newRun: async () => deny(),
    resolveDeath: async () => deny(),
    addCustomRoute: () => {
      deny()
      return null
    },
    revivePair: async () => deny(),
  }), [onExit, run, settings])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
