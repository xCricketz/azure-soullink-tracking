import assert from 'node:assert/strict'
import { test } from 'node:test'
import { vantaFallbackReason, vantaScale, wavesTooSlow } from '../src/lib/vanta-fallback.ts'

const ready = { reducedMotion: false, webgl: true, cores: 8, memoryGb: 8 }

test('Waves stay off only for reduced motion or missing WebGL', () => {
  assert.equal(vantaFallbackReason(ready), null)
  assert.equal(vantaFallbackReason({ ...ready, reducedMotion: true }), 'reduced-motion')
  assert.equal(vantaFallbackReason({ ...ready, webgl: false }), 'no-webgl')
  assert.equal(vantaFallbackReason({ ...ready, cores: 4 }), null)
  assert.equal(vantaFallbackReason({ ...ready, cores: 2, memoryGb: 2 }), null)
  assert.equal(vantaFallbackReason({ ...ready, cores: null, memoryGb: null }), null)
  assert.equal(wavesTooSlow(40, 3000), true)
  assert.equal(wavesTooSlow(48, 3000), false)
  assert.equal(wavesTooSlow(20, 2000), false)
  assert.equal(wavesTooSlow(10, 400), false)
  assert.equal(vantaScale(1, false), 1)
  assert.ok(Math.abs(vantaScale(3, true) - 2) < 0.001)
  assert.ok(vantaScale(3, true) >= 3 / 1.5)
})
