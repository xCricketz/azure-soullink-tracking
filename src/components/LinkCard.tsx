import { Hourglass, Link2, Plus, Shuffle, Skull, Unlink2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { marksFor } from '../data/marks'
import { routeTitle, type RouteDef } from '../data/routes'
import { speciesName } from '../lib/text'
import { dexKey, findMon, useDex } from '../lib/unbound'
import { bothAlive } from '../lib/pairs'
import { PLAYERS, type Catch, type PlayerId } from '../lib/types'
import { cx, SpritePlate, StatusChip } from './ui'

export function LinkCard({
  route,
  index,
  fisi,
  seri,
  me,
  glow,
  pulse,
  onOpen,
  onAdd,
  onQuick,
  onWiki,
  randomized = false,
}: {
  route: RouteDef
  index: number
  fisi?: Catch
  seri?: Catch
  me: PlayerId
  glow: boolean
  pulse: boolean
  onOpen: () => void
  onAdd: () => void
  onQuick: () => void
  onWiki?: (id: string) => void
  randomized?: boolean
}) {
  const state = pairState(fisi, seri, me)
  const alive = bothAlive(fisi, seri)
  const [burst, setBurst] = useState(false)
  const taps = useRef<number[]>([])
  const mine = me === 'fisi' ? fisi : seri
  const glowClass = glow ? (me === 'fisi' ? 'glow-seri' : 'glow-fisi') : false
  const linked = state.chain === 'on'
  const marks = marksFor(route.name)

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
    <article className={cx('lcard', state.tone === 'dead' && 'dead', glowClass)} onClick={onOpen}>
      <div className="top">
        <h2 className="route">
          <span className="no">#{index}</span>
          {routeTitle(route)}
          {route.gym ? ' · Gym' : ''}
        </h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {randomized && <span className="rbadge" title="Randomized"><Shuffle aria-hidden="true" /></span>}
          <span className={cx('pairstate', state.tone)}>
            {state.tone === 'link' && <Link2 aria-hidden="true" />}
            {state.tone === 'dead' && <Skull aria-hidden="true" />}
            {state.tone === 'wait' && <Hourglass aria-hidden="true" />}
            {state.label}
          </span>
        </span>
      </div>
      {marks.length > 0 && (
        <div className="rbads">
          {marks.map((mark) => (
            <span key={`${mark.kind}-${mark.label}`} className={cx('rbad', mark.kind)}>{mark.label}</span>
          ))}
        </div>
      )}
      <div className="halves">
        <Half side="fisi" catchRow={fisi} mine={me === 'fisi'} flash={pulse && me === 'fisi'} onAdd={onAdd} onQuick={onQuick} onWiki={onWiki} />
        <button
          className={cx('chain', state.chain === 'broken' && 'broken', state.chain === 'wait' && 'wait', pulse && linked && 'pulse')}
          type="button"
          onClick={pokeChain}
          aria-label={state.chain === 'on' ? 'Soul link' : 'Link open'}
        >
          <span className="line" />
          <span className="node">
            {state.chain === 'broken' ? <Unlink2 aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          </span>
          {burst && (
            <span className="burst" aria-hidden="true">
              {['-18px,-28px', '16px,-26px', '-26px,-6px', '24px,-4px', '-8px,-36px', '4px,-18px'].map((point) => (
                <i key={point} style={{ ['--x' as string]: point.split(',')[0], ['--y' as string]: point.split(',')[1] }}>♥</i>
              ))}
            </span>
          )}
        </button>
        <Half side="seri" catchRow={seri} mine={me === 'seri'} flash={pulse && me === 'seri'} onAdd={onAdd} onQuick={onQuick} onWiki={onWiki} />
      </div>
      {mine?.status === 'alive' && (me === 'fisi' ? seri : fisi)?.status === 'missed' && (
        <p className="warn-line">unlinked — can’t be in the team</p>
      )}
    </article>
  )
}

function pairState(fisi: Catch | undefined, seri: Catch | undefined, me: PlayerId) {
  const mine = me === 'fisi' ? fisi : seri
  const theirs = me === 'fisi' ? seri : fisi
  const partner = PLAYERS[me === 'fisi' ? 'seri' : 'fisi'].name
  if (fisi?.status === 'dead' || seri?.status === 'dead') return { label: 'Fainted', tone: 'dead' as const, chain: 'broken' as const }
  if (fisi?.status === 'missed' || seri?.status === 'missed') return { label: 'Unlinked', tone: 'wait' as const, chain: 'broken' as const }
  if (!mine && theirs) return { label: 'Waiting for you', tone: 'wait' as const, chain: 'wait' as const }
  if (mine && !theirs) return { label: `Waiting for ${partner}`, tone: 'wait' as const, chain: 'wait' as const }
  if (mine && theirs) return { label: 'Linked', tone: 'link' as const, chain: 'on' as const }
  return { label: 'Open', tone: 'wait' as const, chain: 'wait' as const }
}

function Half({
  side,
  catchRow,
  mine,
  flash,
  onAdd,
  onQuick,
  onWiki,
}: {
  side: PlayerId
  catchRow?: Catch
  mine: boolean
  flash: boolean
  onAdd: () => void
  onQuick: () => void
  onWiki?: (id: string) => void
}) {
  const dex = useDex()
  const types = findMon(dex, catchRow?.dex_id, catchRow?.form)?.types
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null)
  if (!catchRow) {
    if (mine) {
      return (
        <button
          className={cx('half empty mine', side, flash && 'flash')}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
        >
          <Plus size={16} aria-hidden="true" />
          Add
        </button>
      )
    }
    return <div className={cx('half empty', side)}>{PLAYERS[side].name} hasn’t logged anything yet</div>
  }
  const missed = catchRow.status === 'missed'
  return (
    <div
      className={cx('half', side, flash && 'flash')}
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
      {!missed && catchRow.dex_id && onWiki ? (
        <button
          className="wiki-hit"
          type="button"
          aria-label={`${speciesName(catchRow)} in the Pokédex`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            if (catchRow.dex_id) onWiki(dexKey(catchRow.dex_id, catchRow.form))
          }}
        >
          <SpritePlate id={catchRow.dex_id} alt={speciesName(catchRow)} types={types} />
        </button>
      ) : !missed ? (
        <SpritePlate id={catchRow.dex_id} alt={speciesName(catchRow)} types={types} />
      ) : null}
      <div className="meta">
        <div className="nick">{catchRow.nickname || (missed ? 'Missed' : speciesName(catchRow))}</div>
        <div className="species">{missed ? 'No catch' : speciesName(catchRow)}</div>
        <StatusChip status={catchRow.status} />
      </div>
    </div>
  )
}
