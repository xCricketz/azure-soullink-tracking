import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const guide = JSON.parse(readFileSync(join(here, '../src/data/unbound/guide.json'), 'utf8')) as {
  step: number
  route_key: string
  objective: string
  note?: string
  confidence: string
}[]

test('guide keeps the wiki order and records the story-log gaps', () => {
  assert.deepEqual(guide.map((step) => step.step), guide.map((_, index) => index + 1))
  const at = (key: string) => guide.find((step) => step.route_key === key)
  const index = (key: string) => guide.findIndex((step) => step.route_key === key)
  const epidimy = at('epidimy-town')
  const tehl = at('tehl-town')
  assert.ok(epidimy && tehl)
  assert.ok(index('epidimy-town') < index('tehl-town'))
  assert.equal(epidimy.confidence, 'uncertain')
  assert.match(epidimy.note ?? '', /uncertain/i)
  assert.match(epidimy.note ?? '', /0x500C/)

  const warehouse = index('vivill-warehouse')
  const distortion = index('distortion-world')
  const seaport = index('seaport-city')
  const antisis = index('antisis-sewers')
  assert.ok(warehouse >= 0 && distortion > warehouse && distortion < seaport)
  assert.ok(antisis > warehouse && antisis < distortion)
  const step = at('distortion-world')
  assert.ok(step)
  assert.equal(step.confidence, 'likely')
  assert.match(step.objective, /0x500C 58/)
  assert.match(step.objective, /68/)

  const dehara = at('dehara-city')
  const ruins = at('ruins-of-void')
  assert.match(dehara?.note ?? '', /Game Corner/)
  assert.match(dehara?.note ?? '', /optional/i)
  assert.match(dehara?.note ?? '', /unverified/i)
  assert.match(ruins?.note ?? '', /Cube Space/)
  assert.match(ruins?.note ?? '', /optional/i)
  assert.match(ruins?.note ?? '', /unverified/i)
  assert.equal(guide.filter((item) => item.route_key === 'distortion-world').length, 1)
})
