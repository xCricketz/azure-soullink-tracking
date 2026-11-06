import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextCap } from '../src/lib/caps.ts'
import { capWarningText, capWarnings } from '../src/lib/level-warn.ts'

test('a team Pokémon above the cap is named, and the next cap follows the ladder', () => {
  const warnings = capWarnings([
    { name: 'Growlithe', level: 34, onTeam: true },
    { name: 'Patrat', level: 12, onTeam: true },
    { name: 'Boxed', level: 50, onTeam: false },
  ], 29)
  assert.deepEqual(warnings, [{ name: 'Growlithe', level: 34, cap: 29, overBy: 5 }])
  assert.equal(capWarningText(warnings[0]), 'Growlithe is Lv 34, 5 levels above the level cap 29.')
  assert.deepEqual(capWarnings([{ name: 'Patrat', level: 12, onTeam: true }], null), [])
  assert.equal(nextCap(2, 'vanilla', false)?.level, 33)
  assert.equal(nextCap(2, 'vanilla', false)?.label, '3 badges')
  assert.equal(nextCap(4, 'difficult', false)?.level, 45)
  assert.equal(nextCap(8, 'vanilla', true), null)
})
