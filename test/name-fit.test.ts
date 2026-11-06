import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISPLAY_ADVANCE, estimatedNameWidthPx, pokemonNameColumnPx, pokemonNameFits } from '../src/lib/name-fit.ts'

const NAMES = ['Crabominable', 'Fletchinder', 'Corviknight', 'Kommo-o', 'Longnickname']

test('names of 12 characters fit a route card at 360 and 390 in Inter', () => {
  for (const name of NAMES) {
    assert.ok(name.length <= 12, name)
    assert.equal(pokemonNameFits(name, 360), true, name)
    assert.equal(pokemonNameFits(name, 390), true, name)
  }
  const column = pokemonNameColumnPx(360)
  assert.ok(estimatedNameWidthPx('Crabominable', 12, DISPLAY_ADVANCE) > column)
})
