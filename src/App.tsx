import { BookOpen, Ellipsis, MapPin, Plus, Skull } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CatchSheet } from './components/CatchSheet'
import { DeathDialog } from './components/DeathDialog'
import { TrainerShot } from './components/TrainerShot'
import { PokeballIcon, SyncIndicator, ToastHost } from './components/ui'
import { teamOf } from './lib/edits'
import { releaseLayer, upsertLayer } from './lib/history'
import { clearHidden, markHidden, resumeNeedsStart } from './lib/start'
import { supabase } from './lib/supabase'
import { greetingLine, playerFromEmail, PLAYERS, type PlayerId, type TabId } from './lib/types'
import { DemoApp } from './demo'
import { Login, UnknownAccount } from './screens/Login'
import { Graveyard } from './screens/Graveyard'
import { More } from './screens/More'
import { Routes } from './screens/Routes'
import { Team } from './screens/Team'
import { WikiDetail, WikiHome } from './screens/Wiki'
import { AppProvider, useApp } from './state/context'

const TABS: { id: TabId; label: string }[] = [
  { id: 'routes', label: 'Routes' },
  { id: 'team', label: 'Team' },
  { id: 'grave', label: 'Graveyard' },
  { id: 'wiki', label: 'Pokédex' },
  { id: 'more', label: 'More' },
]

export default function App() {
  return <RealApp />
}

function useAppOpen() {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    clearHidden()
    const mark = () => markHidden()
    const back = () => {
      if (document.visibilityState === 'hidden') return
      if (resumeNeedsStart()) setEntered(false)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') mark()
      else back()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', mark)
    window.addEventListener('pageshow', back)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', mark)
      window.removeEventListener('pageshow', back)
    }
  }, [])
  return { entered, enter: () => setEntered(true) }
}

function RealApp() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const { entered, enter } = useAppOpen()

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

  function continueIn() {
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setReady(true)
      enter()
    })
  }

  if (demo) return <DemoApp onExit={() => setDemo(false)} />
  if (!ready) {
    return <div className="boot"><p className="pixel">FISI'S TRACKER</p><p>Connecting…</p></div>
  }
  const me: PlayerId | null = email ? playerFromEmail(email) : null
  if (email && !me) return <UnknownAccount onOut={() => void supabase.auth.signOut()} />
  if (!entered || !me) return <Login sessionPlayer={me} onContinue={continueIn} onDemo={() => setDemo(true)} />
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
  const [wikiId, setWikiId] = useState<number | null>(null)
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

  useEffect(() => {
    if (tab === 'routes') {
      releaseLayer('tab')
      return
    }
    upsertLayer('tab', () => {
      setTab('routes')
      setWikiId(null)
    })
  }, [tab])

  useEffect(() => {
    if (wikiId == null) {
      releaseLayer('wiki')
      return
    }
    upsertLayer('wiki', () => setWikiId(null))
  }, [wikiId])

  function openWiki(id: number) {
    if (id > 0) setWikiId(id)
  }

  function chooseTab(id: TabId) {
    setTab(id)
    setWikiId(null)
  }

  const team = teamOf(app.catches, app.me)
  const levels = team.map((row) => row.level).filter((level): level is number => typeof level === 'number')
  const average = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0
  const cap = app.run?.level_cap
  let title: ReactNode = 'More'
  let sub: string | null = null
  if (tab === 'routes') {
    title = <>Hey <span className={app.me}>{PLAYERS[app.me].name}</span> 👋</>
    sub = greet
  } else if (tab === 'team') {
    title = (
      <span className="team-title">
        <TrainerShot id="fisi" crop="avatar" className="ht-face" alt="" />
        Team
        <TrainerShot id="seri" crop="avatar" className="ht-face seri" alt="" />
      </span>
    )
    sub = `${team.length} / 6 · avg Lv ${average}${cap ? ` · Level cap ${cap}` : ''}`
  } else if (tab === 'wiki') {
    title = 'Pokédex'
    sub = 'Gen 1–4 · All 493'
  } else if (tab === 'grave') {
    title = 'Graveyard'
  }

  return (
    <div className="app" data-me={app.me} data-tab={tab} data-demo={app.demo ? '1' : '0'}>
      {app.demo && (
        <div className="demo-bar">
          <span className="demo-pill">DEMO</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={app.exitDemo}>Exit demo</button>
        </div>
      )}
      <header className="header">
        <div className="header-copy">
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {app.demo ? null : <SyncIndicator state={app.sync} />}
      </header>
      <main className="main">
        {tab === 'routes' && <Routes onLog={(route) => setSheet({ route })} onWiki={openWiki} />}
        {tab === 'team' && <Team onWiki={openWiki} />}
        {tab === 'grave' && <Graveyard />}
        {tab === 'wiki' && <WikiHome onOpen={openWiki} />}
        {tab === 'more' && <More />}
      </main>
      {tab === 'routes' && wikiId === null && (
        <button className="fab" type="button" aria-label="Log a catch" onClick={() => setSheet({})}>
          <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
          Catch
        </button>
      )}
      <nav className="tabbar" aria-label="Main">
        {TABS.map((item) => (
          <button key={item.id} type="button" className="tab" aria-current={tab === item.id ? 'page' : undefined} onClick={() => chooseTab(item.id)}>
            <span className="ic">
              {item.id === 'routes' && <MapPin size={20} strokeWidth={2} aria-hidden="true" />}
              {item.id === 'team' && <PokeballIcon size={20} />}
              {item.id === 'grave' && <Skull size={20} strokeWidth={2} aria-hidden="true" />}
              {item.id === 'wiki' && <BookOpen size={20} strokeWidth={2} aria-hidden="true" />}
              {item.id === 'more' && <Ellipsis size={20} strokeWidth={2} aria-hidden="true" />}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {wikiId !== null && <WikiDetail id={wikiId} onOpen={openWiki} onClose={() => setWikiId(null)} />}
      <CatchSheet open={sheet !== null} presetRoute={sheet?.route} onClose={() => setSheet(null)} />
      <DeathDialog />
      <ToastHost />
    </div>
  )
}
