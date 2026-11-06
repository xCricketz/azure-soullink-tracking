import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bossTypeNames, nextBoss, teamMatchup } from '../src/lib/boss-prep.ts'

test('the next gym uses the types written on the boss, and only the chart for matchups', () => {
  const first = nextBoss(0)
  assert.equal(first?.leader, 'Mirskle')
  assert.deepEqual(bossTypeNames(first?.boss ?? ''), ['Grass', 'Fairy'])
  assert.equal(nextBoss(8), null)
  assert.deepEqual(bossTypeNames('Mel (Normal, inverse battle)'), ['Normal'])
  assert.deepEqual(bossTypeNames('Rival (first fight) - spelled Axelrod/Axelford in sources'), [])
  const fire = teamMatchup(['Fire'], ['Grass', 'Fairy'])
  assert.equal(fire?.advantage, true)
  assert.equal(fire?.disadvantage, false)
  const water = teamMatchup(['Water'], ['Grass'])
  assert.equal(water?.advantage, false)
  assert.equal(water?.disadvantage, true)
  assert.equal(teamMatchup(['Fire'], []), null)
})
