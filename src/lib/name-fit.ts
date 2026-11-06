/**
 * Inter advance used for the 360px name contract. Fredoka is closer to 0.9em,
 * which is why a 12-letter name ellipsized in the old display font.
 */
export const INTER_ADVANCE = 0.62
export const DISPLAY_ADVANCE = 0.9

/**
 * Text column inside one half of a route card.
 * Measured on the route half at 360px (82px) and it grows with the phone.
 */
export function pokemonNameColumnPx(viewportPx: number): number {
  return Math.floor(82 + (viewportPx - 360) * 0.55)
}

export function estimatedNameWidthPx(name: string, fontPx = 12, advance = INTER_ADVANCE): number {
  return name.length * fontPx * advance
}

/** A name of 12 letters must fit one Inter line at the 11px clamp floor on a 360px phone. */
export function pokemonNameFits(name: string, viewportPx: number): boolean {
  return estimatedNameWidthPx(name, 11) <= pokemonNameColumnPx(viewportPx)
}
