import { ChartColumn, ChevronRight, Download, FlaskConical, Gauge, Moon, RotateCcw, ScrollText, Shuffle, Smartphone, Sparkles, Sun } from 'lucide-react'
import { useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { Photo } from '../components/Photo'
import { BottomSheet, Dialog } from '../components/ui'
import { routeTitleByKey } from '../data/routes'
import { findMon, useDex } from '../lib/unbound'
import { difficultyLabel, optionsOf } from '../lib/options'
import { useApp } from '../state/context'
import { DEFAULT_RULES, otherPlayer, PLAYERS, type SpeciesClause, type ThemeChoice } from '../lib/types'
import { pushToast } from '../lib/toast'

export function More({ onDex }: { onDex?: () => void }) {
  const app = useApp()
  const options = optionsOf(app.run)
  const partner = otherPlayer(app.me)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rules, setRules] = useState(app.run?.rules ?? DEFAULT_RULES)
  const [installOpen, setInstallOpen] = useState(false)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [resetText, setResetText] = useState('')
  const [newStep, setNewStep] = useState<0 | 1 | 2>(0)
  const [newText, setNewText] = useState('')
  const [switchOpen, setSwitchOpen] = useState(false)
  const [fallback, setFallback] = useState(false)
  const dex = useDex()
  const stats = summarize(app.catches, dex)
  const me = PLAYERS[app.me]

  return (
    <div className="screen more">
      <section className="profile">
        <Photo id={app.me} size="lg" alt="" />
        <div>
          <div className="s">{app.demo ? 'Demo run as' : 'Signed in as'}</div>
          <b>{me.name}</b>
          <div className="s" style={{ marginTop: 2 }}>{me.device} · {app.run?.badges ?? 0} badges</div>
        </div>
        <button className="sw-btn" type="button" onClick={() => setSwitchOpen(true)}>
          <Photo id={partner} size="xs" alt="" />
          Switch
        </button>
      </section>

      <button className="feature" type="button" onClick={() => onDex?.()}>
        <div className="pb"><span className="ic"><ChartColumn aria-hidden="true" /></span></div>
        <div>
          <b>Pokédex</b>
          <div className="s">{stats.total} catches logged · {stats.favorite ?? 'no type yet'}</div>
        </div>
        <ChevronRight style={{ marginLeft: 'auto' }} aria-hidden="true" />
      </button>

      <div className="grp-t micro">Run settings {options.ngPlus && <span className="rb ngp"><Sparkles aria-hidden="true" />NG+ run</span>}</div>
      <div className="grp">
        <label className="row">
          <span className="ic rand"><Shuffle aria-hidden="true" /></span>
          <div>
            <b>Species randomizer: {options.randomizerSpecies ? 'on' : 'off'}</b>
            <span className="s">{options.randomizerSpecies ? 'Route lists will not guess a species' : 'Encounter lists can suggest a species'}</span>
          </div>
          <span className="v"><span className={options.randomizerSpecies ? 'sw on' : 'sw'} /></span>
          <input type="checkbox" className="sr-only" checked={options.randomizerSpecies} onChange={(event) => void app.saveOptions({ randomizerSpecies: event.target.checked })} />
        </label>
        <label className="row">
          <span className="ic rand"><Shuffle aria-hidden="true" /></span>
          <div>
            <b>Move randomizer: {options.randomizerMoves ? 'on' : 'off'}</b>
            <span className="s">Recorded for the run. This tracker does not predict moves.</span>
          </div>
          <span className="v"><span className={options.randomizerMoves ? 'sw on' : 'sw'} /></span>
          <input type="checkbox" className="sr-only" checked={options.randomizerMoves} onChange={(event) => void app.saveOptions({ randomizerMoves: event.target.checked })} />
        </label>
        <label className="row">
          <span className="ic rand"><Shuffle aria-hidden="true" /></span>
          <div>
            <b>Ability randomizer: {options.randomizerAbilities ? 'on' : 'off'}</b>
            <span className="s">Recorded for the run. Ability text stays a main-series note.</span>
          </div>
          <span className="v"><span className={options.randomizerAbilities ? 'sw on' : 'sw'} /></span>
          <input type="checkbox" className="sr-only" checked={options.randomizerAbilities} onChange={(event) => void app.saveOptions({ randomizerAbilities: event.target.checked })} />
        </label>
        <div className="row col">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ic" style={{ ['--c' as string]: 'var(--ember)' }}><Gauge aria-hidden="true" /></span>
            <div style={{ flex: 1 }}>
              <b>Difficulty</b>
              <span className="s">{difficultyLabel(options.difficulty)} · cap {options.levelCapOn ? 'on' : 'off'}</span>
            </div>
          </div>
          <div className="seg diff" role="group" aria-label="Difficulty">
            {(['vanilla', 'difficult', 'expert', 'insane'] as const).map((mode) => (
              <button key={mode} type="button" className={options.difficulty === mode ? 'on' : ''} aria-pressed={options.difficulty === mode} onClick={() => void app.saveOptions({ difficulty: mode })}>
                {difficultyLabel(mode)}
              </button>
            ))}
          </div>
        </div>
        <label className="row">
          <span className="ic ngp"><Sparkles aria-hidden="true" /></span>
          <div>
            <b>New Game Plus</b>
            <span className="s">NG+ itself adds no randomness. The gold badge is only a flag.</span>
          </div>
          <span className="v"><span className={options.ngPlus ? 'sw on' : 'sw'} /></span>
          <input type="checkbox" className="sr-only" checked={options.ngPlus} onChange={(event) => void app.saveOptions({ ngPlus: event.target.checked })} />
        </label>
        <div className="row col">
          <div>
            <b>Species clause</b>
            <span className="s">An app rule. The game has no species clause.</span>
          </div>
          <div className="seg diff" role="group" aria-label="Species clause">
            {([
              ['off', 'Off'],
              ['player', 'Each player'],
              ['both', 'Both'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" className={options.speciesClause === id ? 'on' : ''} aria-pressed={options.speciesClause === id} onClick={() => void app.saveOptions({ speciesClause: id as SpeciesClause })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="row">
          <span className="ic" style={{ ['--c' as string]: 'var(--dead)' }}><FlaskConical aria-hidden="true" /></span>
          <div>
            <b>Sandbox warning</b>
            <span className="s">Expert and Insane in the game. It fights Soul-Link. This does not turn it on.</span>
          </div>
          <span className="v"><span className={options.sandbox ? 'sw on' : 'sw'} /></span>
          <input type="checkbox" className="sr-only" checked={options.sandbox} onChange={(event) => void app.saveOptions({ sandbox: event.target.checked })} />
        </label>
      </div>
      {options.sandbox && (
        <div className="banner" role="status">
          <span>Sandbox ignores fainting in the game and conflicts with a soul link. Leave it off for this run. Deaths here still link.</span>
        </div>
      )}
      {options.ngPlus && (
        <>
          <div className="ngp-ph" aria-disabled="true">
            <span className="ic"><FlaskConical aria-hidden="true" /></span>
            <div>
              <b>NG+ extras <span className="tbd">Coming soon</span></b>
              <p>New Game Plus does not randomize the save. Extra NG+ tools are not built yet.</p>
              <div className="sk"><s style={{ ['--w' as string]: '38%' }} /><s style={{ ['--w' as string]: '24%' }} /><s style={{ ['--w' as string]: '18%' }} /></div>
            </div>
          </div>
          <div className="grp">
            <div className="row col">
              <div>
                <b>Carried team</b>
                <span className="s">Up to six names from the previous save. Level 10 in the game. Not route encounters.</span>
              </div>
              <div className="carried">
                {Array.from({ length: 6 }, (_, index) => (
                  <input
                    key={index}
                    value={options.carried[index] ?? ''}
                    maxLength={24}
                    aria-label={`Carried Pokémon ${index + 1}`}
                    placeholder={`Slot ${index + 1}`}
                    onChange={(event) => {
                      const carried = [...options.carried]
                      while (carried.length < 6) carried.push('')
                      carried[index] = event.target.value
                      void app.saveOptions({ carried: carried.map((name) => name.trim()).filter(Boolean) })
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

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
          <input type="checkbox" checked={app.settings.reduceMotion} onChange={(event) => app.updateSettings({ reduceMotion: event.target.checked })} />
          <span>Reduce motion</span>
        </label>
        <label className="switch">
          <input type="checkbox" checked={app.settings.dupeClause} onChange={(event) => app.updateSettings({ dupeClause: event.target.checked })} />
          <span>Extra dupe warning on this phone</span>
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
      <p className="foot2">Fisi's Tracker · v8 · Pokémon Unbound</p>

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

function summarize(catches: { player: 'fisi' | 'seri'; status: string; route: string; dex_id: number | null; form: string | null }[], dex: ReturnType<typeof useDex>) {
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
    const type = findMon(dex, row.dex_id, row.form)?.types[0]
    if (type) types.set(type, (types.get(type) ?? 0) + 1)
  }
  const deadliestKey = [...routeDead.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const deadliest = deadliestKey ? routeTitleByKey(deadliestKey) : null
  const favorite = [...types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { ...per, total: per.fisi + per.seri, deathRate: decided ? Math.round((dead / decided) * 100) : 0, deadliest, favorite }
}
