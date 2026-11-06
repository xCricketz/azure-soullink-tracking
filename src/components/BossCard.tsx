import { bossTypeNames, nextBoss, teamMatchup } from '../lib/boss-prep'
import { monName } from '../lib/text'
import type { Catch } from '../lib/types'

export function BossCard({
  badges,
  capLevel,
  nextLevel,
  team,
  typesOf,
}: {
  badges: number
  capLevel: number | null
  nextLevel: number | null
  team: Catch[]
  typesOf: (row: Catch) => string[]
}) {
  const gym = nextBoss(badges)
  if (!gym) return null
  const types = bossTypeNames(gym.boss)
  const rows = types.length === 0 ? [] : team.flatMap((row) => {
    const match = teamMatchup(typesOf(row), types)
    if (!match || (!match.advantage && !match.disadvantage)) return []
    return [{ id: row.id, name: monName(row), ...match }]
  })
  return (
    <section className="boss-card" aria-label="Next gym">
      <small>Next gym</small>
      <h2>{gym.leader}</h2>
      <p>
        {gym.city}
        {capLevel != null ? ` · level cap ${capLevel}` : ''}
        {nextLevel != null ? ` · next cap ${nextLevel}` : ''}
      </p>
      {types.length > 0 && <p className="boss-types">{types.join(' · ')}</p>}
      {rows.length > 0 && (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.name}
              {row.advantage ? ' · advantage' : ''}
              {row.disadvantage ? ' · disadvantage' : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
