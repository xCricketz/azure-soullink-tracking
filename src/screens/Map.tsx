import { LocateFixed, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, cx } from '../components/ui'
import guideData from '../data/unbound/guide.json'
import layout from '../data/unbound/layout.json'
import { placeByKey, ROUTES, routeTitleByKey } from '../data/routes'
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

const GUIDE = guideData as GuideStep[]
const NODES = layout.nodes as { key: string; x: number; y: number }[]
const EDGES = layout.edges as [string, string][]
const WORLD_H = layout.height + 48
const SHOW = 4

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

  const upcoming = useMemo(() => stepsAfter(progress?.key ?? '', progress?.order ?? 0), [progress])
  const shown = expanded ? GUIDE : upcoming.slice(0, SHOW)
  const place = open ? placeByKey(open) : undefined
  const area = open && areas ? areas.get(open) : undefined
  const here = open ? app.catches.filter((row) => row.route === open && row.status !== 'missed') : []

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
    // focus once when the stage has a size; later pans stay put
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.key])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
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

  const labelSize = Math.min(16, 12 / view.scale)
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
          width={layout.width}
          height={WORLD_H}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          aria-label="Schematic Borrius map"
        >
          {EDGES.map(([from, to]) => {
            const a = byPos.get(from)
            const b = byPos.get(to)
            if (!a || !b) return null
            return <line key={`${from}-${to}`} className="map-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          })}
          {NODES.map((node) => {
            const info = placeByKey(node.key)
            const state = node.key === progress?.key ? 'current' : caught.has(node.key) ? 'caught' : (info?.order ?? 99) <= (progress?.order ?? 0) ? 'visited' : 'ahead'
            const name = info?.name ?? node.key
            return (
              <g
                key={node.key}
                className={cx('map-node', state)}
                transform={`translate(${node.x} ${node.y})`}
                data-map-node={node.key}
                data-state={state}
              >
                <circle r={state === 'current' ? 18 : 14} />
                <text y={32} textAnchor="middle" fontSize={labelSize}>{name.length > 16 ? `${name.slice(0, 15)}…` : name}</text>
              </g>
            )
          })}
        </svg>
        <div className="map-tools">
          <button type="button" aria-label="Zoom in" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale * 1.25)}><Plus size={18} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale / 1.25)}><Minus size={18} /></button>
          <button type="button" aria-label="Show the current route" onClick={() => focusProgress(1)}><LocateFixed size={18} /></button>
        </div>
      </div>
      <div className="map-legend" aria-hidden="true">
        <span><i className="caught" /> Caught</span>
        <span><i className="visited" /> Been there</span>
        <span><i className="ahead" /> Not yet</span>
      </div>
      <p className="hint">Story order, drawn from the route links. Not a geographic map of Borrius.</p>
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
            <h3 className="wiki-sec">Encounters</h3>
            {!area || (area.wild.length === 0 && area.special.length === 0) ? (
              <p className="hint">No encounter list for this area.</p>
            ) : (
              <ul className="enc-list">
                {[...area.wild, ...area.special].slice(0, 24).map((row, index) => (
                  <li key={`${row.species}-${row.form ?? ''}-${row.method}-${index}`}>{monLabel({ name: row.species, form: row.form })} <small>{row.method}</small></li>
                ))}
              </ul>
            )}
            <h3 className="wiki-sec">Your catches</h3>
            {here.length === 0 ? <p className="hint">Nothing logged here yet.</p> : (
              <ul className="enc-list">
                {here.map((row) => (
                  <li key={row.id}>{PLAYERS[row.player].name}: {catchLabel(row)}</li>
                ))}
              </ul>
            )}
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
  const fit = Math.min(stage.clientWidth / layout.width, stage.clientHeight / WORLD_H)
  return Math.min(2.4, Math.max(Math.min(1, fit), scale))
}

function clampView(next: { x: number; y: number; scale: number }, stage: HTMLElement) {
  const worldW = layout.width * next.scale
  const worldH = WORLD_H * next.scale
  const pad = 48
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
