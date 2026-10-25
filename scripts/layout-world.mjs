/**
 * Deterministic schematic layout for the Unbound route graph.
 * No randomness. Re-run: node scripts/layout-world.mjs
 * Output: src/data/unbound/layout.json
 */
import { readFileSync, writeFileSync } from 'node:fs'

const routes = JSON.parse(readFileSync(new URL('../src/data/unbound/routes.json', import.meta.url), 'utf8'))
const guide = JSON.parse(readFileSync(new URL('../src/data/unbound/guide.json', import.meta.url), 'utf8'))
const byKey = new Map(routes.map((node) => [node.key, node]))

/** Column / row on a regional board. Spacing is applied below. Not geographic. */
const CELL = {
  'frozen-heights': [0, 1],
  'route-1': [1, 1],
  'bellin-town': [2, 0],
  'icy-hole': [3, 0],
  'icicle-cave': [1, 2],
  'route-2': [2, 2],
  'dresco-town': [3, 2],
  'dresco-gym': [3, 3],
  'route-3': [4, 2],
  'flower-paradise': [5, 1],
  'grim-woods': [4, 3],
  'route-4': [5, 3],
  'cinder-volcano': [6, 3],
  'cinder-volcano-depths': [7, 4],
  'route-5': [6, 4],
  'crater-town': [5, 4],
  'crater-gym': [4, 5],
  'valley-cave': [6, 5],
  'route-6': [7, 5],
  'route-7': [8, 4],
  'frost-mountain': [9, 3],
  'route-8': [9, 4],
  'blizzard-city': [10, 4],
  'blizzard-gym': [11, 3],
  'frozen-forest': [10, 5],
  'kbt-expressway': [6, 1],
  'fallshore-city': [10, 2],
  'fallshore-gym': [11, 2],
  'cliff-cave': [11, 1],
  'route-11': [9, 2],
  'epidimy-town': [8, 1],
  'thundercap-mountain': [7, 2],
  'route-10': [8, 2],
  'route-9': [7, 0],
  'tehl-town': [6, 0],
  'tarmigan-town': [9, 1],
  'tarmigan-mansion': [10, 0],
  'route-12': [8, 5],
  'dehara-city': [5, 6],
  'dehara-gym': [4, 6],
  'rift-cave': [3, 7],
  'ruins-of-void': [8, 6],
  'route-13': [6, 6],
  'route-14': [7, 6],
  'auburn-waterway': [8, 3],
  'lost-tunnel': [9, 5],
  'great-desert': [5, 7],
  'tomb-of-borrius': [4, 8],
  'gurun-town': [6, 7],
  'route-18': [7, 8],
  'victory-road': [8, 8],
  'pokemon-league': [9, 8],
  'vivill-woods': [6, 8],
  'vivill-town': [5, 8],
  'vivill-warehouse': [5, 9],
  'route-15': [2, 4],
  'route-16': [7, 7],
  'antisis-city': [8, 7],
  'antisis-sewers': [9, 6],
  'antisis-gym': [9, 7],
  'route-17': [10, 6],
  'seaport-city': [10, 7],
  'polder-town': [10, 8],
  'polder-gym': [11, 8],
  'safari-zone': [11, 7],
  'cootes-bog': [10, 9],
  'magnolia-town': [9, 9],
  'magnolia-fields': [8, 10],
  'redwood-village': [7, 10],
  'redwood-forest': [6, 10],
  'redwood-gym': [7, 11],
  'crystal-peak': [9, 10],
  'cube-corp': [8, 11],
}

const BLOBS = [
  { id: 'snowfields', kind: 'snow', keys: ['frozen-heights', 'route-1', 'bellin-town', 'icicle-cave', 'icy-hole', 'route-2'] },
  { id: 'meadows', kind: 'grass', keys: ['dresco-town', 'dresco-gym', 'route-3', 'flower-paradise', 'grim-woods'] },
  { id: 'volcano', kind: 'volcano', keys: ['route-4', 'cinder-volcano', 'cinder-volcano-depths', 'route-5', 'crater-town', 'crater-gym'] },
  { id: 'frost', kind: 'mountain', keys: ['frost-mountain', 'route-7', 'route-8', 'blizzard-city', 'blizzard-gym', 'frozen-forest', 'valley-cave'] },
  { id: 'coast', kind: 'sea', keys: ['fallshore-city', 'fallshore-gym', 'route-10', 'route-11', 'route-9', 'auburn-waterway', 'cliff-cave'] },
  { id: 'peaks', kind: 'mountain', keys: ['thundercap-mountain', 'crystal-peak', 'victory-road'] },
  { id: 'desert', kind: 'desert', keys: ['great-desert', 'gurun-town', 'tomb-of-borrius', 'route-16'] },
  { id: 'woods', kind: 'grass', keys: ['vivill-woods', 'vivill-town', 'vivill-warehouse', 'magnolia-fields', 'redwood-village', 'redwood-forest'] },
  { id: 'harbour', kind: 'sea', keys: ['seaport-city', 'route-17', 'polder-town', 'polder-gym', 'cootes-bog', 'safari-zone'] },
  { id: 'cities', kind: 'city', keys: ['dehara-city', 'antisis-city', 'kbt-expressway', 'pokemon-league', 'cube-corp', 'tehl-town'] },
]

const RADIUS = { town: 18, gym: 15, route: 9, cave: 12, dungeon: 13, other: 12 }
const STEP_X = 176
const STEP_Y = 168
const ORIGIN_X = 150
const ORIGIN_Y = 130

const gyms = routes.filter((node) => node.kind === 'gym').sort((a, b) => a.order - b.order)
const badgeOfGym = new Map(gyms.map((gym, index) => [gym.key, index + 1]))
const badgeOfTown = new Map()
for (const gym of gyms) {
  const town = gym.neighbours.find((key) => byKey.get(key)?.kind === 'town')
  if (town) badgeOfTown.set(town, badgeOfGym.get(gym.key))
}

const seen = new Set()
for (const [key, cell] of Object.entries(CELL)) {
  const id = cell.join(',')
  if (seen.has(id)) throw new Error(`cell clash ${id} at ${key}`)
  seen.add(id)
  if (!byKey.has(key)) throw new Error(`unknown key ${key}`)
}
for (const node of routes) {
  if (!CELL[node.key]) throw new Error(`missing cell for ${node.key}`)
}

const nodes = routes.map((node) => {
  const [col, row] = CELL[node.key]
  return {
    key: node.key,
    name: node.name,
    kind: node.kind,
    x: ORIGIN_X + col * STEP_X,
    y: ORIGIN_Y + row * STEP_Y,
    r: RADIUS[node.kind] ?? 11,
    badge: badgeOfGym.get(node.key) ?? badgeOfTown.get(node.key) ?? null,
  }
})

const edgeSet = new Set()
for (const node of routes) {
  for (const next of node.neighbours) {
    if (!byKey.has(next)) continue
    const pair = [node.key, next].sort()
    edgeSet.add(pair.join('|'))
  }
}
const spine = []
for (const step of guide) {
  if (step.route_key && !spine.includes(step.route_key)) spine.push(step.route_key)
}
const storyPairs = new Set()
for (let i = 0; i < spine.length - 1; i++) storyPairs.add([spine[i], spine[i + 1]].sort().join('|'))

function edgeRole(a, b) {
  if (storyPairs.has([a, b].sort().join('|'))) return 'story'
  const [ac, ar] = CELL[a]
  const [bc, br] = CELL[b]
  const manhattan = Math.abs(ac - bc) + Math.abs(ar - br)
  if (a === 'kbt-expressway' || b === 'kbt-expressway' || manhattan >= 4) return 'link'
  return 'side'
}

const edges = [...edgeSet].map((pair) => {
  const [a, b] = pair.split('|')
  return [a, b, edgeRole(a, b)]
})

function labelLines(name) {
  if (name.length <= 14 || !name.includes(' ')) return [name]
  let splitAt = name.lastIndexOf(' ', 18)
  if (splitAt < 4) splitAt = name.indexOf(' ')
  if (splitAt < 1) return [name]
  return [name.slice(0, splitAt), name.slice(splitAt + 1)]
}

function boxOf(node, opt, w, h) {
  let left = node.x + opt.dx
  if (opt.anchor === 'middle') left -= w / 2
  else if (opt.anchor === 'end') left -= w
  const top = node.y + opt.dy - 12
  return { left, top, right: left + w, bottom: top + h }
}

function overlapArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  if (w <= 0 || h <= 0) return 0
  return w * h
}

function coversCircle(box, node) {
  const cx = Math.min(Math.max(node.x, box.left), box.right)
  const cy = Math.min(Math.max(node.y, box.top), box.bottom)
  const dx = cx - node.x
  const dy = cy - node.y
  return dx * dx + dy * dy < (node.r + 4) ** 2 ? 80 : 0
}

const placed = []
for (const node of nodes) {
  const lines = labelLines(node.name)
  const w = Math.ceil(Math.max(...lines.map((line) => line.length)) * 6.8) + 10
  const h = lines.length * 16 + 4
  const options = [
    { dx: 0, dy: node.r + 18, anchor: 'middle' },
    { dx: 0, dy: -(node.r + 8), anchor: 'middle' },
    { dx: node.r + 10, dy: 4, anchor: 'start' },
    { dx: -(node.r + 10), dy: 4, anchor: 'end' },
    { dx: node.r + 8, dy: node.r + 8, anchor: 'start' },
    { dx: -(node.r + 8), dy: node.r + 8, anchor: 'end' },
    { dx: 0, dy: node.r + 34, anchor: 'middle' },
  ]
  let best = null
  let bestScore = Infinity
  for (const opt of options) {
    const box = boxOf(node, opt, w, h)
    let score = 0
    for (const other of placed) score += overlapArea(box, other)
    for (const other of nodes) score += coversCircle(box, other)
    if (score < bestScore) {
      bestScore = score
      best = { ...opt, box }
    }
    if (score === 0) break
  }
  node.labelX = best.dx
  node.labelY = best.dy
  node.labelAnchor = best.anchor
  placed.push(best.box)
}

let labelOverlaps = 0
for (let i = 0; i < placed.length; i++) {
  for (let j = i + 1; j < placed.length; j++) {
    if (overlapArea(placed[i], placed[j]) > 0) labelOverlaps += 1
  }
}

const pos = new Map(nodes.map((node) => [node.key, node]))
const regions = BLOBS.map((blob) => {
  const pts = blob.keys.map((key) => pos.get(key))
  const cx = pts.reduce((sum, node) => sum + node.x, 0) / pts.length
  const cy = pts.reduce((sum, node) => sum + node.y, 0) / pts.length
  const rx = Math.max(...pts.map((node) => Math.abs(node.x - cx))) + 110
  const ry = Math.max(...pts.map((node) => Math.abs(node.y - cy))) + 96
  return { id: blob.id, kind: blob.kind, x: Math.round(cx), y: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry) }
})

const pad = 80
const minX = Math.min(...nodes.map((node) => node.x)) - pad
const minY = Math.min(...nodes.map((node) => node.y)) - pad
const maxX = Math.max(...nodes.map((node) => node.x)) + pad
const maxY = Math.max(...nodes.map((node) => node.y)) + pad
for (const node of nodes) {
  node.x -= minX
  node.y -= minY
}
for (const region of regions) {
  region.x -= minX
  region.y -= minY
}

let minDist = Infinity
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
    if (d < minDist) minDist = d
  }
}

const ys = nodes.map((node) => node.y)
const ySpread = Math.max(...ys) - Math.min(...ys)
if (ySpread < 600) throw new Error(`layout is too flat (${ySpread})`)
if (minDist < 120) throw new Error(`nodes too close (${minDist})`)
if (edges.length !== 93) throw new Error(`expected 93 edges, got ${edges.length}`)
if (!edges.some((edge) => edge[2] === 'story')) throw new Error('story path missing')
if (!edges.some((edge) => edge[2] === 'link')) throw new Error('long links missing')
if (labelOverlaps > 8) throw new Error(`${labelOverlaps} label overlaps`)

const layout = {
  width: Math.round(maxX - minX),
  height: Math.round(maxY - minY),
  caption: 'Schematic, not a geographic map of Borrius.',
  nodes: nodes.map((node) => ({
    key: node.key,
    x: Math.round(node.x),
    y: Math.round(node.y),
    kind: node.kind,
    badge: node.badge,
    labelX: node.labelX,
    labelY: node.labelY,
    labelAnchor: node.labelAnchor,
  })),
  edges,
  regions,
}

writeFileSync(new URL('../src/data/unbound/layout.json', import.meta.url), `${JSON.stringify(layout)}\n`)
console.log(`nodes ${layout.nodes.length} edges ${layout.edges.length} size ${layout.width}x${layout.height} minDist ${minDist.toFixed(1)} ySpread ${ySpread} labelOverlaps ${labelOverlaps}`)
