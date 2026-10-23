import { Ellipsis, MapPin, Skull } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { CatchSheet } from './components/CatchSheet'
import { DeathDialog } from './components/DeathDialog'
import { PokeballIcon, SyncIndicator, ToastHost } from './components/ui'
import { supabase } from './lib/supabase'
import { playerFromEmail, PLAYERS, type TabId } from './lib/types'
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

  useEffect(() => {
    const apply = () => {
      const theme = document.documentElement.dataset.theme
      const light = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F4F6FB' : '#0E1424')
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [app.settings.theme])

  const title = tab === 'routes'
    ? <>Hey <span className={app.me}>{PLAYERS[app.me].name}</span> 👋</>
    : tab === 'team' ? 'Team' : tab === 'grave' ? 'Friedhof' : 'Mehr'

  return (
    <div className="app" data-me={app.me}>
      <header className="header">
        <div className="header-copy">
          <p className="eyebrow">Azure Platinum</p>
          <h1>{title}</h1>
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
          <span aria-hidden="true">+</span>
        </button>
      )}
      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map((item) => (
          <button key={item.id} type="button" className="tab" aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
            {item.id === 'routes' && <MapPin size={24} strokeWidth={2} aria-hidden="true" />}
            {item.id === 'team' && <PokeballIcon />}
            {item.id === 'grave' && <Skull size={24} strokeWidth={2} aria-hidden="true" />}
            {item.id === 'more' && <Ellipsis size={24} strokeWidth={2} aria-hidden="true" />}
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
