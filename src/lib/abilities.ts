import raw from '../data/abilities.json'

type Entry = { name: string; text: string }

const data = raw as Record<string, Entry>
const byKey = new Map<string, string>()
const memory = new Map<string, string>()

for (const [slug, entry] of Object.entries(data)) {
  if (!entry.text) continue
  byKey.set(slug, entry.text)
  byKey.set(entry.name.toLowerCase(), entry.text)
}

export function abilitySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function stored(name: string): string | null {
  const key = name.toLowerCase()
  const hit = byKey.get(key) ?? byKey.get(abilitySlug(name)) ?? memory.get(key)
  if (hit) return hit
  try {
    const saved = localStorage.getItem(`sl-ability:${key}`)
    if (saved) {
      memory.set(key, saved)
      return saved
    }
  } catch {
    /* private mode */
  }
  return null
}

export function abilityText(name: string): string {
  return stored(name) ?? 'No description saved for this ability.'
}

/** Fills a gap when a name is missing from the committed table. */
export async function loadAbilityText(name: string): Promise<string> {
  const have = stored(name)
  if (have) return have
  const key = name.toLowerCase()
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilitySlug(name)}`)
    if (!response.ok) return abilityText(name)
    const json = (await response.json()) as {
      effect_entries?: { language: { name: string }; short_effect?: string }[]
      flavor_text_entries?: { language: { name: string }; flavor_text?: string }[]
    }
    const short = json.effect_entries?.find((row) => row.language.name === 'en')?.short_effect?.trim()
    const flavor = json.flavor_text_entries?.filter((row) => row.language.name === 'en').at(-1)?.flavor_text
    const text = (short || flavor || '').replace(/\s+/g, ' ').trim()
    if (!text) return abilityText(name)
    memory.set(key, text)
    try {
      localStorage.setItem(`sl-ability:${key}`, text)
    } catch {
      /* quota */
    }
    return text
  } catch {
    return abilityText(name)
  }
}
