import { useMemo, type ReactNode } from 'react'
import { Shell } from './App'
import { abandonHistory } from './lib/history'
import { pushToast } from './lib/toast'
import { DEFAULT_SETTINGS } from './lib/settings'
import { DEFAULT_RULES, type Catch } from './lib/types'
import { AppContext, type AppContextValue } from './state/context'

const DEMO_TOAST = "Demo mode – changes aren't saved"

const RUN = {
  id: 'demo-run',
  name: 'Demo run',
  rules: `Sample data for showing the app. Not the real run.\n\n${DEFAULT_RULES}`,
  active: true,
  badges: 3,
  level_cap: 42,
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

/** Twelve linked pairs. Obviously invented, using real Gen 1–4 species. */
const SEED: Catch[] = [
  side('f-starter', 'fisi', 'Starter', 10, 'Chimchar', 390, 'Chili', { in_team: true, team_order: 1, level: 36 }),
  side('s-starter', 'seri', 'Starter', 10, 'Piplup', 393, 'Flocke', { in_team: true, team_order: 1, level: 35 }),
  side('f-201', 'fisi', 'Route 201', 20, 'Starly', 396, 'Pieps', { in_team: true, team_order: 2, level: 32 }),
  side('s-201', 'seri', 'Route 201', 20, 'Bidoof', 399, 'Waldi', { in_team: true, team_order: 2, level: 31 }),
  side('f-shore', 'fisi', 'Wahrheitsufer', 30, 'Shinx', 403, 'Blitz', { in_team: true, team_order: 3, level: 34 }),
  side('s-shore', 'seri', 'Wahrheitsufer', 30, 'Abra', 63, 'Hokus', { in_team: true, team_order: 3, level: 33 }),
  side('f-lake', 'fisi', 'See der Wahrheit', 40, 'Psyduck', 54, 'Quak', {
    status: 'dead', level: 14, death_cause: "Mars's Purugly", epitaph: 'The lake was colder than it looked.', died_at: '2026-10-14T16:20:00.000Z',
  }),
  side('s-lake', 'seri', 'See der Wahrheit', 40, 'Cherubi', 420, 'Kirsche', {
    status: 'dead', level: 13, death_cause: "Mars's Purugly", epitaph: 'One Purugly was enough.', died_at: '2026-10-14T16:20:00.000Z',
  }),
  side('f-202', 'fisi', 'Route 202', 50, 'Kricketot', 401, 'Zirp', { level: 18 }),
  side('s-202', 'seri', 'Route 202', 50, 'Pachirisu', 417, 'Kiki', { level: 17 }),
  side('f-204', 'fisi', 'Route 204', 60, 'Geodude', 74, 'Kiesel', { level: 16 }),
  side('s-204', 'seri', 'Route 204', 60, 'Zubat', 41, 'Nacht', { level: 16 }),
  side('f-mine', 'fisi', 'Erzelingen-Mine', 90, 'Magnemite', 81, 'Schraube', { status: 'boxed', level: 22 }),
  side('s-mine', 'seri', 'Erzelingen-Mine', 90, 'Nosepass', 299, 'Nase', { status: 'boxed', level: 21 }),
  side('f-fossil', 'fisi', 'Fossil', 100, 'Cranidos', 408, 'Schädel', { in_team: true, team_order: 4, level: 33 }),
  side('s-fossil', 'seri', 'Fossil', 100, 'Shieldon', 410, 'Panzer', { in_team: true, team_order: 4, level: 32 }),
  side('f-wind', 'fisi', 'Windkraftwerk', 130, 'Luxio', 404, 'Funke', { level: 29 }),
  side('s-wind', 'seri', 'Windkraftwerk', 130, 'Ponyta', 77, 'Loki', { level: 28 }),
  side('f-forest', 'fisi', 'Ewigwald', 150, 'Gible', 443, 'Zacken', { in_team: true, team_order: 5, level: 35 }),
  side('s-forest', 'seri', 'Ewigwald', 150, 'Buizel', 418, 'Flitz', { in_team: true, team_order: 5, level: 34 }),
  side('f-208', 'fisi', 'Route 208', 240, 'Roselia', 315, 'Dorn', { level: 30 }),
  side('s-208', 'seri', 'Route 208', 240, 'Budew', 406, 'Knospe', { level: 29 }),
  side('f-209', 'fisi', 'Route 209', 260, 'Ralts', 280, 'Traum', {
    status: 'dead', level: 38, death_cause: "Fantina's Mismagius", epitaph: 'The chandelier blinked first.', died_at: '2026-10-22T18:05:00.000Z',
  }),
  side('s-209', 'seri', 'Route 209', 260, 'Drifloon', 425, 'Ballon', {
    status: 'dead', level: 37, death_cause: "Fantina's Mismagius", epitaph: "Ghosts don't play fair.", died_at: '2026-10-22T18:05:00.000Z',
  }),
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
  const value = useMemo<AppContextValue>(() => ({
    me: 'fisi',
    run: RUN,
    catches: SEED,
    sync: 'live',
    settings: { ...DEFAULT_SETTINGS },
    customRoutes: [],
    glow: null,
    pulse: null,
    death: null,
    demo: true,
    exitDemo: () => {
      abandonHistory()
      onExit()
    },
    updateSettings: () => deny(),
    saveProgress: async () => deny(),
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
  }), [onExit])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
