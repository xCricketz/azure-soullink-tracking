/**
 * Hand-tuned Borrius layout. Coordinates follow the region: north is up,
 * Frozen Heights top centre, Blizzard City far top-left, the League top-right,
 * a vertical trunk through Epidimy, Tarmigan, Route 12 and Dehara, Antisis
 * south-east, Seaport and the Magnolia / Redwood / Cube Corp. side to the east.
 * Island shapes sit in the sea bottom-right. This is original geometry, not a
 * trace of any picture.
 * Re-run: node scripts/layout-world.mjs
 * Output: src/data/unbound/layout.json
 */
import { readFileSync, writeFileSync } from 'node:fs'

const routes = JSON.parse(readFileSync(new URL('../src/data/unbound/routes.json', import.meta.url), 'utf8'))
const guide = JSON.parse(readFileSync(new URL('../src/data/unbound/guide.json', import.meta.url), 'utf8'))
const byKey = new Map(routes.map((node) => [node.key, node]))

/** Column / row. Spacing is applied below. North is row 0, east is a higher column. */
const GRID = {
  'blizzard-city': [1, 0],
  'blizzard-gym': [1, 1],
  'frozen-forest': [2, 1],
  'route-8': [2, 2],
  'frost-mountain': [3, 2],

  'frozen-heights': [6, 0],
  'route-1': [6, 1],
  'bellin-town': [7, 1],
  'icy-hole': [8, 0],
  'icicle-cave': [6, 2],
  'route-2': [6, 3],
  'route-7': [4, 3],

  'dresco-town': [6, 4],
  'dresco-gym': [5, 4],
  'route-3': [7, 4],
  'flower-paradise': [7, 3],
  'grim-woods': [6, 5],
  'route-6': [7, 6],
  'route-4': [5, 6],
  'cinder-volcano': [4, 6],
  'cinder-volcano-depths': [3, 7],
  'route-5': [5, 7],
  'crater-town': [6, 7],
  'crater-gym': [5, 8],
  'valley-cave': [7, 7],
  'route-13': [6, 9],
  'route-15': [4, 9],

  'epidimy-town': [8, 5],
  'tarmigan-town': [8, 6],
  'tarmigan-mansion': [9, 6],
  'route-12': [8, 7],
  'route-14': [9, 7],
  'dehara-city': [8, 8],
  'dehara-gym': [9, 9],
  'rift-cave': [7, 8],
  'ruins-of-void': [10, 7],
  'kbt-expressway': [9, 8],

  'tehl-town': [9, 2],
  'route-9': [8, 3],
  'route-10': [9, 4],
  'fallshore-city': [10, 4],
  'fallshore-gym': [11, 4],
  'cliff-cave': [11, 3],
  'route-11': [9, 5],
  'auburn-waterway': [10, 5],
  'lost-tunnel': [10, 6],
  'thundercap-mountain': [10, 8],

  'great-desert': [8, 10],
  'tomb-of-borrius': [7, 10],
  'gurun-town': [8, 11],
  'vivill-woods': [7, 11],
  'vivill-town': [6, 12],
  'vivill-warehouse': [5, 12],
  'route-16': [9, 11],

  'antisis-city': [10, 11],
  'antisis-gym': [10, 12],
  'antisis-sewers': [11, 12],
  'route-17': [11, 11],
  'seaport-city': [12, 10],
  'polder-town': [12, 11],
  'polder-gym': [13, 11],
  'safari-zone': [13, 10],
  'cootes-bog': [12, 12],
  'magnolia-town': [13, 12],
  'magnolia-fields': [14, 12],
  'redwood-village': [13, 13],
  'redwood-gym': [12, 13],
  'redwood-forest': [13, 14],
  'crystal-peak': [14, 13],
  'cube-corp': [14, 14],

  'route-18': [12, 2],
  'victory-road': [13, 1],
  'pokemon-league': [14, 0],
}

const BLOBS = [
  { id: 'snowfields', kind: 'snow', keys: ['frozen-heights', 'route-1', 'bellin-town', 'icicle-cave', 'icy-hole', 'route-2'] },
  { id: 'meadows', kind: 'grass', keys: ['dresco-town', 'dresco-gym', 'route-3', 'flower-paradise', 'grim-woods'] },
  { id: 'volcano', kind: 'volcano', keys: ['route-4', 'cinder-volcano', 'cinder-volcano-depths', 'route-5', 'crater-town', 'crater-gym'] },
  { id: 'frost', kind: 'mountain', keys: ['frost-mountain', 'route-7', 'route-8', 'blizzard-city', 'blizzard-gym', 'frozen-forest'] },
  { id: 'coast', kind: 'sea', keys: ['fallshore-city', 'fallshore-gym', 'route-10', 'route-11', 'route-9', 'tehl-town', 'cliff-cave', 'auburn-waterway'] },
  { id: 'thundercap', kind: 'mountain', keys: ['thundercap-mountain', 'epidimy-town', 'tarmigan-town'] },
  { id: 'desert', kind: 'desert', keys: ['great-desert', 'gurun-town', 'tomb-of-borrius', 'route-16'] },
  { id: 'vivill', kind: 'grass', keys: ['vivill-woods', 'vivill-town', 'vivill-warehouse'] },
  { id: 'harbour', kind: 'sea', keys: ['seaport-city', 'route-17', 'polder-town', 'polder-gym', 'cootes-bog', 'safari-zone', 'antisis-city'] },
  { id: 'eastwood', kind: 'grass', keys: ['magnolia-town', 'magnolia-fields', 'redwood-village', 'redwood-forest', 'redwood-gym', 'cube-corp'] },
  { id: 'crystal', kind: 'mountain', keys: ['crystal-peak'] },
  { id: 'hub', kind: 'city', keys: ['dehara-city', 'dehara-gym', 'kbt-expressway'] },
  { id: 'league', kind: 'mountain', keys: ['victory-road', 'pokemon-league', 'route-18'] },
]

/** Decorative sea islands. Not routes, and not copied from a picture. */
const ISLAND_GRID = [
  { id: 'glimmer', name: 'Glimmer Isle', col: 16, row: 15, rx: 78, ry: 52 },
  { id: 'fullmoon', name: 'Fullmoon Island', col: 18, row: 17, rx: 64, ry: 46 },
  { id: 'newmoon', name: 'Newmoon Island', col: 15, row: 18, rx: 56, ry: 40 },
]

const RADIUS = { town: 18, gym: 15, route: 9, cave: 12, dungeon: 13, other: 12 }
const STEP_X = 176
const STEP_Y = 168
const ORIGIN_X = 160
const ORIGIN_Y = 140
const LINK_DISTANCE = 560

const gyms = routes.filter((node) => node.kind === 'gym').sort((a, b) => a.order - b.order)
const badgeOfGym = new Map(gyms.map((gym, index) => [gym.key, index + 1]))
const badgeOfTown = new Map()
for (const gym of gyms) {
  const town = gym.neighbours.find((key) => byKey.get(key)?.kind === 'town')
  if (town) badgeOfTown.set(town, badgeOfGym.get(gym.key))
}

const seen = new Set()
for (const [key, cell] of Object.entries(GRID)) {
  const id = cell.join(',')
  if (seen.has(id)) throw new Error(`cell clash ${id} at ${key}`)
  seen.add(id)
  if (!byKey.has(key)) throw new Error(`unknown key ${key}`)
}
for (const node of routes) {
  if (!GRID[node.key]) throw new Error(`missing cell for ${node.key}`)
}

const nodes = routes.map((node) => {
  const [col, row] = GRID[node.key]
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
  // Guide notes such as Distortion World are not map nodes. Skipping them
  // keeps the story path between the real neighbours.
  if (step.route_key && byKey.has(step.route_key) && !spine.includes(step.route_key)) spine.push(step.route_key)
}
const storyPairs = new Set()
for (let i = 0; i < spine.length - 1; i++) storyPairs.add([spine[i], spine[i + 1]].sort().join('|'))

const pos = new Map(nodes.map((node) => [node.key, node]))

function edgeRole(a, b) {
  if (storyPairs.has([a, b].sort().join('|'))) return 'story'
  if (a === 'kbt-expressway' || b === 'kbt-expressway') return 'link'
  const left = pos.get(a)
  const right = pos.get(b)
  if (Math.hypot(left.x - right.x, left.y - right.y) >= LINK_DISTANCE) return 'link'
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

const regions = BLOBS.map((blob) => {
  const pts = blob.keys.map((key) => pos.get(key))
  const cx = pts.reduce((sum, node) => sum + node.x, 0) / pts.length
  const cy = pts.reduce((sum, node) => sum + node.y, 0) / pts.length
  const rx = Math.max(120, Math.max(...pts.map((node) => Math.abs(node.x - cx))) + 120)
  const ry = Math.max(96, Math.max(...pts.map((node) => Math.abs(node.y - cy))) + 100)
  return { id: blob.id, kind: blob.kind, x: Math.round(cx), y: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry) }
})

const islands = ISLAND_GRID.map((isle) => ({
  id: isle.id,
  name: isle.name,
  x: ORIGIN_X + isle.col * STEP_X,
  y: ORIGIN_Y + isle.row * STEP_Y,
  rx: isle.rx,
  ry: isle.ry,
}))

const pad = 90
const minX = Math.min(...nodes.map((node) => node.x), ...islands.map((isle) => isle.x - isle.rx)) - pad
const minY = Math.min(...nodes.map((node) => node.y), ...islands.map((isle) => isle.y - isle.ry)) - pad
const maxX = Math.max(...nodes.map((node) => node.x), ...islands.map((isle) => isle.x + isle.rx)) + pad
const maxY = Math.max(...nodes.map((node) => node.y), ...islands.map((isle) => isle.y + isle.ry)) + pad
for (const node of nodes) {
  node.x -= minX
  node.y -= minY
}
for (const region of regions) {
  region.x -= minX
  region.y -= minY
}
for (const isle of islands) {
  isle.x -= minX
  isle.y -= minY
}

let minDist = Infinity
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
    if (d < minDist) minDist = d
  }
}

const ys = nodes.map((node) => node.y)
const xs = nodes.map((node) => node.x)
const ySpread = Math.max(...ys) - Math.min(...ys)
const xSpread = Math.max(...xs) - Math.min(...xs)
if (ySpread < 600) throw new Error(`layout is too flat (${ySpread})`)
if (xSpread < 600) throw new Error(`layout is too narrow (${xSpread})`)
if (minDist < 120) throw new Error(`nodes too close (${minDist})`)
if (edges.length !== 93) throw new Error(`expected 93 edges, got ${edges.length}`)
if (!edges.some((edge) => edge[2] === 'story')) throw new Error('story path missing')
if (!edges.some((edge) => edge[2] === 'link')) throw new Error('long links missing')
if (!edges.some((edge) => edge[2] === 'side')) throw new Error('side paths missing')
if (labelOverlaps > 16) throw new Error(`${labelOverlaps} label overlaps`)

const trunk = ['epidimy-town', 'tarmigan-town', 'route-12', 'dehara-city'].map((key) => pos.get(key))
for (let i = 1; i < trunk.length; i++) {
  if (trunk[i].y <= trunk[i - 1].y) throw new Error('central trunk is not north-to-south')
  if (Math.abs(trunk[i].x - trunk[0].x) > 8) throw new Error('central trunk is not vertical')
}

const layout = {
  width: Math.round(maxX - minX),
  height: Math.round(maxY - minY),
  caption: 'Borrius, with towns and routes in their places. Drag to pan, pinch or use the buttons to zoom.',
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
  islands: islands.map((isle) => ({
    id: isle.id,
    name: isle.name,
    x: Math.round(isle.x),
    y: Math.round(isle.y),
    rx: isle.rx,
    ry: isle.ry,
  })),
}

writeFileSync(new URL('../src/data/unbound/layout.json', import.meta.url), `${JSON.stringify(layout)}\n`)
console.log(`nodes ${layout.nodes.length} edges ${layout.edges.length} size ${layout.width}x${layout.height} minDist ${minDist.toFixed(1)} ySpread ${ySpread} xSpread ${xSpread} labelOverlaps ${labelOverlaps} links ${edges.filter((edge) => edge[2] === 'link').length}`)
