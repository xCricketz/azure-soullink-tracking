import { readFileSync, writeFileSync } from 'node:fs'

const routes = JSON.parse(readFileSync(new URL('../src/data/unbound/routes.json', import.meta.url), 'utf8'))
const nodes = routes.filter((route) => route.kind !== 'gym')
const keys = new Set(nodes.map((route) => route.key))
const pos = new Map(nodes.map((route) => [route.key, { x: route.order * 150, y: route.optional ? 120 : (route.order % 2 === 0 ? -28 : 28) }]))
const neighbours = new Map(nodes.map((route) => [route.key, route.neighbours.filter((key) => keys.has(key))]))
const edges = []
for (const route of nodes) {
  for (const next of neighbours.get(route.key)) {
    if (route.key < next) edges.push([route.key, next])
  }
}

for (let iter = 0; iter < 24; iter++) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = pos.get(nodes[i].key)
      const b = pos.get(nodes[j].key)
      const dx = Math.abs(a.x - b.x)
      if (dx > 140) continue
      const dy = a.y - b.y
      if (Math.abs(dy) >= 54) continue
      const push = (54 - Math.abs(dy)) / 2 + 1
      const sign = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy)
      a.y += sign * push
      b.y -= sign * push
    }
  }
}

let minX = Infinity
let minY = Infinity
let maxX = -Infinity
let maxY = -Infinity
for (const point of pos.values()) {
  minX = Math.min(minX, point.x)
  minY = Math.min(minY, point.y)
  maxX = Math.max(maxX, point.x)
  maxY = Math.max(maxY, point.y)
}
const pad = 36
const laid = nodes.map((route) => ({
  key: route.key,
  x: Math.round(pos.get(route.key).x - minX + pad),
  y: Math.round(pos.get(route.key).y - minY + pad),
}))
const width = Math.round(maxX - minX + pad * 2)
const height = Math.round(maxY - minY + pad * 2)
const layout = {
  width,
  height,
  nodes: laid,
  edges,
}
writeFileSync(new URL('../src/data/unbound/layout.json', import.meta.url), JSON.stringify(layout))

let closest = Infinity
for (let i = 0; i < laid.length; i++) {
  for (let j = i + 1; j < laid.length; j++) {
    const dx = laid[i].x - laid[j].x
    const dy = laid[i].y - laid[j].y
    closest = Math.min(closest, Math.hypot(dx, dy))
  }
}
console.log(`nodes ${laid.length} edges ${edges.length} ${width}x${height} closest ${closest.toFixed(1)}`)
