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
  assert.ok(min >= 14, `nodes closer than 14 (${min})`)

  const imgW = 1148
  const imgH = 862
  const tolX = imgW * 0.05
  const tolY = imgH * 0.05
  // Label centres read off the reference image. Layout stores them with a 36px pad.
  const ref: Record<string, [number, number]> = {
    'blizzard-city': [84, 216],
    'frozen-heights': [554, 112],
    'dehara-city': [470, 362],
    'rift-cave': [450, 400],
    'route-12': [453, 550],
    'tarmigan-town': [447, 626],
    'epidimy-town': [520, 720],
    'vivill-town': [672, 309],
    'gurun-town': [644, 420],
    'dresco-town': [458, 301],
    'tehl-town': [158, 728],
    'fallshore-city': [356, 740],
    'route-10': [263, 718],
    'seaport-city': [820, 530],
    'antisis-city': [653, 712],
    'magnolia-town': [924, 218],
    'redwood-village': [1083, 209],
    'cube-corp': [1073, 360],
    'pokemon-league': [787, 307],
    'route-15': [606, 322],
    'route-11': [418, 750],
  }
  for (const [key, [x, y]] of Object.entries(ref)) {
    const node = at(key)
    assert.ok(Math.abs(node.x - 36 - x) <= tolX, `${key} x off by ${node.x - 36 - x}`)
    assert.ok(Math.abs(node.y - 36 - y) <= tolY, `${key} y off by ${node.y - 36 - y}`)
  }

  assert.ok(at('blizzard-city').x < at('frozen-heights').x)
  assert.ok(at('frozen-heights').y < at('blizzard-city').y)
  assert.ok(at('magnolia-town').y < at('dehara-city').y)
  assert.ok(at('redwood-village').x > at('magnolia-town').x)
  assert.ok(at('redwood-village').y <= at('magnolia-town').y + tolY)
  assert.ok(at('cube-corp').y > at('redwood-village').y)
  assert.ok(at('dehara-city').y < at('route-12').y)
  assert.ok(at('route-12').y < at('tarmigan-town').y)
  assert.ok(at('tarmigan-town').y < at('epidimy-town').y)
  assert.ok(at('vivill-town').x > at('dresco-town').x)
  assert.ok(at('vivill-town').y < at('gurun-town').y)
  assert.ok(at('tehl-town').x < at('dehara-city').x && at('tehl-town').y > at('dehara-city').y)
  assert.ok(at('fallshore-city').y > at('dehara-city').y)
  assert.ok(at('seaport-city').x > at('dehara-city').x)
  assert.ok(at('antisis-city').x > at('dehara-city').x && at('antisis-city').y > at('dehara-city').y)
  assert.equal(layout.islands.length, 3)
  for (const isle of layout.islands as { x: number; y: number }[]) {
    assert.ok(isle.x > at('antisis-city').x - 40)
    assert.ok(isle.y > at('dehara-city').y)
  }
})
