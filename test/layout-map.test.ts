import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const layout = JSON.parse(readFileSync(join(here, '../src/data/unbound/layout.json'), 'utf8'))
const routes = JSON.parse(readFileSync(join(here, '../src/data/unbound/routes.json'), 'utf8')) as { key: string; neighbours: string[] }[]

test('schematic layout covers the route graph and is not a straight line', () => {
  assert.equal(layout.nodes.length, 73)
  assert.equal(layout.nodes.length, routes.length)
  assert.equal(layout.edges.length, 93)
  assert.match(layout.caption, /not a geographic map of Borrius/)
  const keys = new Set(layout.nodes.map((node: { key: string }) => node.key))
  for (const route of routes) assert.equal(keys.has(route.key), true, route.key)
  const ys = layout.nodes.map((node: { y: number }) => node.y)
  const xs = layout.nodes.map((node: { x: number }) => node.x)
  assert.ok(Math.max(...ys) - Math.min(...ys) > 600)
  assert.ok(Math.max(...xs) - Math.min(...xs) > 600)
  let min = Infinity
  for (let i = 0; i < layout.nodes.length; i++) {
    for (let j = i + 1; j < layout.nodes.length; j++) {
      const a = layout.nodes[i]
      const b = layout.nodes[j]
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y))
    }
  }
  assert.ok(min >= 120, `nodes closer than 120 (${min})`)
})
