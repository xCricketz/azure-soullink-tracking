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
  const mineLabel = death.next.nickname || death.next.pokemon || 'Dein Pokémon'
  const partnerLabel = monName(death.partner)
  return (
    <Dialog
      open
      danger
      title="Beide in den Friedhof?"
      actions={[
        { label: 'Ja, beide', tone: 'danger', onClick: () => void resolveDeath('both', cause) },
        { label: 'Nur meins', tone: 'primary', onClick: () => void resolveDeath('mine', cause) },
        { label: 'Zurück', tone: 'ghost', onClick: () => void resolveDeath('cancel', cause) },
      ]}
    >
      <p>
        {mineLabel} ist gefallen. {partnerLabel} ({other.possessive} Seelenpartner) stirbt mit. Beide in den Friedhof?
      </p>
      <label className="field">
        <span>Ursache, optional</span>
        <input
          value={cause}
          maxLength={160}
          onChange={(event) => setCause(event.target.value)}
          placeholder="von Rivale Lucas' Garados"
          aria-label="Todesursache"
        />
      </label>
    </Dialog>
  )
}
