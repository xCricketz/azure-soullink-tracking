import assert from 'node:assert/strict'
import { test } from 'node:test'
import { vantaFallbackReason, wavesTooSlow } from '../src/lib/vanta-fallback.ts'

const ready = { reducedMotion: false, webgl: true, cores: 8, memoryGb: 8 }

test('Waves stays off for reduced motion, missing WebGL, or a small device', () => {
  assert.equal(vantaFallbackReason(ready), null)
  assert.equal(vantaFallbackReason({ ...ready, reducedMotion: true }), 'reduced-motion')
  assert.equal(vantaFallbackReason({ ...ready, webgl: false }), 'no-webgl')
  assert.equal(vantaFallbackReason({ ...ready, cores: 4 }), null)
  assert.equal(vantaFallbackReason({ ...ready, cores: 2 }), 'low-end')
  assert.equal(vantaFallbackReason({ ...ready, memoryGb: 2 }), 'low-end')
  assert.equal(vantaFallbackReason({ ...ready, cores: null, memoryGb: null }), null)
  assert.equal(wavesTooSlow(50, 2000), true)
  assert.equal(wavesTooSlow(60, 2000), false)
  assert.equal(wavesTooSlow(10, 400), false)
})
