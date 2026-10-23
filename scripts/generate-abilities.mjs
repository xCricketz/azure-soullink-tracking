/**
 * Build src/data/abilities.json from PokeAPI.
 * One entry for every ability on Pokémon #1–#493.
 * English short_effect, then English flavor text.
 * Run: node scripts/generate-abilities.mjs
 */
import { writeFileSync } from 'node:fs'

async function getJson(url) {
  let last
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (response.status === 429 || response.status >= 500) {
        last = new Error(`${response.status} ${url}`)
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      return await response.json()
    } catch (error) {
      last = error
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw last
}

async function mapPool(items, limit, worker) {
  const out = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      out[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: limit }, run))
  return out
}

function englishName(ability) {
  return ability.names.find((row) => row.language.name === 'en')?.name ?? ability.name
}

function englishText(ability) {
  const effect = ability.effect_entries.find((row) => row.language.name === 'en')
  const short = effect?.short_effect?.replace(/\s+/g, ' ').trim()
  if (short) return short
  const flavors = (ability.flavor_text_entries ?? []).filter((row) => row.language.name === 'en')
  const flavor = flavors.at(-1)?.flavor_text?.replace(/\s+/g, ' ').trim()
  return flavor || ''
}

const ids = Array.from({ length: 493 }, (_, index) => index + 1)
const slugs = new Set()
await mapPool(ids, 8, async (id) => {
  const pokemon = await getJson(`https://pokeapi.co/api/v2/pokemon/${id}`)
  for (const row of pokemon.abilities) slugs.add(row.ability.name)
  if (id % 50 === 0) console.log(`pokemon ${id}`)
})

const list = [...slugs].sort()
console.log(`abilities ${list.length}`)
const entries = await mapPool(list, 8, async (slug) => {
  const ability = await getJson(`https://pokeapi.co/api/v2/ability/${slug}`)
  return [slug, { name: englishName(ability), text: englishText(ability) }]
})

const table = Object.fromEntries(entries)
const missing = entries.filter(([, row]) => !row.text).map(([slug]) => slug)
if (missing.length) {
  console.error('missing text', missing.join(', '))
  process.exit(1)
}
writeFileSync(new URL('../src/data/abilities.json', import.meta.url), `${JSON.stringify(table)}\n`)
console.log(`wrote ${entries.length}`)
