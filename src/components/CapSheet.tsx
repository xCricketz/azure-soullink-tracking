import { Minus, Plus } from 'lucide-react'
import { BottomSheet } from './ui'
import { nextLeader } from '../lib/gym'
import { activeCap, capColumn, difficultyLabel, optionsOf } from '../lib/options'
import { suggestedCap } from '../lib/caps'
import { useApp } from '../state/context'
import type { Difficulty } from '../lib/types'

const DIFFICULTIES: Difficulty[] = ['vanilla', 'difficult', 'expert', 'insane']

export function CapSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp()
  const options = optionsOf(app.run)
  const badges = app.run?.badges ?? 0
  const cap = activeCap(app.run)
  const leader = nextLeader(badges)
  const suggestion = options.levelCapOn
    ? suggestedCap(badges, capColumn(options.difficulty), options.mansionDone, app.run?.level_cap)
    : null

  return (
    <BottomSheet open={open} title="Level cap" onClose={onClose}>
      <div className="stepper">
        <button type="button" className="dice" aria-label="Fewer badges" disabled={badges <= 0} onClick={() => void app.saveProgress({ badges: badges - 1 })}>
          <Minus />
        </button>
        <strong>{badges} / 8</strong>
        <button type="button" className="dice" aria-label="One more badge" disabled={badges >= 8} onClick={() => void app.saveProgress({ badges: badges + 1 })}>
          <Plus />
        </button>
      </div>
      <p className="hint center">{leader ? `Next: ${leader.leader} in ${leader.city}. ${leader.boss}` : 'All eight badges are here.'}</p>
      <div className="seg diff" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((mode) => (
          <button key={mode} type="button" className={options.difficulty === mode ? 'on' : ''} aria-pressed={options.difficulty === mode} onClick={() => void app.saveOptions({ difficulty: mode })}>
            {difficultyLabel(mode)}
          </button>
        ))}
      </div>
      <p className="hint">Expert and Insane use the same caps as Difficult+. Boss lists in the game stay vanilla on those two.</p>
      <label className="switch">
        <input type="checkbox" checked={options.levelCapOn} onChange={(event) => void app.saveOptions({ levelCapOn: event.target.checked })} />
        <span>Capped Exp. Share {options.levelCapOn ? 'on' : 'off'}</span>
      </label>
      <label className="switch">
        <input type="checkbox" checked={options.mansionDone} onChange={(event) => void app.saveOptions({ mansionDone: event.target.checked })} />
        <span>Tarmigan Mansion finished</span>
      </label>
      {cap && <p className="hint center">Current cap {cap.level} · {cap.label} · {difficultyLabel(options.difficulty)}</p>}
      {!options.levelCapOn && <p className="hint center">The cap is off, so team levels are not checked against it.</p>}
      {suggestion && (
        <button className="btn btn-primary" type="button" onClick={() => void app.saveProgress({ level_cap: suggestion.level })}>
          Set stored cap to {suggestion.level}
        </button>
      )}
    </BottomSheet>
  )
}
