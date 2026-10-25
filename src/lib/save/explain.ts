import type { ParsedSave } from './unbound-save'

export function explainSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('unerwartete Dateigröße')) {
    return 'That file is the wrong size. Unbound saves are 128 KB.'
  }
  if (message.startsWith('kein gültiger Slot')) {
    return 'The save failed its checksum. Save in the game, then export the .sav again. A save state is not enough.'
  }
  return 'This file could not be read as a Pokémon Unbound v2.1.1.1 save.'
}

export function versionProblem(save: ParsedSave): string | null {
  if (save.warnings.some((warning) => warning.startsWith('Signatur') || warning.includes('0x01121999'))) {
    return 'This does not look like a Pokémon Unbound v2.1.1.1 save.'
  }
  return null
}
