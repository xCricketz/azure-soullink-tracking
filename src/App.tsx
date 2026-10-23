import { Ellipsis, MapPin, Plus, Skull } from 'lucide-react'
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { CatchSheet } from './components/CatchSheet'
import { DeathDialog } from './components/DeathDialog'
import { PokeballIcon, SyncIndicator, ToastHost } from './components/ui'
import { teamOf } from './lib/edits'
import { supabase } from './lib/supabase'
import { greetingLine, playerFromEmail, PLAYERS, type TabId } from './lib/types'
import { Login, UnknownAccount } from './screens/Login'
import { Graveyard } from './screens/Graveyard'
import { More } from './screens/More'
import { Routes } from './screens/Routes'
import { Team } from './screens/Team'
import { AppProvider, useApp } from './state/context'

const TABS: { id: TabId; label: string }[] = [
  { id: 'routes', label: 'Routen' },
  { id: 'team', label: 'Team' },
  { id: 'grave', label: 'Friedhof' },
  { id: 'more', label: 'Mehr' },
]

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
    return <DemoGate />
  }
  return <RealApp />
}

function DemoGate() {
  const [Demo, setDemo] = useState<ComponentType | null>(null)
  useEffect(() => {
    void import('./demo').then((mod) => setDemo(() => mod.DemoApp))
  }, [])
  if (!Demo) return <div className="boot"><p className="pixel">SOUL LINK</p><p>Verbinde…</p></div>
  return <Demo />
}

function RealApp() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) {
    return <div className="boot"><p className="pixel">SOUL LINK</p><p>Verbinde…</p></div>
  }
  if (!email) return <Login />
  const me = playerFromEmail(email)
  if (!me) return <UnknownAccount onOut={() => void supabase.auth.signOut()} />
  return (
    <AppProvider me={me}>
      <Shell />
    </AppProvider>
  )
}

export function Shell() {
  const app = useApp()
  const [tab, setTab] = useState<TabId>('routes')
  const [sheet, setSheet] = useState<{ route?: string } | null>(null)
  const greet = useMemo(() => greetingLine(), [])

  useEffect(() => {
    const apply = () => {
      const theme = document.documentElement.dataset.theme
      const light = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F4F6FB' : '#0B1020')
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [app.settings.theme])

  const team = teamOf(app.catches, app.me)
  const levels = team.map((row) => row.level).filter((level): level is number => typeof level === 'number')
  const average = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0
  const cap = app.run?.level_cap
  let title: ReactNode = 'Mehr'
  let sub: string | null = null
  if (tab === 'routes') {
    title = <>Hey <span className={app.me}>{PLAYERS[app.me].name}</span> 👋</>
    sub = greet
  } else if (tab === 'team') {
    title = 'Team'
    sub = `${team.length} / 6 · Ø Lv ${average}${cap ? ` · Levelcap ${cap}` : ''}`
  } else if (tab === 'grave') {
    title = 'Friedhof'
  }

  return (
    <div className="app" data-me={app.me} data-tab={tab}>
      <header className="header">
        <div className="header-copy">
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        <SyncIndicator state={app.sync} />
      </header>
      <main className="main">
        {tab === 'routes' && <Routes onLog={(route) => setSheet({ route })} />}
        {tab === 'team' && <Team />}
        {tab === 'grave' && <Graveyard />}
        {tab === 'more' && <More />}
      </main>
      {tab === 'routes' && (
        <button className="fab" type="button" aria-label="Fang eintragen" onClick={() => setSheet({})}>
          <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
          Fang
        </button>
      )}
      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map((item) => (
          <button key={item.id} type="button" className="tab" aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
            <span className="ic">
              {item.id === 'routes' && <MapPin size={22} strokeWidth={2} aria-hidden="true" />}
              {item.id === 'team' && <PokeballIcon size={22} />}
              {item.id === 'grave' && <Skull size={22} strokeWidth={2} aria-hidden="true" />}
              {item.id === 'more' && <Ellipsis size={22} strokeWidth={2} aria-hidden="true" />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <CatchSheet open={sheet !== null} presetRoute={sheet?.route} onClose={() => setSheet(null)} />
      <DeathDialog />
      <ToastHost />
    </div>
  )
}
