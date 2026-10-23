import { useEffect, useState } from 'react'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer } from '../lib/types'
import { monName } from '../lib/text'
import { Dialog } from './ui'

export function DeathDialog() {
  const { death, resolveDeath, me } = useApp()
  const [cause, setCause] = useState('')
  useEffect(() => {
    setCause(death?.next.death_cause ?? '')
  }, [death])
  if (!death) return null
  const other = PLAYERS[otherPlayer(me)]
  const mineLabel = death.next.nickname || monName(death.next) || 'Your Pokémon'
  const partnerLabel = monName(death.partner)
  return (
    <Dialog
      open
      danger
      title="Send both to the graveyard?"
      actions={[
        { label: 'Yes, both', tone: 'danger', onClick: () => void resolveDeath('both', cause) },
        { label: 'Only mine', tone: 'primary', onClick: () => void resolveDeath('mine', cause) },
        { label: 'Back', tone: 'ghost', onClick: () => void resolveDeath('cancel', cause) },
      ]}
    >
      <p>
        {mineLabel} fainted. {partnerLabel} ({other.possessive} soul partner) faints too. Send both to the graveyard?
      </p>
      <label className="field">
        <span>Cause, optional</span>
        <input
          value={cause}
          maxLength={160}
          onChange={(event) => setCause(event.target.value)}
          placeholder="by rival Lucas’s Gyarados"
          aria-label="Cause of death"
        />
      </label>
    </Dialog>
  )
}
