/** A save Pokémon with the same personality and OT as a logged catch, now a different species. */
export interface EvolutionProposal {
  catchId: string
  identity: string
  fromName: string
  toName: string
  toDex: number
  toForm: string | null
}

export function evolutionProposals(
  incoming: { identity: string; name: string; nat: number | null; form: string | null }[],
  links: { identity: string; catchId: string }[],
  catches: { id: string; pokemon: string | null; dex_id: number | null }[],
): EvolutionProposal[] {
  const byIdentity = new Map(links.map((link) => [link.identity, link.catchId]))
  const byId = new Map(catches.map((row) => [row.id, row]))
  const out: EvolutionProposal[] = []
  const seen = new Set<string>()
  for (const mon of incoming) {
    if (mon.nat == null || seen.has(mon.identity)) continue
    const catchId = byIdentity.get(mon.identity)
    const row = catchId ? byId.get(catchId) : undefined
    if (!row || row.dex_id === mon.nat) continue
    seen.add(mon.identity)
    out.push({
      catchId: row.id,
      identity: mon.identity,
      fromName: row.pokemon?.trim() || 'Pokémon',
      toName: mon.name,
      toDex: mon.nat,
      toForm: mon.form,
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
