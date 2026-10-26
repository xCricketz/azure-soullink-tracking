import { LocateFixed, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, cx } from '../components/ui'
import guideData from '../data/unbound/guide.json'
import layout from '../data/unbound/layout.json'
import { placeByKey, ROUTES, routeTitleByKey } from '../data/routes'
import { readStoryHint, storyHintEvent, type StoredStoryHint } from '../lib/save/story-hint'
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

interface MapIsland {
  id: string
  name: string
  x: number
  y: number
  rx: number
  ry: number
}

const GUIDE = guideData as GuideStep[]
const NODES = layout.nodes as MapNode[]
const EDGES = layout.edges as [string, string, 'story' | 'side' | 'link'][]
const REGIONS = (layout.regions ?? []) as MapRegion[]
const ISLANDS = ((layout as { islands?: MapIsland[] }).islands ?? []) as MapIsland[]
const WORLD_W = layout.width
const WORLD_H = layout.height
const SHOW = 4

const RADIUS: Record<string, number> = { town: 20, gym: 16, route: 9, cave: 12, dungeon: 13, other: 12 }

export function MapScreen({ onLog }: { onLog: (route: string) => void }) {
  const app = useApp()
  const stageRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ x: 40, y: 24, scale: 1 })
  const [view, setView] = useState(viewRef.current)
  const [open, setOpen] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [areas, setAreas] = useState<Map<string, EncounterArea> | null>(null)
  const [storyHint, setStoryHint] = useState<StoredStoryHint | null>(null)
  const moved = useRef(0)
  const tapNode = useRef<string | null>(null)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const focused = useRef(false)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })

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
  const nextKey = upcoming[0]?.route_key && upcoming[0].route_key !== progress?.key ? upcoming[0].route_key : null
  const shown = expanded ? GUIDE : upcoming.slice(0, SHOW)
  const place = open ? placeByKey(open) : undefined
  const area = open && areas ? areas.get(open) : undefined
  const here = open ? app.catches.filter((row) => row.route === open && row.status !== 'missed') : []
  const guideHere = open ? GUIDE.filter((step) => step.route_key === open) : []
  const methods = area ? [...new Set([...area.wild, ...area.special].map((row) => row.method))] : []

  useEffect(() => {
    void loadAreas().then(setAreas)
  }, [])

  useEffect(() => {
    const load = () => setStoryHint(readStoryHint(app.run?.id))
    load()
    window.addEventListener(storyHintEvent(), load)
    return () => window.removeEventListener(storyHintEvent(), load)
  }, [app.run?.id])

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

  function fitAll() {
    const stage = stageRef.current
    if (!stage) return
    const fit = Math.min(stage.clientWidth / WORLD_W, stage.clientHeight / WORLD_H) * 0.96
    commit({
      scale: fit,
      x: (stage.clientWidth - WORLD_W * fit) / 2,
      y: (stage.clientHeight - WORLD_H * fit) / 2,
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
    const now = Date.now()
    const gap = now - lastTap.current.t
    const tapDx = event.clientX - lastTap.current.x
    const tapDy = event.clientY - lastTap.current.y
    const double = gap < 320 && Math.hypot(tapDx, tapDy) < 28 && moved.current <= 8 && ptrs.current.size === 0
    lastTap.current = { t: now, x: event.clientX, y: event.clientY }
    if (double) {
      const stage = stageRef.current
      const fit = stage ? Math.min(stage.clientWidth / WORLD_W, stage.clientHeight / WORLD_H) * 0.96 : 0.3
      const next = viewRef.current.scale < Math.max(0.55, fit * 1.8) ? Math.max(0.9, viewRef.current.scale * 1.7) : fit
      zoomAt(event.clientX, event.clientY, next)
      return
    }
    if (key && moved.current <= 8 && ptrs.current.size === 0) setOpen(key)
  }

  const byPos = new Map(NODES.map((node) => [node.key, node]))
  const showAllLabels = view.scale >= 0.82
  const labelSize = showAllLabels ? 13 : Math.max(13, 12 / view.scale)
  const tagSize = Math.max(12, 11 / view.scale)
  const stageBox = stageRef.current?.getBoundingClientRect()
  const labelShift = showAllLabels
    ? new Map<string, { x: number; y: number }>()
    : avoidLabelCollisions(
      NODES.filter((node) => showNodeLabel(node, view.scale)).map((node) => ({
        ...node,
        labelName: displayName(placeByKey(node.key)?.name ?? node.key, node, view.scale),
      })),
      labelSize,
      view,
      stageBox?.width ?? 320,
      stageBox?.height ?? 360,
    )

  return (
    <div className="screen map-screen" data-screen="map">
      <div className="map-toolbar" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale * 1.7)}><Plus size={18} /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(midX(stageRef.current), midY(stageRef.current), view.scale / 1.7)}><Minus size={18} /></button>
        <button type="button" aria-label="Show the current route" onClick={() => focusProgress(1)}><LocateFixed size={18} /></button>
        <button type="button" aria-label="Entire map" onClick={fitAll}>Entire map</button>
      </div>
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
          aria-label="Borrius region map"
        >
          <defs>
            <filter id="map-blob" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <rect className="map-water" x={0} y={0} width={WORLD_W} height={WORLD_H} />
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
          {ISLANDS.map((isle) => (
            <g key={isle.id} className="map-island" data-island={isle.id}>
              <ellipse className="map-blob island" cx={isle.x} cy={isle.y} rx={isle.rx} ry={isle.ry} filter="url(#map-blob)" />
              <ellipse className="map-shore" cx={isle.x} cy={isle.y} rx={isle.rx * 0.72} ry={isle.ry * 0.62} />
              {view.scale >= 0.45 && (
                <text className="map-isle" x={isle.x} y={isle.y + 4} textAnchor="middle" fontSize={tagSize}>{isle.name}</text>
              )}
            </g>
          ))}
          {EDGES.map(([from, to, role]) => {
            const a = byPos.get(from)
            const b = byPos.get(to)
            if (!a || !b) return null
            return (
              <path
                key={`${from}-${to}`}
                className={cx('map-edge', role || 'side')}
                d={edgePath(a, b, role || 'side')}
              />
            )
          })}
          {NODES.map((node) => {
            const info = placeByKey(node.key)
            const state = node.key === progress?.key ? 'current' : caught.has(node.key) ? 'caught' : (info?.order ?? 99) <= (progress?.order ?? 0) ? 'visited' : 'ahead'
            const name = displayName(info?.name ?? node.key, node, view.scale)
            const lines = labelLines(name)
            const r = RADIUS[node.kind] ?? 11
            const labelled = showNodeLabel(node, view.scale)
            const townBadge = node.kind === 'town' ? node.badge : null
            const here = node.key === progress?.key
            const next = node.key === nextKey
            const shift = labelShift.get(node.key) ?? { x: 0, y: 0 }
            const labelX = node.labelX + shift.x
            const labelY = node.labelY + shift.y
            return (
              <g
                key={node.key}
                className={cx('map-node', state, node.kind, here && 'here', next && 'next')}
                transform={`translate(${node.x} ${node.y})`}
                data-map-node={node.key}
                data-state={state}
                data-here={here ? 'true' : 'false'}
                data-next={next ? 'true' : 'false'}
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
                {(here || next) && view.scale >= 0.55 && (
                  <text className="map-tag" textAnchor="middle" y={-(r + 10)} fontSize={tagSize}>
                    {here ? 'Here' : 'Next'}
                  </text>
                )}
                {labelled && (
                  <text
                    className="lbl"
                    x={labelX}
                    y={labelY}
                    textAnchor={node.labelAnchor}
                    fontSize={labelSize}
                  >
                    {lines.map((line, index) => (
                      <tspan key={`${node.key}-${index}`} x={labelX} dy={index === 0 ? 0 : labelSize * 1.12}>{line}</tspan>
                    ))}
                  </text>
                )}
              </g>
            )
          })}
          {view.scale >= 0.5 && pins.map((pin) => {
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
      </div>
      <div className="map-legend">
        <span><i className="caught" /> Caught</span>
        <span><i className="visited" /> Been there</span>
        <span><i className="ahead" /> Not yet</span>
        <span><i className="town" /> Town</span>
        <span><i className="gym" /> Gym</span>
        <span><i className="cave" /> Cave</span>
      </div>
      <p className="hint map-caption">{layout.caption} Pins mark the latest log for each player. Here is the furthest catch, and Next is the following guide step.</p>
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
        {storyHint && (
          <div className="story-suggest" data-story-suggest data-story-current={storyHint.currentLabel} data-story-next={storyHint.nextLabel ?? ''}>
            <p>
              <b>You are here</b>
              <span className="conf u">Guess</span>
            </p>
            <p>
              Save suggests {storyHint.currentLabel}
              {storyHint.nextLabel ? `. Next: ${storyHint.nextLabel}` : ''}.
            </p>
            <p className="hint">Here on the map stays your furthest catch. This suggestion does not move it.</p>
            {storyHint.finished && <p className="hint">This save is at the end of the story, so it is not a mid-run position.</p>}
          </div>
        )}
        {shown.length === 0 ? <p className="hint">That’s the end of the guide.</p> : (
          <ol>
            {shown.map((step) => (
              <li
                key={step.step}
                data-next-step={step.step}
                data-story-step={storyHint?.currentKey === step.route_key ? 'true' : 'false'}
                className={stepPassed(step, progress?.order ?? 0) ? 'passed' : ''}
              >
                <button type="button" onClick={() => setOpen(step.route_key)}>
                  <b>{guideTitle(step)}</b>
                  {step.confidence === 'likely' && <span className="conf l">Likely</span>}
                  {step.confidence === 'uncertain' && <span className="conf u">Uncertain</span>}
                  <span>{step.objective}</span>
                  {(step.boss || step.unlock) && <small>{[step.unlock, step.boss].filter(Boolean).join(' · ')}</small>}
                  {step.note && (step.confidence === 'likely' || step.confidence === 'uncertain' || /optional|unverified/i.test(step.note)) && <small>{step.note}</small>}
                </button>
              </li>
            ))}
          </ol>
        )}
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show the next steps' : `Show all ${GUIDE.length} steps`}
        </button>
      </section>
      <BottomSheet peek open={open !== null} title={place?.name ?? (guideHere[0] ? guideTitle(guideHere[0]) : 'Area')} onClose={() => setOpen(null)}>
        {(place || guideHere.length > 0) && (
          <div className="map-sheet">
            {place && <p className="hint">{place.kind}{place.boss ? ` · ${place.boss}` : ''}</p>}
            {guideHere.length > 0 && (
              <>
                <h3 className="wiki-sec">From the guide</h3>
                {guideHere.map((step) => (
                  <p key={step.step} className="hint">
                    {step.confidence === 'likely' && <span className="conf l">Likely</span>}
                    {step.confidence === 'uncertain' && <span className="conf u">Uncertain</span>}
                    {' '}{step.objective}{step.note ? ` ${step.note}` : ''}
                  </p>
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
            {place && (
              <p className="hint">
                <a className="map-wiki" href={`https://unboundwiki.com/locations/${place.key}/`} target="_blank" rel="noreferrer">Area page on the wiki</a>
              </p>
            )}
            {place?.soullink_route && (
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

function displayName(name: string, node: MapNode, scale: number): string {
  if (scale >= 0.34) return name
  if (node.kind !== 'town' && node.key !== 'pokemon-league') return name
  if (node.key === 'pokemon-league') return 'League'
  return name.replace(/\s+(Town|City|Village|Heights|Corp\.?)$/u, '')
}

function showNodeLabel(node: MapNode, scale: number): boolean {
  if (node.kind === 'town' || node.key === 'pokemon-league') return true
  return scale >= 0.34
}

function avoidLabelCollisions(
  nodes: MapNode[],
  font: number,
  view: { x: number; y: number; scale: number },
  stageW: number,
  stageH: number,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  const placed: { l: number; t: number; r: number; b: number }[] = []
  const step = Math.min(14, 12 / view.scale)
  const ordered = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const node of ordered) {
    const lines = labelLines((node as MapNode & { labelName?: string }).labelName ?? placeByKey(node.key)?.name ?? node.key)
    const tries = [{ x: 0, y: 0 }]
    for (let i = 1; i <= 3; i++) {
      tries.push({ x: -step * i, y: 0 }, { x: step * i, y: 0 }, { x: 0, y: step * i }, { x: 0, y: -step * i })
    }
    let best = tries[0]
    let bestScore = Infinity
    for (const shift of tries) {
      const box = labelScreenBox(node, lines, font, view, shift)
      let overlap = 0
      for (const other of placed) overlap += boxOverlap(box, other)
      const pad = 4
      const outside = (box.l < pad ? pad - box.l : 0) + (box.r > stageW - pad ? box.r - (stageW - pad) : 0)
        + (box.t < pad ? pad - box.t : 0) + (box.b > stageH - pad ? box.b - (stageH - pad) : 0)
      const score = overlap * 10 + outside
      if (score < bestScore) {
        bestScore = score
        best = shift
      }
      if (score === 0) break
    }
    placed.push(labelScreenBox(node, lines, font, view, best))
    if (best.x || best.y) out.set(node.key, best)
  }
  return out
}

function labelScreenBox(
  node: MapNode,
  lines: string[],
  font: number,
  view: { x: number; y: number; scale: number },
  shift: { x: number; y: number },
) {
  const w = Math.max(...lines.map((line) => line.length)) * font * 0.64 * view.scale + 8
  const h = lines.length * font * 1.55 * view.scale + 6
  const ax = (node.x + node.labelX + shift.x) * view.scale + view.x
  const ay = (node.y + node.labelY + shift.y) * view.scale + view.y
  let left = ax
  if (node.labelAnchor === 'middle') left = ax - w / 2
  else if (node.labelAnchor === 'end') left = ax - w
  const top = ay - h * 0.8
  return { l: left, t: top, r: left + w, b: top + h }
}

function boxOverlap(a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l)
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t)
  if (w <= 0 || h <= 0) return 0
  return w * h
}

function labelLines(name: string): string[] {
  if (name.length <= 14 || !name.includes(' ')) return [name]
  let splitAt = name.lastIndexOf(' ', 18)
  if (splitAt < 4) splitAt = name.indexOf(' ')
  if (splitAt < 1) return [name]
  return [name.slice(0, splitAt), name.slice(splitAt + 1)]
}

function edgePath(a: MapNode, b: MapNode, role: string): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) < 14) return `M ${a.x} ${a.y} V ${b.y}`
  if (Math.abs(dy) < 14) return `M ${a.x} ${a.y} H ${b.x}`
  if (role === 'link') {
    const mid = a.x + dx * 0.5
    return `M ${a.x} ${a.y} H ${mid} V ${b.y} H ${b.x}`
  }
  if (Math.abs(dx) >= Math.abs(dy)) return `M ${a.x} ${a.y} H ${b.x} V ${b.y}`
  return `M ${a.x} ${a.y} V ${b.y} H ${b.x}`
}

function guideTitle(step: GuideStep): string {
  if (step.route_key === 'distortion-world') return 'Distortion World'
  return routeTitleByKey(step.route_key)
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
