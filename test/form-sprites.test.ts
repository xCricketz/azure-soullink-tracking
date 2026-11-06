import assert from 'node:assert/strict'
import { test } from 'node:test'
import dex from '../src/data/unbound/dex.json' with { type: 'json' }
import { artworkUrl, formSpriteId, isRegionalForm, spriteSources } from '../src/lib/dex.ts'

interface Row { nat: number; name: string; form: string | null }

const regional = (dex as Row[]).filter((mon) => isRegionalForm(mon.form))

test('every regional form uses a different image than its base species', () => {
  assert.ok(regional.length >= 54)
  const missing: string[] = []
  for (const mon of regional) {
    const formUrl = spriteSources(mon.nat, mon.form)[0]
    const baseUrl = artworkUrl(mon.nat)
    assert.notEqual(formUrl, baseUrl, `${mon.form} ${mon.name}`)
    assert.equal(formUrl, artworkUrl(formSpriteId(mon.nat, mon.form) as number))
    if (!formSpriteId(mon.nat, mon.form)) missing.push(`${mon.form} ${mon.name}`)
  }
  assert.deepEqual(missing, [])
  const paldea = regional.filter((mon) => mon.form === 'Paldean')
  assert.equal(paldea.length, 0)
})

test('a sample of form artwork URLs resolves', async (t) => {
  const sample = [
    ['Alolan', 'Vulpix', 37],
    ['Hisuian', 'Growlithe', 58],
    ['Galarian', 'Ponyta', 77],
    ['Alolan', 'Rattata', 19],
    ['Galarian', 'Meowth', 52],
    ['Hisuian', 'Decidueye', 724],
  ] as const
  for (const [form, name, nat] of sample) {
    const url = spriteSources(nat, form)[0]
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(12000) })
      assert.equal(response.status, 200, `${form} ${name} ${url}`)
      const type = response.headers.get('content-type') || ''
      assert.match(type, /image|octet-stream|png/i, `${form} ${name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/fetch|network|ENOTFOUND|EAI_AGAIN|timeout|aborted/i.test(message)) {
        t.skip(`network unavailable (${message})`)
        return
      }
      throw error
    }
  }
})
