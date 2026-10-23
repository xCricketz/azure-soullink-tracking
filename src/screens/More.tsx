import { useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { Dialog } from '../components/ui'
import { monById } from '../lib/dex'
import { useApp } from '../state/context'
import { DEFAULT_RULES, PLAYERS, type ThemeChoice } from '../lib/types'
import { pushToast } from '../lib/toast'

export function More() {
  const app = useApp()
  const [rules, setRules] = useState(app.run?.rules ?? DEFAULT_RULES)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetText, setResetText] = useState('')
  const [newStep, setNewStep] = useState<0 | 1 | 2>(0)
  const [newText, setNewText] = useState('')
  const [switchOpen, setSwitchOpen] = useState(false)
  const [fallback, setFallback] = useState(false)
  const stats = summarize(app.catches)

  return (
    <div className="screen more">
      <section className="panel">
        <h2>Profil</h2>
        <p>Angemeldet als <strong className={app.me}>{PLAYERS[app.me].name}</strong></p>
        <button className="btn btn-ghost" type="button" onClick={() => setSwitchOpen(true)}>Spieler wechseln</button>
      </section>

      <section className="panel">
        <h2>Statistiken</h2>
        <div className="stat-grid">
          <article>
            <p className="stat-num">{stats.fisi}</p>
            <p>Fänge Fisi</p>
          </article>
          <article>
            <p className="stat-num">{stats.seri}</p>
            <p>Fänge Seri</p>
          </article>
          <article>
            <p className="stat-num">{stats.deathRate}<span>%</span></p>
            <p>Todesrate</p>
          </article>
        </div>
        <p>Gefährlichste Route: <strong>{stats.deadliest ?? 'noch keine'}</strong></p>
        <p>Häufigster Typ: <strong>{stats.favorite ?? 'noch keiner'}</strong></p>
      </section>

      <section className="panel">
        <h2>Orden</h2>
        <div className="badges" role="group" aria-label="Orden">
          {Array.from({ length: 8 }, (_, index) => {
            const filled = index < app.settings.badges
            return (
              <button
                key={index}
                type="button"
                className={filled ? 'on' : ''}
                aria-pressed={filled}
                aria-label={`Orden ${index + 1}`}
                onClick={() => app.updateSettings({ badges: filled && index === app.settings.badges - 1 ? index : index + 1 })}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Regeln</h2>
        <textarea value={rules} onChange={(event) => setRules(event.target.value)} rows={8} aria-label="Regeln" />
        <button className="btn btn-primary" type="button" onClick={() => void app.saveRules(rules)}>Regeln speichern</button>
      </section>

      <section className="panel">
        <h2>Hinweise</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={app.settings.dupeClause}
            onChange={(event) => app.updateSettings({ dupeClause: event.target.checked })}
          />
          <span>Dupes-Clause: Hinweis bei doppelter Art</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={app.settings.typeClause}
            onChange={(event) => app.updateSettings({ typeClause: event.target.checked })}
          />
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
      </section>

      <section className="panel">
        <h2>Erscheinungsbild</h2>
        <div className="view-switch" role="group" aria-label="Erscheinungsbild">
          {([['dark', 'Dunkel'], ['light', 'Hell'], ['system', 'System']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={app.settings.theme === id} onClick={() => app.updateSettings({ theme: id as ThemeChoice })}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>App installieren</h2>
        <InstallHint compact />
      </section>

      <section className="panel danger-zone">
        <h2>Gefahrenzone</h2>
        <button className="btn btn-danger" type="button" onClick={() => { setResetStep(1); setResetText('') }}>Run zurücksetzen</button>
        <button className="btn btn-ghost" type="button" onClick={() => { setNewStep(1); setNewText('') }}>Neuer Run</button>
      </section>

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
  return { ...per, deathRate: decided ? Math.round((dead / decided) * 100) : 0, deadliest, favorite }
}
