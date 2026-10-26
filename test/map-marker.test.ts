import assert from 'node:assert/strict'
import { test } from 'node:test'
import layout from '../src/data/unbound/layout.json' with { type: 'json' }
import {
  hereScreenPx,
  hitWorldRadius,
  layoutMarkers,
  markerBaseScreenPx,
  markerScreenDiameter,
  markerWorldRadius,
  pinPlacement,
  pinRingScreenPx,
  visibleMarkerKeys,
  type MarkerPoint,
} from '../src/lib/map-marker.ts'

const NODES = layout.nodes as MarkerPoint[]
const SCALES = [0.3, 0.5, 0.9, 1.5, 2.5]

test('marker screen size grows gently and stays capped', () => {
  let previous = 0
  for (const scale of SCALES) {
    const base = markerBaseScreenPx(scale)
    assert.ok(base >= 11 && base <= 34, `${scale} base ${base}`)
    assert.ok(base > previous, `${scale} did not grow`)
    previous = base
    for (const kind of ['town', 'gym', 'dungeon', 'cave', 'route']) {
      const screen = markerScreenDiameter(scale, kind)
      assert.ok(screen >= 10 && screen <= 34, `${kind} @ ${scale} = ${screen}`)
    }
  }
  assert.equal(markerScreenDiameter(0.3, 'town'), 11)
  assert.equal(markerScreenDiameter(2.5, 'town'), 34)
  assert.ok(markerScreenDiameter(2.5, 'town') / markerScreenDiameter(0.3, 'town') < 2.5 / 0.3)
  assert.ok(markerWorldRadius(2.5, 'town') < markerWorldRadius(0.3, 'town'))
})

test('visible markers do not overlap at zoom 0.3, and close gyms return once zoomed in', () => {
  for (const scale of SCALES) {
    const visible = visibleMarkerKeys(NODES, scale, ['route-6'])
    const shown = NODES.filter((node) => visible.has(node.key))
    for (let i = 0; i < shown.length; i += 1) {
      for (let j = i + 1; j < shown.length; j += 1) {
        const a = shown[i]
        const b = shown[j]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const need = markerWorldRadius(scale, a.kind) + markerWorldRadius(scale, b.kind)
        assert.ok(dist + 0.01 >= need, `${a.key} overlaps ${b.key} at ${scale} (${dist.toFixed(1)} < ${need.toFixed(1)})`)
      }
    }
    assert.equal(NODES.filter((node) => node.kind === 'town').every((node) => visible.has(node.key)), true, `a town was hidden at ${scale}`)
  }
  const wide = visibleMarkerKeys(NODES, 0.3, ['route-6'])
  assert.equal(wide.has('dresco-gym') && wide.has('dehara-gym'), false)
  assert.equal(wide.has('route-6'), true)
  const close = visibleMarkerKeys(NODES, 2.5)
  assert.equal(close.has('dresco-gym') && close.has('dehara-gym'), true)
})

test('hit area stays on this marker and the pin sits above it', () => {
  const placed = layoutMarkers(NODES, 0.3, ['route-6'])
  const shown = NODES.filter((node) => placed.visible.has(node.key))
  for (const node of shown) {
    const hit = placed.hitRadius.get(node.key) ?? 0
    const core = markerWorldRadius(0.3, node.kind)
    assert.ok(hit + 0.001 >= core)
    for (const other of shown) {
      if (other.key === node.key) continue
      const dist = Math.hypot(node.x - other.x, node.y - other.y)
      if (dist / 2 > core) assert.ok(hit <= dist / 2 + 0.01, `${node.key} hit crosses toward ${other.key}`)
    }
  }
  const radius = markerWorldRadius(2.5, 'route')
  const here = hereScreenPx(markerScreenDiameter(2.5, 'route')) / 2.5
  const pin = pinPlacement(2.5, radius, here, -1)
  assert.ok(pin.y + 20 * pin.art < -radius, 'pin tail covers the marker')
  assert.ok(pinRingScreenPx(0.5) < pinRingScreenPx(2.5))
  assert.ok(pinRingScreenPx(2.5) <= 28)
  assert.ok(hereScreenPx(11) >= 8 && hereScreenPx(34) <= 13)
  const solo = { key: 'solo', x: 0, y: 0, kind: 'town' }
  const far = { key: 'far', x: 400, y: 0, kind: 'town' }
  const open = hitWorldRadius(solo, [solo, far], 1)
  assert.ok(Math.abs(open - 16) < 0.01, `open hit was ${open}, expected a 32px target`)
  const crowded = hitWorldRadius(solo, [solo, { key: 'near', x: 28, y: 0, kind: 'town' }], 1)
  assert.ok(Math.abs(crowded - 14) < 0.01, `crowded hit was ${crowded}, expected the midpoint`)
})
