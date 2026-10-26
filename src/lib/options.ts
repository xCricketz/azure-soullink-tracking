import { capFor, type CapStep } from './caps'
import type { CapMode, Difficulty, Run, RunOptions, SpeciesClause } from './types'

export const DEFAULT_OPTIONS: RunOptions = {
  randomizerSpecies: false,
  randomizerMoves: false,
  randomizerAbilities: false,
  difficulty: 'vanilla',
  levelCapOn: true,
  mansionDone: false,
  ngPlus: false,
  carried: [],
  sandbox: false,
  speciesClause: 'off',
}

/** Save order: 0 Difficult, 1 Vanilla, 2 Expert, 3 Insane. */
export const DIFFICULTY_CHOICES = ['difficult', 'vanilla', 'expert', 'insane'] as const
const DIFFICULTIES: Difficulty[] = [...DIFFICULTY_CHOICES]
export const EXPERT_CAP_NOTE = 'Expert and Insane use the Difficult cap table. No separate ladder is published.'
const CLAUSES: SpeciesClause[] = ['off', 'player', 'both']

export function parseOptions(value: unknown): RunOptions {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const difficulty = DIFFICULTIES.includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : 'vanilla'
  const speciesClause = CLAUSES.includes(raw.speciesClause as SpeciesClause) ? (raw.speciesClause as SpeciesClause) : 'off'
  const carried = Array.isArray(raw.carried)
    ? raw.carried.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 6)
    : []
  return {
    randomizerSpecies: raw.randomizerSpecies === true,
    randomizerMoves: raw.randomizerMoves === true,
    randomizerAbilities: raw.randomizerAbilities === true,
    difficulty,
    levelCapOn: raw.levelCapOn !== false,
    mansionDone: raw.mansionDone === true,
    ngPlus: raw.ngPlus === true,
    carried,
    sandbox: raw.sandbox === true,
    speciesClause,
  }
}

export function optionsOf(run: Run | null | undefined): RunOptions {
  return parseOptions(run?.options)
}

/** Vanilla uses the vanilla column. Difficult, Expert, and Insane share the difficult column. */
export function capColumn(difficulty: Difficulty): CapMode {
  return difficulty === 'vanilla' ? 'vanilla' : 'difficult'
}

export function difficultyLabel(difficulty: Difficulty): string {
  if (difficulty === 'vanilla') return 'Vanilla'
  if (difficulty === 'difficult') return 'Difficult'
  if (difficulty === 'expert') return 'Expert'
  return 'Insane'
}

export function activeCap(run: Run | null | undefined): CapStep | null {
  const options = optionsOf(run)
  if (!options.levelCapOn) return null
  return capFor(run?.badges ?? 0, capColumn(options.difficulty), options.mansionDone)
}

export interface LadderStep extends CapStep {
  now: boolean
}

/** Four cap steps with the current badge count highlighted. */
export function capLadder(badges: number, difficulty: Difficulty, mansion: boolean): LadderStep[] {
  const mode = capColumn(difficulty)
  const count = Math.max(0, Math.min(8, badges))
  const steps: { label: string; badges: number; mansion: boolean }[] = []
  for (let badge = 0; badge <= 8; badge += 1) {
    if (badge === 4) {
      steps.push({ label: '4 badges', badges: 4, mansion: false })
      steps.push({ label: 'Mansion', badges: 4, mansion: true })
    } else {
      steps.push({
        label: badge === 0 ? 'Start' : `${badge} badge${badge === 1 ? '' : 's'}`,
        badges: badge,
        mansion: badge >= 5,
      })
    }
  }
  const index = steps.findIndex((step) => step.badges === count && (count === 4 ? step.mansion === mansion : true))
  const at = index < 0 ? 0 : index
  const start = Math.min(at, Math.max(0, steps.length - 4))
  return steps.slice(start, start + 4).map((step) => {
    const picked = capFor(step.badges, mode, step.mansion)
    const now = step.badges === count && (count === 4 ? step.mansion === mansion : true)
    return { label: step.label, level: picked.level, now }
  })
}
