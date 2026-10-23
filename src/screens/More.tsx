import { ArrowLeftRight, ChartColumn, ChevronRight, Download, Moon, RotateCcw, ScrollText, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { TrainerShot } from '../components/TrainerShot'
import { BottomSheet, Dialog } from '../components/ui'
import { monById } from '../lib/dex'
import { useApp } from '../state/context'
import { DEFAULT_RULES, PLAYERS, type ThemeChoice } from '../lib/types'
import { pushToast } from '../lib/toast'

export function More() {
  const app = useApp()
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rules, setRules] = useState(app.run?.rules ?? DEFAULT_RULES)
  const [installOpen, setInstallOpen] = useState(false)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetText, setResetText] = useState('')
  const [newStep, setNewStep] = useState<0 | 1 | 2>(0)
  const [newText, setNewText] = useState('')
  const [switchOpen, setSwitchOpen] = useState(false)
  const [fallback, setFallback] = useState(false)
  const stats = summarize(app.catches)
  const me = PLAYERS[app.me]

  return (
    <div className="screen more">
      <section className={cxProfile(app.me)}>
        <TrainerShot id={app.me} crop="avatar" className={`av ${app.me}`} alt="" />
        <div className="t">
          <small>Profil</small>
          <b>Angemeldet als <span className={app.me}>{me.name}</span></b>
        </div>
        <button className="btn btn-ghost btn-sm swap" type="button" onClick={() => setSwitchOpen(true)}>
          <ArrowLeftRight size={16} aria-hidden="true" />
          Spieler wechseln
        </button>
      </section>

      <h2 className="group-lbl">Run</h2>
      <div className="group">
        <div className="row">
          <span className="ricon link"><ChartColumn size={18} aria-hidden="true" /></span>
          <span className="rt">Statistiken<small>Fänge, Todesrate, gefährlichste Route</small></span>
        </div>
        <div className="stats">
          <div><b>{stats.total}</b><span>Fänge</span></div>
          <div><b className="dead-ink">{stats.deathRate} %</b><span>Todesrate</span></div>
          <div><b className="route-stat">{stats.deadliest ?? '—'}</b><span>tödlichste</span></div>
        </div>
        <p className="stat-extra">Fisi {stats.fisi} · Seri {stats.seri} · häufigster Typ {stats.favorite ?? 'noch keiner'}</p>
        <button className="row" type="button" onClick={() => { setRules(app.run?.rules ?? DEFAULT_RULES); setRulesOpen(true) }}>
          <span className="ricon accent"><ScrollText size={18} aria-hidden="true" /></span>
          <span className="rt">Regeln<small>Soul-Link Regeln · geteilt mit {PLAYERS[app.me === 'fisi' ? 'seri' : 'fisi'].name}</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
      </div>

      <h2 className="group-lbl">Erscheinungsbild</h2>
      <div className="seg" role="group" aria-label="Erscheinungsbild">
        {([
          ['dark', 'Dunkel', Moon],
          ['light', 'Hell', Sun],
          ['system', 'System', Smartphone],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" className={app.settings.theme === id ? 'on' : ''} aria-pressed={app.settings.theme === id} onClick={() => app.updateSettings({ theme: id as ThemeChoice })}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <h2 className="group-lbl">Hinweise</h2>
      <div className="group hints">
        <label className="switch">
          <input type="checkbox" checked={app.settings.dupeClause} onChange={(event) => app.updateSettings({ dupeClause: event.target.checked })} />
          <span>Dupes-Clause: Hinweis bei doppelter Art</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={app.settings.typeClause} onChange={(event) => app.updateSettings({ typeClause: event.target.checked })} />
          <span>Typen-Clause: Hinweis bei gleichem Haupttyp</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={app.settings.notify}
            onChange={(event) => {
              const enabled = event.target.checked
              if (enabled && typeof Notification !== 'undefined') {
                void Notification.requestPermission().then((result) => {
                  app.updateSettings({ notify: result === 'granted' })
                  if (result !== 'granted') pushToast('Hinweise sind blockiert.')
                })
              } else app.updateSettings({ notify: enabled })
            }}
          />
          <span>Hinweis, wenn ein Paar fällt</span>
        </label>
      </div>

      <h2 className="group-lbl">App</h2>
      <div className="group">
        <button className="row" type="button" onClick={() => setInstallOpen(true)}>
          <span className="ricon alive"><Download size={18} aria-hidden="true" /></span>
          <span className="rt">App installieren<small>Zum Startbildschirm hinzufügen</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
        <button className="row danger" type="button" onClick={() => { setResetStep(1); setResetText('') }}>
          <span className="ricon danger"><RotateCcw size={18} aria-hidden="true" /></span>
          <span className="rt">Run zurücksetzen<small>Löscht alle Fänge · Bestätigung mit „RESET“</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
        <button className="row danger" type="button" onClick={() => { setNewStep(1); setNewText('') }}>
          <span className="ricon danger"><RotateCcw size={18} aria-hidden="true" /></span>
          <span className="rt">Neuer Run<small>Löscht alle Routen · Bestätigung mit „RESET“</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="foot2">Soul-Link · v3 · Azure Platinum</p>

      <BottomSheet open={rulesOpen} title="Regeln" onClose={() => setRulesOpen(false)} footer={
        <button className="btn btn-primary" type="button" onClick={() => { void app.saveRules(rules); setRulesOpen(false) }}>Regeln speichern</button>
      }>
        <textarea value={rules} onChange={(event) => setRules(event.target.value)} rows={10} aria-label="Regeln" />
      </BottomSheet>
      <BottomSheet open={installOpen} title="App installieren" onClose={() => setInstallOpen(false)}>
        <InstallHint />
      </BottomSheet>

      <Dialog
        open={switchOpen}
        title="Spieler wechseln?"
        actions={[
          { label: 'Abmelden', tone: 'danger', onClick: () => void app.signOut() },
          { label: 'Zurück', tone: 'ghost', onClick: () => setSwitchOpen(false) },
        ]}
      >
        <p>Du meldest dich ab. Der Geheimcode gilt beim nächsten Mal wieder.</p>
      </Dialog>
      <Dialog
        open={resetStep === 1}
        danger
        title="Run zurücksetzen?"
        actions={[
          { label: 'Weiter', tone: 'danger', onClick: () => setResetStep(2) },
          { label: 'Zurück', tone: 'ghost', onClick: () => setResetStep(0) },
        ]}
      >
        <p>Alle Fänge beider Spieler in diesem Run gehen verloren.</p>
      </Dialog>
      <Dialog
        open={resetStep === 2}
        danger
        title="RESET tippen"
        actions={[
          {
            label: 'Endgültig löschen',
            tone: 'danger',
            onClick: () => {
              if (resetText !== 'RESET') return
              void app.resetRun().then((result) => {
                setResetStep(0)
                if (result === 'missing-rpc') setFallback(true)
                else if (result === 'error') pushToast('Reset fehlgeschlagen.')
              })
            },
          },
          { label: 'Zurück', tone: 'ghost', onClick: () => setResetStep(0) },
        ]}
      >
        <p>Tippe RESET, um den gemeinsamen Run zu leeren.</p>
        <input value={resetText} onChange={(event) => setResetText(event.target.value)} aria-label="RESET" autoComplete="off" />
      </Dialog>
      <Dialog
        open={fallback}
        danger
        title="Gemeinsamer Reset fehlt noch"
        actions={[
          { label: 'Nur meine Fänge löschen', tone: 'danger', onClick: () => { void app.deleteMyCatches(); setFallback(false) } },
          { label: 'Zurück', tone: 'ghost', onClick: () => setFallback(false) },
        ]}
      >
        <p>Die Datenbank kennt reset_run noch nicht. Bis die Migration läuft, kann jede Seite nur die eigenen Fänge löschen.</p>
      </Dialog>
      <Dialog
        open={newStep === 1}
        danger
        title="Neuer Run?"
        actions={[
          { label: 'Weiter', tone: 'danger', onClick: () => setNewStep(2) },
          { label: 'Zurück', tone: 'ghost', onClick: () => setNewStep(0) },
        ]}
      >
        <p>Der aktuelle Run wird archiviert. Die alten Fänge bleiben dort liegen.</p>
      </Dialog>
      <Dialog
        open={newStep === 2}
        danger
        title="RESET tippen"
        actions={[
          {
            label: 'Run starten',
            tone: 'danger',
            onClick: () => {
              if (newText !== 'RESET') return
              void app.newRun()
              setNewStep(0)
            },
          },
          { label: 'Zurück', tone: 'ghost', onClick: () => setNewStep(0) },
        ]}
      >
        <input value={newText} onChange={(event) => setNewText(event.target.value)} aria-label="RESET" autoComplete="off" />
      </Dialog>
    </div>
  )
}

function cxProfile(me: string) {
  return `prof ${me}`
}

function summarize(catches: { player: 'fisi' | 'seri'; status: string; route: string; dex_id: number | null }[]) {
  const per = { fisi: 0, seri: 0 }
  let dead = 0
  let decided = 0
  const routeDead = new Map<string, number>()
  const types = new Map<string, number>()
  for (const row of catches) {
    if (row.status === 'missed') continue
    per[row.player] += 1
    if (row.status === 'dead' || row.status === 'alive' || row.status === 'boxed') decided += 1
    if (row.status === 'dead') {
      dead += 1
      routeDead.set(row.route, (routeDead.get(row.route) ?? 0) + 1)
    }
    const type = monById(row.dex_id)?.t1
    if (type) types.set(type, (types.get(type) ?? 0) + 1)
  }
  const deadliest = [...routeDead.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const favorite = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { ...per, total: per.fisi + per.seri, deathRate: decided ? Math.round((dead / decided) * 100) : 0, deadliest, favorite }
}
