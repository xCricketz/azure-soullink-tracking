import assert from 'node:assert/strict'
import { test } from 'node:test'
import { labelScreenPx, labelWorldSize } from '../src/lib/map-label.ts'

test('map labels stay inside 9–14 screen px and do not grow on the map while zooming in', () => {
  const scales = [0.3, 0.5, 0.9, 1.5]
  for (const scale of scales) {
    const screen = labelScreenPx(scale)
    assert.equal(screen >= 9 && screen <= 14, true, `${scale} -> ${screen}`)
    assert.equal(labelWorldSize(scale), screen / scale)
  }
  assert.equal(labelScreenPx(0.3), 9)
  assert.equal(labelScreenPx(0.5), 9)
  assert.ok(labelScreenPx(1.5) <= 14)
  assert.ok(labelWorldSize(1.5) < labelWorldSize(0.9))
  assert.ok(labelWorldSize(0.9) <= labelWorldSize(0.5))
})
