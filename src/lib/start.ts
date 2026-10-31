const HIDDEN_AT = 'sl-hidden-at'

/** Kept for tests. A signed-in visit no longer returns to the code screen after this. */
export const AWAY_LIMIT_MS = 30 * 60 * 1000

export function clearHidden(): void {
  try {
    sessionStorage.removeItem(HIDDEN_AT)
  } catch {
    /* private mode */
  }
}

export function markHidden(now = Date.now()): void {
  try {
    sessionStorage.setItem(HIDDEN_AT, String(now))
  } catch {
    /* private mode */
  }
}

/** True when the tab was away for more than 30 minutes. Consumes the timestamp. */
export function resumeNeedsStart(now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(HIDDEN_AT)
    if (!raw) return false
    sessionStorage.removeItem(HIDDEN_AT)
    const then = Number(raw)
    return Number.isFinite(then) && now - then > AWAY_LIMIT_MS
  } catch {
    return false
  }
}
