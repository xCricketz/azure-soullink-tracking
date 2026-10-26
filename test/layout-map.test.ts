import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const layout = JSON.parse(readFileSync(join(here, '../src/data/unbound/layout.json'), 'utf8'))
const routes = JSON.parse(readFileSync(join(here, '../src/data/unbound/routes.json'), 'utf8')) as { key: string; neighbours: string[] }[]

test('region layout covers the route graph and matches Borrius', () => {
  assert.equal(layout.nodes.length, 73)
  assert.equal(layout.nodes.length, routes.length)
  assert.equal(layout.edges.length, 93)
  const roles = new Set(layout.edges.map((edge: string[]) => edge[2]))
  assert.equal(roles.has('story'), true)
  assert.equal(roles.has('link'), true)
  assert.equal(roles.has('side'), true)
  assert.match(layout.caption, /Borrius/)
  assert.doesNotMatch(layout.caption, /not a geographic/)
  const keys = new Set(layout.nodes.map((node: { key: string }) => node.key))
  for (const route of routes) assert.equal(keys.has(route.key), true, route.key)
  const at = (key: string) => {
    const node = layout.nodes.find((item: { key: string }) => item.key === key)
    assert.ok(node, key)
    return node as { key: string; x: number; y: number }
  }
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

  assert.ok(at('blizzard-city').x < at('frozen-heights').x)
  assert.ok(at('frozen-heights').y <= at('blizzard-city').y + 8)
  assert.ok(at('pokemon-league').x > at('frozen-heights').x)
  assert.ok(at('pokemon-league').y < at('dehara-city').y)
  const midX = (at('blizzard-city').x + at('pokemon-league').x) / 2
  assert.ok(Math.abs(at('frozen-heights').x - midX) < Math.abs(at('blizzard-city').x - midX))
  assert.ok(at('epidimy-town').y < at('tarmigan-town').y)
  assert.ok(at('tarmigan-town').y < at('route-12').y)
  assert.ok(at('route-12').y < at('dehara-city').y)
  assert.ok(Math.abs(at('epidimy-town').x - at('dehara-city').x) < 8)
  assert.ok(at('antisis-city').x > at('dehara-city').x && at('antisis-city').y > at('dehara-city').y)
  assert.ok(at('seaport-city').x > at('antisis-city').x)
  assert.ok(at('magnolia-town').x > at('dehara-city').x)
  assert.ok(at('redwood-village').x > at('dehara-city').x)
  assert.ok(at('cube-corp').x >= at('redwood-village').x)
  assert.equal(layout.islands.length, 3)
  for (const isle of layout.islands as { x: number; y: number }[]) {
    assert.ok(isle.x > at('cube-corp').x)
    assert.ok(isle.y > at('seaport-city').y)
  }
})
