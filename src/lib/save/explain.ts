import type { ParsedSave } from './unbound-save'

export function explainSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('unerwartete Dateigröße')) {
    return 'That file is the wrong size. A Pokémon Unbound save is 128 KB. Sixteen extra bytes at the start or the end are ok.'
  }
  if (message.startsWith('kein gültiger Slot')) {
    return 'Both save slots are broken. Save in the game, then export the .sav again. A save state is not enough.'
  }
  return 'This file could not be read as a Pokémon Unbound (FireRed) save.'
}

export function versionProblem(save: ParsedSave): string | null {
  if (save.warnings.some((warning) => warning.startsWith('Signatur') || warning.includes('0x01121999'))) {
    return 'This does not look like a Pokémon Unbound (FireRed) save.'
  }
  return null
}

export function formatPlaytime(playtime: { hours: number; minutes: number; seconds: number; frames: number } | undefined): string | null {
  if (!playtime) return null
  const { hours, minutes, seconds, frames } = playtime
  if (![hours, minutes, seconds, frames].every((part) => Number.isFinite(part) && part >= 0)) return null
  if (hours === 0 && minutes === 0 && seconds === 0 && frames === 0) return null
  if (minutes > 59 || seconds > 59 || hours > 9999) return null
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
