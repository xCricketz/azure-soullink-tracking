/**
 * Borrius positions traced from the region map's labels.
 * Each pair is the label centre on the 1148×862 reference, in pixels.
 * North is up. This is placement only: the drawing stays original art.
 * Re-run: node scripts/layout-world.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const routes = JSON.parse(readFileSync(new URL('../src/data/unbound/routes.json', import.meta.url), 'utf8'))
const guide = JSON.parse(readFileSync(new URL('../src/data/unbound/guide.json', import.meta.url), 'utf8'))
const byKey = new Map(routes.map((node) => [node.key, node]))

/** Label centres on the reference image. Gyms sit beside their town. */
const REF = {
  'blizzard-city': [84, 216],
  'blizzard-gym': [36, 188],
  'frozen-forest': [72, 255],
  'route-8': [77, 344],
  'frost-mountain': [66, 385],
  'route-7': [79, 460],
  'frozen-heights': [554, 112],
  'route-1': [565, 157],
  'icicle-cave': [553, 182],
  'icy-hole': [554, 237],
  'bellin-town': [557, 210],
  'route-3': [461, 188],
  'flower-paradise': [451, 225],
  'route-4': [325, 228],
  'cinder-volcano': [314, 267],
  'cinder-volcano-depths': [262, 318],
  'grim-woods': [366, 325],
  'dresco-town': [458, 301],
  'dresco-gym': [418, 336],
  'route-2': [544, 303],
  'route-5': [227, 347],
  'crater-town': [224, 454],
  'crater-gym': [280, 470],
  'valley-cave': [157, 510],
  'route-6': [165, 480],
  'route-15': [300, 430],
  'kbt-expressway': [600, 470],
  'dehara-city': [470, 362],
  'dehara-gym': [400, 340],
  'rift-cave': [450, 400],
  'route-13': [363, 410],
  'great-desert': [581, 399],
  'tomb-of-borrius': [550, 423],
  'gurun-town': [644, 420],
  'vivill-town': [672, 309],
  'vivill-warehouse': [608, 292],
  'vivill-woods': [651, 360],
  'ruins-of-void': [265, 506],
  'route-14': [321, 552],
  'route-12': [453, 550],
  'lost-tunnel': [270, 590],
  'tarmigan-town': [447, 626],
  'tarmigan-mansion': [438, 660],
  'epidimy-town': [520, 720],
  'route-11': [390, 700],
  'thundercap-mountain': [505, 752],
  'route-10': [263, 718],
  'fallshore-city': [356, 740],
  'fallshore-gym': [400, 788],
  'auburn-waterway': [220, 648],
  'tehl-town': [158, 728],
  'route-9': [83, 612],
  'cliff-cave': [160, 755],
  'route-16': [658, 622],
  'antisis-city': [653, 712],
  'antisis-gym': [710, 690],
  'antisis-sewers': [653, 764],
  'seaport-city': [820, 530],
  'route-17': [730, 553],
  'polder-town': [931, 404],
  'polder-gym': [980, 444],
  'safari-zone': [997, 409],
  'cootes-bog': [962, 283],
  'magnolia-town': [924, 218],
  'magnolia-fields': [1005, 216],
  'crystal-peak': [954, 322],
  'redwood-village': [1083, 209],
  'redwood-gym': [1083, 252],
  'redwood-forest': [1082, 295],
  'cube-corp': [1073, 360],
  'route-18': [783, 370],
  'victory-road': [790, 396],
  'pokemon-league': [787, 307],
}

const ISLANDS = [
  { id: 'glimmer', name: 'Glimmer Isle', x: 990, y: 572, rx: 72, ry: 46 },
  { id: 'fullmoon', name: 'Fullmoon Island', x: 799, y: 736, rx: 64, ry: 42 },
  { id: 'newmoon', name: 'Newmoon Island', x: 945, y: 739, rx: 58, ry: 40 },
]

const BLOBS = [
  { id: 'west-frost', kind: 'snow', keys: ['blizzard-city', 'blizzard-gym', 'frozen-forest', 'route-8', 'frost-mountain', 'route-7'] },
  { id: 'heights', kind: 'snow', keys: ['frozen-heights', 'route-1', 'icicle-cave', 'icy-hole', 'bellin-town', 'route-3', 'flower-paradise'] },
  { id: 'meadow', kind: 'grass', keys: ['dresco-town', 'dresco-gym', 'route-2', 'grim-woods', 'route-4'] },
  { id: 'volcano', kind: 'volcano', keys: ['cinder-volcano', 'cinder-volcano-depths', 'route-5', 'crater-town', 'crater-gym', 'route-6', 'valley-cave'] },
  { id: 'trunk', kind: 'city', keys: ['dehara-city', 'dehara-gym', 'rift-cave', 'route-12', 'tarmigan-town', 'tarmigan-mansion', 'epidimy-town', 'kbt-expressway'] },
  { id: 'vivill', kind: 'grass', keys: ['vivill-town', 'vivill-woods', 'vivill-warehouse', 'gurun-town', 'great-desert', 'tomb-of-borrius'] },
  { id: 'southwest', kind: 'sea', keys: ['tehl-town', 'fallshore-city', 'fallshore-gym', 'route-9', 'route-10', 'route-11', 'auburn-waterway', 'cliff-cave', 'thundercap-mountain', 'route-14', 'lost-tunnel', 'ruins-of-void'] },
  { id: 'harbour', kind: 'sea', keys: ['seaport-city', 'route-17', 'route-16', 'antisis-city', 'antisis-gym', 'antisis-sewers'] },
  { id: 'northeast', kind: 'grass', keys: ['magnolia-town', 'magnolia-fields', 'redwood-village', 'redwood-gym', 'redwood-forest', 'cube-corp', 'cootes-bog', 'crystal-peak', 'polder-town', 'polder-gym', 'safari-zone', 'pokemon-league', 'victory-road', 'route-18'] },
]

const RADIUS = { town: 16, gym: 13, route: 8, cave: 11, dungeon: 12, other: 11 }
const PAD = 36

for (const node of routes) {
  if (!REF[node.key]) throw new Error(`missing reference position for ${node.key}`)
}
for (const key of Object.keys(REF)) {
  if (!byKey.has(key)) throw new Error(`unknown reference key ${key}`)
}

const gyms = routes.filter((node) => node.kind === 'gym').sort((a, b) => a.order - b.order)
const badgeOfGym = new Map(gyms.map((gym, index) => [gym.key, index + 1]))
const badgeOfTown = new Map()
for (const gym of gyms) {
  const town = gym.neighbours.find((key) => byKey.get(key)?.kind === 'town')
  if (town) badgeOfTown.set(town, badgeOfGym.get(gym.key))
}

const nodes = routes.map((node) => {
  const [x, y] = REF[node.key]
  return {
    key: node.key,
    name: node.name,
    kind: node.kind,
    x: x + PAD,
    y: y + PAD,
    r: RADIUS[node.kind] ?? 11,
    badge: badgeOfGym.get(node.key) ?? badgeOfTown.get(node.key) ?? null,
    labelX: 0,
    labelY: (RADIUS[node.kind] ?? 11) + 16,
    labelAnchor: 'middle',
  }
})

const edgeSet = new Set()
for (const node of routes) {
  for (const next of node.neighbours) {
    if (!byKey.has(next)) continue
    edgeSet.add([node.key, next].sort().join('|'))
  }
}
const spine = []
for (const step of guide) {
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
  if (Math.hypot(left.x - right.x, left.y - right.y) >= 340) return 'link'
  return 'side'
}

const edges = [...edgeSet].map((pair) => {
  const [a, b] = pair.split('|')
  return [a, b, edgeRole(a, b)]
})

const regions = BLOBS.map((blob) => {
  const pts = blob.keys.map((key) => pos.get(key))
  const cx = pts.reduce((sum, node) => sum + node.x, 0) / pts.length
  const cy = pts.reduce((sum, node) => sum + node.y, 0) / pts.length
  const rx = Math.max(70, Math.max(...pts.map((node) => Math.abs(node.x - cx))) + 56)
  const ry = Math.max(56, Math.max(...pts.map((node) => Math.abs(node.y - cy))) + 48)
  return { id: blob.id, kind: blob.kind, x: Math.round(cx), y: Math.round(cy), rx: Math.round(rx), ry: Math.round(ry) }
})

const islands = ISLANDS.map((isle) => ({ ...isle, x: isle.x + PAD, y: isle.y + PAD }))

let minDist = Infinity
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    minDist = Math.min(minDist, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y))
  }
}
const ys = nodes.map((node) => node.y)
const xs = nodes.map((node) => node.x)
if (Math.max(...ys) - Math.min(...ys) < 600) throw new Error('layout is too flat')
if (Math.max(...xs) - Math.min(...xs) < 600) throw new Error('layout is too narrow')
if (minDist < 14) throw new Error(`nodes too close (${minDist})`)
if (edges.length !== 93) throw new Error(`expected 93 edges, got ${edges.length}`)
if (!edges.some((edge) => edge[2] === 'story')) throw new Error('story path missing')
if (!edges.some((edge) => edge[2] === 'link')) throw new Error('long links missing')
if (!edges.some((edge) => edge[2] === 'side')) throw new Error('side paths missing')

const dehara = pos.get('dehara-city')
const route12 = pos.get('route-12')
const tarmigan = pos.get('tarmigan-town')
const epidimy = pos.get('epidimy-town')
if (!(dehara.y < route12.y && route12.y < tarmigan.y && tarmigan.y < epidimy.y)) {
  throw new Error('central trunk should run Dehara, Route 12, Tarmigan, Epidimy from north to south')
}

const maxX = Math.max(...nodes.map((node) => node.x), ...islands.map((isle) => isle.x + isle.rx)) + PAD
const maxY = Math.max(...nodes.map((node) => node.y), ...islands.map((isle) => isle.y + isle.ry)) + PAD

const layout = {
  width: Math.round(maxX),
  height: Math.round(maxY),
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
console.log(`nodes ${layout.nodes.length} edges ${layout.edges.length} size ${layout.width}x${layout.height} minDist ${minDist.toFixed(1)}`)
