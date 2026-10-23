import { ArrowLeftRight, ChartColumn, ChevronRight, Download, Moon, RotateCcw, ScrollText, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { TrainerShot } from '../components/TrainerShot'
import { BottomSheet, Dialog } from '../components/ui'
import { routeTitleByKey } from '../data/routes'
import { gen4TypeNames } from '../data/typechart'
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
          <small>Profile</small>
          <b>Signed in as <span className={app.me}>{me.name}</span></b>
        </div>
        <button className="btn btn-ghost btn-sm swap" type="button" onClick={() => setSwitchOpen(true)}>
          <ArrowLeftRight size={16} aria-hidden="true" />
          Switch player
        </button>
      </section>

      <h2 className="group-lbl">Run</h2>
      <div className="group">
        <div className="row">
          <span className="ricon link"><ChartColumn size={18} aria-hidden="true" /></span>
          <span className="rt">Stats<small>Catches, death rate, deadliest route</small></span>
        </div>
        <div className="stats">
          <div><b>{stats.total}</b><span>Catches</span></div>
          <div><b className="dead-ink">{stats.deathRate} %</b><span>Death rate</span></div>
          <div><b className="route-stat">{stats.deadliest ?? '—'}</b><span>deadliest</span></div>
        </div>
        <p className="stat-extra">Fisi {stats.fisi} · Seri {stats.seri} · most common type {stats.favorite ?? 'none yet'}</p>
        <button className="row" type="button" onClick={() => { setRules(app.run?.rules ?? DEFAULT_RULES); setRulesOpen(true) }}>
          <span className="ricon accent"><ScrollText size={18} aria-hidden="true" /></span>
          <span className="rt">Rules<small>Fisi's Tracker rules · shared with {PLAYERS[app.me === 'fisi' ? 'seri' : 'fisi'].name}</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
      </div>

      <h2 className="group-lbl">Appearance</h2>
      <div className="seg" role="group" aria-label="Appearance">
        {([
          ['dark', 'Dark', Moon],
          ['light', 'Light', Sun],
          ['system', 'System', Smartphone],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" className={app.settings.theme === id ? 'on' : ''} aria-pressed={app.settings.theme === id} onClick={() => app.updateSettings({ theme: id as ThemeChoice })}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <h2 className="group-lbl">Hints</h2>
      <div className="group hints">
        <label className="switch">
          <input type="checkbox" checked={app.settings.dupeClause} onChange={(event) => app.updateSettings({ dupeClause: event.target.checked })} />
          <span>Dupes Clause: warn on a duplicate species</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={app.settings.typeClause} onChange={(event) => app.updateSettings({ typeClause: event.target.checked })} />
          <span>Type Clause: warn on the same primary type</span>
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
                  if (result !== 'granted') pushToast('Notifications are blocked.')
                })
              } else app.updateSettings({ notify: enabled })
            }}
          />
          <span>Notify when a pair faints</span>
        </label>
      </div>

      <h2 className="group-lbl">App</h2>
      <div className="group">
        <button className="row" type="button" onClick={() => setInstallOpen(true)}>
          <span className="ricon alive"><Download size={18} aria-hidden="true" /></span>
          <span className="rt">Install the app<small>Add to the home screen</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
        <button className="row danger" type="button" onClick={() => { setResetStep(1); setResetText('') }}>
          <span className="ricon danger"><RotateCcw size={18} aria-hidden="true" /></span>
          <span className="rt">Reset run<small>Deletes every catch · confirm with RESET</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
        <button className="row danger" type="button" onClick={() => { setNewStep(1); setNewText('') }}>
          <span className="ricon danger"><RotateCcw size={18} aria-hidden="true" /></span>
          <span className="rt">New run<small>Deletes every route · confirm with RESET</small></span>
          <ChevronRight className="chev" size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="foot2">Fisi's Tracker · v6 · Azure Platinum</p>

      <BottomSheet open={rulesOpen} title="Rules" onClose={() => setRulesOpen(false)} footer={
        <button className="btn btn-primary" type="button" onClick={() => { void app.saveRules(rules); setRulesOpen(false) }}>Save rules</button>
      }>
        <textarea value={rules} onChange={(event) => setRules(event.target.value)} rows={10} aria-label="Rules" />
      </BottomSheet>
      <BottomSheet open={installOpen} title="Install the app" onClose={() => setInstallOpen(false)}>
        <InstallHint />
      </BottomSheet>

      <Dialog
        open={switchOpen}
        title="Switch player?"
        actions={[
          { label: 'Sign out', tone: 'danger', onClick: () => void app.signOut() },
          { label: 'Back', tone: 'ghost', onClick: () => setSwitchOpen(false) },
        ]}
      >
        <p>You’ll sign out. The secret code is needed again next time.</p>
      </Dialog>
      <Dialog
        open={resetStep === 1}
        danger
        title="Reset the run?"
        actions={[
          { label: 'Continue', tone: 'danger', onClick: () => setResetStep(2) },
          { label: 'Back', tone: 'ghost', onClick: () => setResetStep(0) },
        ]}
      >
        <p>Every catch from both players in this run will be lost.</p>
      </Dialog>
      <Dialog
        open={resetStep === 2}
        danger
        title="Type RESET"
        actions={[
          {
            label: 'Delete for good',
            tone: 'danger',
            onClick: () => {
              if (resetText !== 'RESET') return
              void app.resetRun().then((result) => {
                setResetStep(0)
                if (result === 'missing-rpc') setFallback(true)
                else if (result === 'error') pushToast('Reset failed.')
              })
            },
          },
          { label: 'Back', tone: 'ghost', onClick: () => setResetStep(0) },
        ]}
      >
        <p>Type RESET to clear the shared run.</p>
        <input value={resetText} onChange={(event) => setResetText(event.target.value)} aria-label="RESET" autoComplete="off" />
      </Dialog>
      <Dialog
        open={fallback}
        danger
        title="The shared reset isn’t available yet"
        actions={[
          { label: 'Delete only my catches', tone: 'danger', onClick: () => { void app.deleteMyCatches(); setFallback(false) } },
          { label: 'Back', tone: 'ghost', onClick: () => setFallback(false) },
        ]}
      >
        <p>The database doesn’t know reset_run yet. Until that migration runs, each side can only delete their own catches.</p>
      </Dialog>
      <Dialog
        open={newStep === 1}
        danger
        title="New run?"
        actions={[
          { label: 'Continue', tone: 'danger', onClick: () => setNewStep(2) },
          { label: 'Back', tone: 'ghost', onClick: () => setNewStep(0) },
        ]}
      >
        <p>The current run is archived. The old catches stay there.</p>
      </Dialog>
      <Dialog
        open={newStep === 2}
        danger
        title="Type RESET"
        actions={[
          {
            label: 'Start the run',
            tone: 'danger',
            onClick: () => {
              if (newText !== 'RESET') return
              void app.newRun()
              setNewStep(0)
            },
          },
          { label: 'Back', tone: 'ghost', onClick: () => setNewStep(0) },
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
    const type = row.dex_id ? gen4TypeNames(row.dex_id)[0] : undefined
    if (type) types.set(type, (types.get(type) ?? 0) + 1)
  }
  const deadliestKey = [...routeDead.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const deadliest = deadliestKey ? routeTitleByKey(deadliestKey) : null
  const favorite = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { ...per, total: per.fisi + per.seri, deathRate: decided ? Math.round((dead / decided) * 100) : 0, deadliest, favorite }
}
