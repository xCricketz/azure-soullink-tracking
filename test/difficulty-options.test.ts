import assert from 'node:assert/strict'
import { test } from 'node:test'
import { capFor } from '../src/lib/caps.ts'
import { DIFFICULTY_CHOICES, EXPERT_CAP_NOTE, capColumn, difficultyLabel } from '../src/lib/options.ts'

test('difficulty choices follow the save and share the Difficult cap table', () => {
  assert.deepEqual([...DIFFICULTY_CHOICES], ['difficult', 'vanilla', 'expert', 'insane'])
  assert.deepEqual(DIFFICULTY_CHOICES.map((mode) => difficultyLabel(mode)), ['Difficult', 'Vanilla', 'Expert', 'Insane'])
  assert.equal(capColumn('vanilla'), 'vanilla')
  assert.equal(capColumn('difficult'), 'difficult')
  assert.equal(capColumn('expert'), 'difficult')
  assert.equal(capColumn('insane'), 'difficult')
  assert.match(EXPERT_CAP_NOTE, /Difficult cap table/)
  assert.match(EXPERT_CAP_NOTE, /No separate ladder/)
  for (let badges = 0; badges <= 8; badges += 1) {
    for (const mansion of [false, true]) {
      const published = capFor(badges, 'difficult', mansion).level
      assert.equal(capFor(badges, capColumn('expert'), mansion).level, published)
      assert.equal(capFor(badges, capColumn('insane'), mansion).level, published)
      assert.notEqual(capFor(badges, capColumn('vanilla'), mansion).level, published)
    }
  }
})
