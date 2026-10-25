import { LocateFixed, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, cx } from '../components/ui'
import guideData from '../data/unbound/guide.json'
import layout from '../data/unbound/layout.json'
import { placeByKey, ROUTES, routeTitleByKey } from '../data/routes'
import { capLadder, optionsOf } from '../lib/options'
import { monName } from '../lib/text'
import { PLAYERS, type Catch } from '../lib/types'
import { loadAreas, monLabel, type EncounterArea } from '../lib/unbound'
import { useApp } from '../state/context'

interface GuideStep {
  step: number
  route_key: string
  objective: string
  boss?: string
  unlock?: string
  note?: string
  confidence: string
}

interface MapNode {
  key: string
  x: number
  y: number
  kind: string
  badge: number | null
  labelX: number
  labelY: number
  labelAnchor: 'start' | 'middle' | 'end'
}

interface MapRegion {
  id: string
  kind: string
  x: number
  y: number
  rx: number
  ry: number
}

const GUIDE = guideData as GuideStep[]
const NODES = layout.nodes as MapNode[]
const EDGES = layout.edges as [string, string][]
const REGIONS = (layout.regions ?? []) as MapRegion[]
const WORLD_W = layout.width
const WORLD_H = layout.height
const SHOW = 4

const RADIUS: Record<string, number> = { town: 18, gym: 15, route: 9, cave: 12, dungeon: 13, other: 12 }

export function MapScreen({ onLog }: { onLog: (route: string) => void }) {
  const app = useApp()
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ x: 40, y: 24, scale: 1 })
  const [view, setView] = useState(viewRef.current)
  const [open, setOpen] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [areas, setAreas] = useState<Map<string, EncounterArea> | null>(null)
  const moved = useRef(0)
  const tapNode = useRef<string | null>(null)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const focused = useRef(false)

  const caught = useMemo(() => {
    const keys = new Set<string>()
    for (const row of app.catches) {
      if (row.pokemon && row.status !== 'missed') keys.add(row.route)
    }
    return keys
  }, [app.catches])

  const progress = useMemo(() => {
    let best = placeByKey('frozen-heights') ?? placeByKey(ROUTES[0]?.name ?? '')
    for (const route of ROUTES) {
      if (!caught.has(route.name)) continue
      const place = placeByKey(route.name)
      if (place && (!best || place.order >= best.order)) best = place
    }
    return best
  }, [caught])

  const options = optionsOf(app.run)
  const ladder = capLadder(app.run?.badges ?? 0, options.difficulty, options.mansionDone)
  const pins = (['fisi', 'seri'] as const).flatMap((player) => {
    const row = app.catches
      .filter((item) => item.player === player && item.status !== 'missed')
      .sort((a, b) => (b.route_order ?? 0) - (a.route_order ?? 0))[0]
    const node = row ? NODES.find((item) => item.key === row.route) : undefined
    return node ? [{ player, x: node.x, y: node.y }] : []
  })
  const upcoming = useMemo(() => stepsAfter(progress?.key ?? '', progress?.order ?? 0), [progress])
  const shown = expanded ? GUIDE : upcoming.slice(0, SHOW)
  const place = open ? placeByKey(open) : undefined
  const area = open && areas ? areas.get(open) : undefined
  const here = open ? app.catches.filter((row) => row.route === open && row.status !== 'missed') : []
  const guideHere = open ? GUIDE.filter((step) => step.route_key === open) : []
  const methods = area ? [...new Set([...area.wild, ...area.special].map((row) => row.method))] : []

  useEffect(() => {
    void loadAreas().then(setAreas)
  }, [])

  function commit(next: { x: number; y: number; scale: number }) {
    const stage = stageRef.current
    const clamped = stage ? clampView(next, stage) : next
    viewRef.current = clamped
    setView(clamped)
  }

  function zoomAt(clientX: number, clientY: number, nextScale: number) {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const current = viewRef.current
    const scale = clampScale(nextScale, stage)
    const px = clientX - rect.left
    const py = clientY - rect.top
    const wx = (px - current.x) / current.scale
    const wy = (py - current.y) / current.scale
    commit({ scale, x: px - wx * scale, y: py - wy * scale })
  }

  function focusProgress(scale = viewRef.current.scale) {
    const stage = stageRef.current
    const node = NODES.find((item) => item.key === progress?.key) ?? NODES[0]
    if (!stage || !node) return
    commit({
      scale,
      x: stage.clientWidth / 2 - node.x * scale,
      y: stage.clientHeight / 2 - node.y * scale,
    })
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const focus = () => {
      if (focused.current || stage.clientWidth < 40) return
      focused.current = true
      focusProgress(1)
    }
    focus()
    const obs = new ResizeObserver(focus)
    obs.observe(stage)
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomAt(event.clientX, event.clientY, viewRef.current.scale * (event.deltaY > 0 ? 0.9 : 1.1))
    }
    stage.addEventListener('wheel', wheel, { passive: false })
    return () => {
      obs.disconnect()
      stage.removeEventListener('wheel', wheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.key])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest?.('.map-tools')) return
    const node = (event.target as Element).closest?.('[data-map-node]')
    tapNode.current = node?.getAttribute('data-map-node') ?? null
    event.currentTarget.setPointerCapture(event.pointerId)
    ptrs.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: viewRef.current.scale }
      drag.current = null
      return
    }
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: viewRef.current.x, oy: viewRef.current.y }
    moved.current = 0
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!ptrs.current.has(event.pointerId)) return
    ptrs.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.current.scale * (dist / pinch.current.dist))
      moved.current = 24
      return
    }
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    moved.current = Math.hypot(dx, dy)
    commit({ ...viewRef.current, x: current.ox + dx, y: current.oy + dy })
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    ptrs.current.delete(event.pointerId)
    if (ptrs.current.size < 2) pinch.current = null
    if (drag.current?.id === event.pointerId) drag.current = null
    const key = tapNode.current
    tapNode.current = null
    if (key && moved.current <= 8 && ptrs.current.size === 0) setOpen(key)
  }

  const byPos = new Map(NODES.map((node) => [node.key, node]))

  return (
    <div className="screen map-screen" data-screen="map">
      <div
        className="map-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          className="map-svg"
          width={WORLD_W}
          height={WORLD_H}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          aria-label="Schematic Borrius map"
        >
          <defs>
            <filter id="map-blob" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
          </defs>
          {REGIONS.map((region) => (
            <ellipse
              key={region.id}
              className={cx('map-blob', region.kind)}
              cx={region.x}
              cy={region.y}
              rx={region.rx}
              ry={region.ry}
              filter="url(#map-blob)"
            />
          ))}
          {EDGES.map(([from, to]) => {
            const a = byPos.get(from)
            const b = byPos.get(to)
            if (!a || !b) return null
            const highway = from === 'kbt-expressway' || to === 'kbt-expressway'
            return (
              <path
                key={`${from}-${to}`}
                className={cx('map-edge', highway && 'highway')}
                d={edgePath(a, b)}
              />
            )
          })}
          {NODES.map((node) => {
            const info = placeByKey(node.key)
            const state = node.key === progress?.key ? 'current' : caught.has(node.key) ? 'caught' : (info?.order ?? 99) <= (progress?.order ?? 0) ? 'visited' : 'ahead'
            const name = info?.name ?? node.key
            const label = name.length > 16 ? `${name.slice(0, 15)}…` : name
            const r = RADIUS[node.kind] ?? 11
            const townBadge = node.kind === 'town' ? node.badge : null
            return (
              <g
                key={node.key}
                className={cx('map-node', state, node.kind)}
                transform={`translate(${node.x} ${node.y})`}
                data-map-node={node.key}
                data-state={state}
              >
                <circle className="hit" r={Math.max(22, r + 8)} />
                <circle className="core" r={r} />
                {node.kind === 'gym' && node.badge ? (
                  <text className="badge-num" textAnchor="middle" y="4">{node.badge}</text>
                ) : (
                  <NodeMark kind={node.kind} />
                )}
                {townBadge ? (
                  <g className="town-badge" transform="translate(12 -14)">
                    <circle r="8" />
                    <text textAnchor="middle" y="3">{townBadge}</text>
                  </g>
                ) : null}
                <text
                  className="lbl"
                  x={node.labelX}
                  y={node.labelY}
                  textAnchor={node.labelAnchor}
                >
                  {label}
                </text>
              </g>
            )
          })}
          {pins.map((pin) => {
            const shift = pin.player === 'seri' ? 20 : -20
            return (
              <g key={pin.player} className={cx('map-pin', pin.player)} transform={`translate(${pin.x + shift} ${pin.y - 42})`}>
                <path d="M-5 12 L0 20 L5 12Z" />
                <circle className="ring" r="15" />
                <circle className="face" r="12" />
                <clipPath id={`pin-${pin.player}`}><circle r="11" /></clipPath>
                <image
                  href={`${import.meta.env.BASE_URL}trainers/${pin.player}-avatar-256.png`}
                  x="-11"
                  y="-11"
                  width="22"
                  height="22"
                  clipPath={`url(#pin-${pin.player})`}
                />
              </g>
            )
          })}
        </svg>
        <div className="map-tools" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Zoom in" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale * 1.25)}><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale / 1.25)}><Minus size={18} /></button>
          <button type="button" aria-label="Show the current route" onClick={() => focusProgress(1)}><LocateFixed size={18} /></button>
        </div>
      </div>
      <div className="map-legend">
        <span><i className="caught" /> Caught</span>
        <span><i className="visited" /> Been there</span>
        <span><i className="ahead" /> Not yet</span>
        <span><i className="town" /> Town</span>
        <span><i className="gym" /> Gym</span>
        <span><i className="cave" /> Cave</span>
      </div>
      <p className="hint map-caption">Schematic, not a geographic map of Borrius. Drag to pan, pinch or use the buttons to zoom. Pins mark the latest log for each player.</p>
      <section className="gcard ladder-card" aria-label="Level cap ladder">
        <h3>Level cap ladder</h3>
        <p>{options.levelCapOn ? 'The highlighted step is the cap for the badges you have now.' : 'The level cap is off, so these numbers are only the table.'}</p>
        <div className="ladder">
          {ladder.map((step) => (
            <div key={`${step.label}-${step.level}`} className={step.now ? 'st1 now' : 'st1'}>
              <small>{step.label}</small>
              <b>{step.level}</b>
              <em>{step.now ? 'now' : ''}</em>
            </div>
          ))}
        </div>
      </section>
      <section className="next-steps" aria-label="Next steps">
        <h2>Next steps</h2>
        {shown.length === 0 ? <p className="hint">That’s the end of the guide.</p> : (
          <ol>
            {shown.map((step) => (
              <li key={step.step} data-next-step={step.step} className={stepPassed(step, progress?.order ?? 0) ? 'passed' : ''}>
                <button type="button" onClick={() => setOpen(step.route_key)}>
                  <b>{routeTitleByKey(step.route_key)}</b>
                  <span>{step.objective}</span>
                  {(step.boss || step.unlock) && <small>{[step.unlock, step.boss].filter(Boolean).join(' · ')}</small>}
                </button>
              </li>
            ))}
          </ol>
        )}
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show the next steps' : `Show all ${GUIDE.length} steps`}
        </button>
      </section>
      <BottomSheet open={open !== null} title={place?.name ?? 'Area'} onClose={() => setOpen(null)}>
        {place && (
          <div className="map-sheet">
            <p className="hint">{place.kind}{place.boss ? ` · ${place.boss}` : ''}</p>
            {guideHere.length > 0 && (
              <>
                <h3 className="wiki-sec">From the guide</h3>
                {guideHere.map((step) => (
                  <p key={step.step} className="hint">{step.objective}{step.note ? ` ${step.note}` : ''}</p>
                ))}
              </>
            )}
            <h3 className="wiki-sec">Encounters</h3>
            {!area || (area.wild.length === 0 && area.special.length === 0) ? (
              <p className="hint">No encounter list for this area.</p>
            ) : options.randomizerSpecies ? (
              <p className="hint">Species randomizer is on. {area.name}: {methods.join(', ') || 'methods not listed'}. Species names stay hidden.</p>
            ) : (
              <>
                <p className="hint">{area.name}{methods.length ? ` · ${methods.join(', ')}` : ''}</p>
                <ul className="enc-list">
                  {[...area.wild, ...area.special].slice(0, 24).map((row, index) => (
                    <li key={`${row.species}-${row.form ?? ''}-${row.method}-${index}`}>{monLabel({ name: row.species, form: row.form })} <small>{row.method}</small></li>
                  ))}
                </ul>
              </>
            )}
            <h3 className="wiki-sec">Your catches</h3>
            {here.length === 0 ? <p className="hint">Nothing logged here yet.</p> : (
              <ul className="enc-list">
                {here.map((row) => (
                  <li key={row.id}>{PLAYERS[row.player].name}: {catchLabel(row)}</li>
                ))}
              </ul>
            )}
            <p className="hint">
              <a className="map-wiki" href={`https://unboundwiki.com/locations/${place.key}/`} target="_blank" rel="noreferrer">Area page on the wiki</a>
            </p>
            {place.soullink_route && (
              <button className="btn btn-primary" type="button" onClick={() => { onLog(place.key); setOpen(null) }}>
                Log a catch
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function NodeMark({ kind }: { kind: string }) {
  if (kind === 'town') return <path className="ico" d="M-6 1.5 L0 -6 L6 1.5 V6 H-6 Z" />
  if (kind === 'cave') return <path className="ico" d="M-7 6 C-7 -1 -3 -6 0 -6 C3 -6 7 -1 7 6 Z M-2 6 V2 H2 V6" />
  if (kind === 'dungeon') return <path className="ico" d="M-6 6 V-1 H6 V6 M-2.2 6 V1.2 H2.2 V6 M-6 -1 L0 -6 L6 -1" />
  if (kind === 'route') return <path className="ico" d="M0 -6 L5 0 L0 6 L-5 0 Z" />
  return <path className="ico" d="M0 -6 L1.6 -1.8 L6 -1.4 L2.6 1.4 L3.6 6 L0 3.6 L-3.6 6 L-2.6 1.4 L-6 -1.4 L-1.6 -1.8 Z" />
}

function edgePath(a: MapNode, b: MapNode): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const sign = (a.key.charCodeAt(0) + b.key.charCodeAt(0) + a.key.length) % 2 === 0 ? 1 : -1
  const bend = Math.min(46, len * 0.18) * sign
  const cx = mx + (-dy / len) * bend
  const cy = my + (dx / len) * bend
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}

function catchLabel(row: Catch): string {
  if (row.status === 'missed' || !row.pokemon) return 'Missed'
  return `${monName(row)} · ${row.status}`
}

function stepsAfter(key: string, order: number): GuideStep[] {
  const exact = GUIDE.findIndex((step) => step.route_key === key)
  if (exact >= 0) return GUIDE.slice(exact + 1)
  let passed = -1
  GUIDE.forEach((step, index) => {
    const placeOrder = placeByKey(step.route_key)?.order ?? 0
    if (placeOrder > 0 && placeOrder <= order) passed = index
  })
  return GUIDE.slice(passed + 1)
}

function stepPassed(step: GuideStep, progressOrder: number): boolean {
  const order = placeByKey(step.route_key)?.order ?? 0
  return order > 0 && order <= progressOrder
}

function clampScale(scale: number, stage: HTMLElement): number {
  const fit = Math.min(stage.clientWidth / WORLD_W, stage.clientHeight / WORLD_H)
  return Math.min(2.6, Math.max(Math.min(0.85, fit), scale))
}

function clampView(next: { x: number; y: number; scale: number }, stage: HTMLElement) {
  const worldW = WORLD_W * next.scale
  const worldH = WORLD_H * next.scale
  const pad = 64
  const xLo = Math.min(pad, stage.clientWidth - worldW - pad)
  const xHi = Math.max(pad, stage.clientWidth - worldW - pad)
  const yLo = Math.min(pad, stage.clientHeight - worldH - pad)
  const yHi = Math.max(pad, stage.clientHeight - worldH - pad)
  return {
    scale: next.scale,
    x: Math.min(xHi, Math.max(xLo, next.x)),
    y: Math.min(yHi, Math.max(yLo, next.y)),
  }
}

function midX(stage: HTMLDivElement | null): number {
  if (!stage) return 0
  const rect = stage.getBoundingClientRect()
  return rect.left + rect.width / 2
}

function midY(stage: HTMLDivElement | null): number {
  if (!stage) return 0
  const rect = stage.getBoundingClientRect()
  return rect.top + rect.height / 2
}
