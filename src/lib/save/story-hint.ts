/**
 * Optional "you are here" from a save's story counters.
 * Locations are guesses. Confirming stores a suggestion; it does not move the catch-based Here marker.
 */
import routes from '../../data/unbound/routes.json'
import type { MissionDefs, StoryStepDef } from './missions'
import { readMissionsFromSave } from './missions'

export interface StorySuggestion {
  hasProgress: boolean
  finished: boolean
  ordinal: number
  act1: number
  main: number
  currentLabel: string | null
  nextLabel: string | null
  currentKey: string | null
  nextKey: string | null
  completed: number
  total: number
  confidence: 'guess'
}

export interface StoredStoryHint {
  ordinal: number
  currentLabel: string
  nextLabel: string | null
  currentKey: string | null
  completed: number
  total: number
  finished: boolean
}

const HINT_EVENT = 'sl-story-hint'

function hintKey(runId: string): string {
  return `sl-story-hint:${runId}`
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function placeKey(label: string): string | null {
  const norm = label.toLowerCase().replace(/[.]/g, '').trim()
  if (norm === 'distortion world') return 'distortion-world'
  const hit = (routes as { key: string; name: string }[]).find((route) => route.name.toLowerCase().replace(/[.]/g, '') === norm)
  return hit?.key ?? null
}

export function stepPlace(step: StoryStepDef | null): { label: string | null; key: string | null } {
  if (!step) return { label: null, key: null }
  const names = step.locations.filter((name): name is string => Boolean(name))
  if (!names.length) return { label: null, key: null }
  const label = names.length === 1 ? names[0] : names.join(' or ')
  return { label, key: placeKey(names[0]) }
}

export function describeStory(defs: MissionDefs, buf: Uint8Array): StorySuggestion {
  const { summary, story } = readMissionsFromSave(buf, defs)
  const current = stepPlace(story.current)
  const next = stepPlace(story.next)
  return {
    hasProgress: story.act1 > 0 || story.main > 0,
    finished: story.finished,
    ordinal: story.ordinal,
    act1: story.act1,
    main: story.main,
    currentLabel: current.label,
    nextLabel: next.label,
    currentKey: current.key,
    nextKey: next.key,
    completed: summary.completed,
    total: summary.total,
    confidence: 'guess',
  }
}

export async function storyFromSave(buf: Uint8Array): Promise<StorySuggestion | null> {
  try {
    const defs = (await import('../../data/unbound/missions.json')).default as MissionDefs
    return describeStory(defs, buf)
  } catch {
    return null
  }
}

export function readStoryHint(runId: string | undefined): StoredStoryHint | null {
  if (!runId) return null
  const raw = store()?.getItem(hintKey(runId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredStoryHint
    if (!parsed || typeof parsed.currentLabel !== 'string' || typeof parsed.ordinal !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

/** Stores the suggestion for the guide. Does not change catches or the manual Here marker. */
export function confirmStoryHint(runId: string | undefined, suggestion: StorySuggestion): StoredStoryHint | null {
  if (!runId || !suggestion.hasProgress || !suggestion.currentLabel) return null
  const hint: StoredStoryHint = {
    ordinal: suggestion.ordinal,
    currentLabel: suggestion.currentLabel,
    nextLabel: suggestion.nextLabel,
    currentKey: suggestion.currentKey,
    completed: suggestion.completed,
    total: suggestion.total,
    finished: suggestion.finished,
  }
  store()?.setItem(hintKey(runId), JSON.stringify(hint))
  window.dispatchEvent(new Event(HINT_EVENT))
  return hint
}

export function storyHintEvent(): string {
  return HINT_EVENT
}
