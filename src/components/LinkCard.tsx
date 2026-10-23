import { Check, Link2, Skull, Unlink } from 'lucide-react'
import { useRef, useState } from 'react'
import type { RouteDef } from '../data/routes'
import { bothAlive, chainBroken, pairKind } from '../lib/pairs'
import type { Catch, PlayerId } from '../lib/types'
import { cx, Sprite, StatusChip } from './ui'

const KIND_LABEL = {
  open: 'Offen',
  half: 'Halb',
  linked: 'Verlinkt',
  split: 'Gespalten',
  dead: 'Gefallen',
  miss: 'Unverlinkt',
} as const

export function LinkCard({
  route,
  fisi,
  seri,
  me,
  glow,
  onOpen,
  onAdd,
  onQuick,
}: {
  route: RouteDef
  fisi?: Catch
  seri?: Catch
  me: PlayerId
  glow: boolean
  onOpen: () => void
  onAdd: () => void
  onQuick: () => void
}) {
  const kind = pairKind(fisi, seri)
  const broken = chainBroken(fisi, seri)
  const alive = bothAlive(fisi, seri)
  const [burst, setBurst] = useState(false)
  const taps = useRef<number[]>([])
  const mine = me === 'fisi' ? fisi : seri
  const glowClass = glow ? (me === 'fisi' ? 'glow-seri' : 'glow-fisi') : false

  function pokeChain(event: React.MouseEvent) {
    event.stopPropagation()
    if (!alive) return
    const now = Date.now()
    taps.current = [...taps.current.filter((time) => now - time < 2500), now]
    if (taps.current.length >= 5) {
      taps.current = []
      setBurst(true)
      window.setTimeout(() => setBurst(false), 700)
    }
  }

  return (
    <article
      className={cx('link-card', kind === 'dead' && 'is-dead', glowClass)}
      onClick={onOpen}
      aria-label={`${route.name}, ${KIND_LABEL[kind]}`}
    >
      <div className="link-top">
        <h2>{route.name}</h2>
        <span className={cx('pair-flag', kind)}>
          {kind === 'linked' && <Check size={14} aria-hidden="true" />}
          {kind === 'dead' && <Skull size={14} aria-hidden="true" />}
          {KIND_LABEL[kind]}
        </span>
      </div>
      <div className="pair">
        <Half side="fisi" catchRow={fisi} mine={me === 'fisi'} onAdd={onAdd} onQuick={onQuick} />
        <button className={cx('chain', broken && 'broken')} type="button" onClick={pokeChain} aria-label={broken ? 'Kette unterbrochen' : 'Seelenkette'}>
          {broken ? <Unlink size={22} /> : <Link2 size={22} />}
          {burst && (
            <span className="burst" aria-hidden="true">
              {['-18px,-28px', '16px,-26px', '-26px,-6px', '24px,-4px', '-8px,-36px', '4px,-18px'].map((point) => (
                <i key={point} style={{ ['--x' as string]: point.split(',')[0], ['--y' as string]: point.split(',')[1] }}>♥</i>
              ))}
            </span>
          )}
        </button>
        <Half side="seri" catchRow={seri} mine={me === 'seri'} onAdd={onAdd} onQuick={onQuick} />
      </div>
      {mine?.status === 'alive' && (me === 'fisi' ? seri : fisi)?.status === 'missed' && (
        <p className="warn-line">unverlinkt – darf nicht ins Team</p>
      )}
    </article>
  )
}

function Half({
  side,
  catchRow,
  mine,
  onAdd,
  onQuick,
}: {
  side: PlayerId
  catchRow?: Catch
  mine: boolean
  onAdd: () => void
  onQuick: () => void
}) {
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null)
  if (!catchRow) {
    if (mine) {
      return (
        <button
          className={cx('half empty mine', side)}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
        >
          <PlusLabel />
        </button>
      )
    }
    const name = side === 'fisi' ? 'Fisi' : 'Seri'
    return <div className={cx('half empty', side)}>{name} hat noch nichts eingetragen</div>
  }
  return (
    <div
      className={cx('half', side)}
      onPointerDown={(event) => {
        if (!mine) return
        press.current = {
          timer: window.setTimeout(() => {
            if (!press.current) return
            press.current.fired = true
            onQuick()
          }, 480),
          x: event.clientX,
          y: event.clientY,
          fired: false,
        }
      }}
      onPointerMove={(event) => {
        const current = press.current
        if (!current) return
        if (Math.abs(event.clientX - current.x) > 12 || Math.abs(event.clientY - current.y) > 12) {
          window.clearTimeout(current.timer)
          press.current = null
        }
      }}
      onPointerUp={() => {
        if (!press.current) return
        window.clearTimeout(press.current.timer)
      }}
      onPointerCancel={() => {
        if (!press.current) return
        window.clearTimeout(press.current.timer)
        press.current = null
      }}
      onClick={(event) => {
        if (press.current?.fired) {
          event.stopPropagation()
          press.current = null
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Sprite id={catchRow.dex_id} alt={catchRow.pokemon ?? 'Pokémon'} dim={catchRow.status === 'dead'} />
      <div className="half-text">
        <strong>{catchRow.nickname || catchRow.pokemon || 'Verpasst'}</strong>
        <em>
          {catchRow.status === 'missed' ? 'Kein Fang' : catchRow.pokemon}
          {catchRow.level ? ` · Lv. ${catchRow.level}` : ''}
        </em>
        <StatusChip status={catchRow.status} inTeam={catchRow.in_team} />
      </div>
    </div>
  )
}

function PlusLabel() {
  return <span className="add-label">+ Eintragen</span>
}
