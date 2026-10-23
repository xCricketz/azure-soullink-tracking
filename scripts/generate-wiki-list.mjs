/**
 * Build src/data/wiki-list.json from PokeAPI.
 * Names are the English species names. Types are the Generation IV types
 * (past_types covers the Fairy retypes). Run: node scripts/generate-wiki-list.mjs
 */
import { writeFileSync } from 'node:fs'

const GEN = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
}

const TYPE_EN = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
  fairy: 'Fairy',
}

async function getJson(url) {
  let last
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (response.status === 429 || response.status >= 500) {
        last = new Error(`${response.status} ${url}`)
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      return await response.json()
    } catch (error) {
      last = error
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  throw last
}

function gen4Types(pokemon) {
  const covering = (pokemon.past_types ?? [])
    .map((entry) => ({ gen: GEN[entry.generation.name] ?? 0, types: entry.types }))
    .filter((entry) => entry.gen >= 4)
    .sort((a, b) => a.gen - b.gen)[0]
  const types = covering?.types ?? pokemon.types
  return [...types]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => TYPE_EN[entry.type.name] ?? entry.type.name)
}

async function one(id) {
  const [pokemon, species] = await Promise.all([
    getJson(`https://pokeapi.co/api/v2/pokemon/${id}`),
    getJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ])
  const name = species.names.find((row) => row.language.name === 'en')?.name ?? species.name
  return { id, name, types: gen4Types(pokemon) }
}

const ids = Array.from({ length: 493 }, (_, index) => index + 1)
const rows = new Array(ids.length)
let cursor = 0
async function worker() {
  while (cursor < ids.length) {
    const index = cursor
    cursor += 1
    rows[index] = await one(ids[index])
    if ((index + 1) % 50 === 0) console.log(`fetched ${index + 1}`)
  }
}
await Promise.all(Array.from({ length: 8 }, () => worker()))
const fairy = rows.filter((row) => row.types.includes('Fairy'))
if (fairy.length) {
  console.error('Fairy types in Gen IV list', fairy.map((row) => row.id).join(','))
  process.exit(1)
}
writeFileSync(new URL('../src/data/wiki-list.json', import.meta.url), `${JSON.stringify(rows)}\n`)
console.log(`wrote ${rows.length} Pokémon`)
