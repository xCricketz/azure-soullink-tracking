/** A team Pokémon above the current level cap. The cap does not block the team. */
export interface CapWarning {
  name: string
  level: number
  cap: number
  overBy: number
}

export function capWarnings(
  mons: { name: string; level: number | null; onTeam: boolean }[],
  cap: number | null,
): CapWarning[] {
  if (cap == null) return []
  return mons.flatMap((mon) => {
    if (!mon.onTeam || mon.level == null || mon.level <= cap) return []
    return [{ name: mon.name, level: mon.level, cap, overBy: mon.level - cap }]
  })
}

export function capWarningText(warning: CapWarning): string {
  const levels = warning.overBy === 1 ? '1 level' : `${warning.overBy} levels`
  return `${warning.name} is Lv ${warning.level}, ${levels} above the level cap ${warning.cap}.`
}
