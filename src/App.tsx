import { ChevronLeft, Gauge, LayoutGrid, Map as MapIcon, Plus, Shuffle, Signpost, Skull, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CatchSheet } from './components/CatchSheet'
import { CapSheet } from './components/CapSheet'
import { DeathDialog } from './components/DeathDialog'
import { PokeballIcon, SyncIndicator, ToastHost } from './components/ui'
import { teamOf } from './lib/edits'
import { releaseLayer, upsertLayer } from './lib/history'
import { activeCap, difficultyLabel, optionsOf } from './lib/options'
import { applyTheme, loadSettings } from './lib/settings'
import { clearHidden, markHidden, resumeNeedsStart } from './lib/start'
import { supabase } from './lib/supabase'
import { greetingLine, playerFromEmail, PLAYERS, type PlayerId, type TabId } from './lib/types'
import { parseDexKey } from './lib/unbound'
import { DemoApp } from './demo'
import { Login, UnknownAccount } from './screens/Login'
import { Graveyard } from './screens/Graveyard'
import { MapScreen } from './screens/Map'
import { More } from './screens/More'
import { Routes } from './screens/Routes'
import { Team } from './screens/Team'
import { WikiDetail, WikiHome } from './screens/Wiki'
import { AppProvider, useApp } from './state/context'

const DOCK: { id: Exclude<TabId, 'wiki'>; label: string }[] = [
  { id: 'routes', label: 'Routes' },
  { id: 'map', label: 'Map' },
  { id: 'team', label: 'Team' },
  { id: 'grave', label: 'Graveyard' },
  { id: 'more', label: 'More' },
]

function Backdrop({ kind }: { kind: 'sky' | 'sunrise' | 'meadow' | 'lilac' }) {
  return (
    <div className={`bgt ${kind}`}>
      {(kind === 'sunrise' || kind === 'lilac') && <i className="sun" />}
      <i className="cloud c1" />
      <i className="cloud c2" />
    </div>
  )
}

export function EmberDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="emberG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD36B" />
          <stop offset="0.6" stopColor="#FF8A2B" />
          <stop offset="1" stopColor="#E8531F" />
        </linearGradient>
      </defs>
    </svg>
  )
}

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
    const wake = () => {
      if (document.visibilityState === 'visible') void supabase.auth.startAutoRefresh()
      else void supabase.auth.stopAutoRefresh()
    }
    document.addEventListener('visibilitychange', wake)
    return () => document.removeEventListener('visibilitychange', wake)
  }, [])

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

  if (demo) return <DemoApp onExit={() => { applyTheme(loadSettings().theme); setDemo(false) }} />
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
  const [wikiId, setWikiId] = useState<string | null>(null)
  const greet = useMemo(() => greetingLine(), [])

  const [capOpen, setCapOpen] = useState(false)
  const options = optionsOf(app.run)
  const cap = activeCap(app.run)
  const showCap = tab === 'routes' || tab === 'team' || tab === 'map'
  const bg = tab === 'grave' ? 'lilac' : tab === 'more' || tab === 'wiki' || wikiId ? 'meadow' : 'sky'
  const dockTab = tab === 'wiki' ? 'more' : tab
  const dockIndex = Math.max(0, DOCK.findIndex((item) => item.id === dockTab))

  useEffect(() => {
    document.documentElement.dataset.me = app.me
    applyTheme(app.settings.theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => applyTheme(app.settings.theme)
    media.addEventListener('change', onTheme)
    return () => media.removeEventListener('change', onTheme)
  }, [app.me, app.settings.theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      if (app.settings.reduceMotion || media.matches) document.documentElement.dataset.motion = 'reduced'
      else delete document.documentElement.dataset.motion
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [app.settings.reduceMotion])

  useEffect(() => {
    const open = () => setCapOpen(true)
    window.addEventListener('sl-open-cap', open)
    return () => window.removeEventListener('sl-open-cap', open)
  }, [])

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

  function openWiki(id: string) {
    if (parseDexKey(id).nat > 0) setWikiId(id)
  }

  function chooseTab(id: TabId) {
    setTab(id)
    setWikiId(null)
  }

  const team = teamOf(app.catches, app.me)
  const levels = team.map((row) => row.level).filter((level): level is number => typeof level === 'number')
  const average = levels.length ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length) : 0
  let title: ReactNode = 'More'
  let sub: ReactNode = null
  if (wikiId) {
    title = 'Pokédex'
    sub = 'Entry'
  } else if (tab === 'routes') {
    title = <>Hey {PLAYERS[app.me].name} 👋</>
    sub = (
      <div className="runbadges">
        {options.randomizerSpecies && <span className="rb rand"><Shuffle aria-hidden="true" />Randomized</span>}
        {options.ngPlus && <span className="rb ngp"><Sparkles aria-hidden="true" />NG+</span>}
        {!options.randomizerSpecies && !options.ngPlus && greet}
      </div>
    )
  } else if (tab === 'team') {
    title = 'Team'
    sub = `${team.length} / 6 · Avg Lv ${average}`
  } else if (tab === 'wiki') {
    title = 'Pokédex'
    sub = app.settings.showGen8 ? 'Post-game on' : 'Story dex'
  } else if (tab === 'map') {
    title = 'Map'
    sub = 'Borrius · story order'
  }

  return (
    <div className="app" data-me={app.me} data-tab={wikiId ? 'wiki' : tab} data-demo={app.demo ? '1' : '0'}>
      <EmberDefs />
      <Backdrop kind={bg} />
      {app.demo && (
        <div className="demo-bar">
          <span className="demo-pill">DEMO</span>
          <button className="btn btn-sm" type="button" onClick={app.exitDemo}>Exit demo</button>
        </div>
      )}
      <div className="scroll">
        <header className="hdr sticky">
          <div className="l">
            {(tab === 'wiki' || wikiId) && (
              <button className="ibtn back" type="button" aria-label="Back" onClick={() => { if (wikiId) setWikiId(null); else setTab('more') }}>
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            <div>
              <h1>{title}</h1>
              {sub && <div className="sub">{sub}</div>}
            </div>
          </div>
          <div className="r">
            {app.demo ? null : <SyncIndicator state={app.sync} />}
            {showCap && !wikiId && (
              <button
                className="capchip"
                type="button"
                aria-label={cap ? `Level cap ${cap.level}, ${difficultyLabel(options.difficulty)}` : 'Level cap off'}
                onClick={() => setCapOpen(true)}
              >
                <span className="g"><Gauge aria-hidden="true" /></span>
                <span className="t">
                  <small>Level cap</small>
                  <b>{cap ? cap.level : 'Off'}<em>{cap ? difficultyLabel(options.difficulty) : ''}</em></b>
                </span>
              </button>
            )}
          </div>
        </header>
        <main>
          {wikiId !== null ? (
            <WikiDetail id={wikiId} onOpen={openWiki} onClose={() => setWikiId(null)} />
          ) : (
            <>
              {tab === 'routes' && <Routes onLog={(route) => setSheet({ route })} onWiki={openWiki} />}
              {tab === 'team' && <Team onWiki={openWiki} />}
              {tab === 'grave' && <Graveyard />}
              {tab === 'wiki' && <WikiHome onOpen={openWiki} />}
              {tab === 'map' && <MapScreen onLog={(route) => setSheet({ route })} />}
              {tab === 'more' && <More onDex={() => chooseTab('wiki')} />}
            </>
          )}
        </main>
      </div>
      {tab === 'routes' && wikiId === null && (
        <button className="fab" type="button" aria-label="Log a catch" onClick={() => setSheet({})}>
          <Plus aria-hidden="true" />
          Catch
        </button>
      )}
      <nav className="dock" aria-label="Main">
        <div className="dock-ind" style={{ ['--i' as string]: dockIndex }}><span /></div>
        {DOCK.map((item) => (
          <button key={item.id} type="button" className={dockTab === item.id ? 'dk on' : 'dk'} aria-current={dockTab === item.id ? 'page' : undefined} onClick={() => chooseTab(item.id)}>
            <span className="ic">
              {item.id === 'routes' && <Signpost aria-hidden="true" />}
              {item.id === 'map' && <MapIcon aria-hidden="true" />}
              {item.id === 'team' && <PokeballIcon size={23} />}
              {item.id === 'grave' && <Skull aria-hidden="true" />}
              {item.id === 'more' && <LayoutGrid aria-hidden="true" />}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
      <CapSheet open={capOpen} onClose={() => setCapOpen(false)} />
      <CatchSheet open={sheet !== null} presetRoute={sheet?.route} onClose={() => setSheet(null)} />
      <DeathDialog />
      <ToastHost />
    </div>
  )
}
