import prevoPairs from '../data/unbound/prevo.json'

/** A save Pokémon that may be a logged catch after it evolved. */
export interface EvolutionProposal {
  catchId: string
  identity: string
  fromName: string
  toName: string
  toDex: number
  toForm: string | null
  /** Identity is personality plus OT. Likely is the same route and a pre-evolution. */
  confidence: 'identity' | 'likely'
}

function norm(name: string): string {
  return name.trim().toLowerCase()
}

/** Child species name → names that can evolve into it, including earlier stages. */
function ancestorsOf(): Map<string, Set<string>> {
  const parent = new Map<string, string>()
  for (const [from, to] of prevoPairs as [string, string][]) {
    parent.set(norm(to), norm(from))
  }
  const cache = new Map<string, Set<string>>()
  const walk = (name: string, seen: Set<string>): Set<string> => {
    const cached = cache.get(name)
    if (cached) return cached
    const out = new Set<string>()
    const previous = parent.get(name)
    if (previous && !seen.has(previous)) {
      out.add(previous)
      for (const older of walk(previous, new Set([...seen, previous]))) out.add(older)
    }
    cache.set(name, out)
    return out
  }
  for (const child of parent.keys()) walk(child, new Set())
  return cache
}

const ANCESTORS = ancestorsOf()

export function isPreEvolution(loggedName: string, saveName: string): boolean {
  return ANCESTORS.get(norm(saveName))?.has(norm(loggedName)) ?? false
}

export function evolutionProposals(
  incoming: { identity: string; name: string; nat: number | null; form: string | null; route?: string | null }[],
  links: { identity: string; catchId: string }[],
  catches: { id: string; player?: string; route?: string; pokemon: string | null; dex_id: number | null }[],
  player?: string,
): EvolutionProposal[] {
  const byIdentity = new Map(links.map((link) => [link.identity, link.catchId]))
  const byId = new Map(catches.map((row) => [row.id, row]))
  const out: EvolutionProposal[] = []
  const used = new Set<string>()
  const seen = new Set<string>()
  for (const mon of incoming) {
    if (mon.nat == null || seen.has(mon.identity)) continue
    const catchId = byIdentity.get(mon.identity)
    const row = catchId ? byId.get(catchId) : undefined
    if (!row || row.dex_id === mon.nat) continue
    seen.add(mon.identity)
    used.add(row.id)
    out.push({
      catchId: row.id,
      identity: mon.identity,
      fromName: row.pokemon?.trim() || 'Pokémon',
      toName: mon.name,
      toDex: mon.nat,
      toForm: mon.form,
      confidence: 'identity',
    })
  }
  if (!player) return out
  for (const mon of incoming) {
    if (mon.nat == null || !mon.route || seen.has(mon.identity)) continue
    const row = catches.find((item) => item.player === player && item.route === mon.route && !used.has(item.id))
    const from = row?.pokemon?.trim()
    if (!row || !from || row.dex_id === mon.nat || !isPreEvolution(from, mon.name)) continue
    seen.add(mon.identity)
    used.add(row.id)
    out.push({
      catchId: row.id,
      identity: mon.identity,
      fromName: from,
      toName: mon.name,
      toDex: mon.nat,
      toForm: mon.form,
      confidence: 'likely',
    })
  }
  return out
}

/** Species fields only. Status, team, and death stay on the existing row. */
export function evolvedSpecies<T extends { pokemon: string | null; dex_id: number | null; form: string | null }>(
  existing: T,
  proposal: Pick<EvolutionProposal, 'toName' | 'toDex' | 'toForm'>,
): T {
  return { ...existing, pokemon: proposal.toName, dex_id: proposal.toDex, form: proposal.toForm }
}
