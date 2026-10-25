/** Last imported national numbers, per phone and per run. Not shared with the other player. */

export interface NatStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStore(): NatStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function keyFor(runId: string): string {
  return `sl-import-nats:${runId}`
}

export function readImportedNats(runId: string | undefined, storage: NatStore | null = browserStore()): number[] {
  if (!runId || !storage) return []
  try {
    const raw = JSON.parse(storage.getItem(keyFor(runId)) || '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is number => Number.isInteger(item))
  } catch {
    return []
  }
}

export function writeImportedNats(runId: string, nats: number[], storage: NatStore | null = browserStore()): void {
  if (!storage) return
  const unique = [...new Set(nats.filter((nat) => Number.isInteger(nat) && nat > 0))].sort((a, b) => a - b)
  storage.setItem(keyFor(runId), JSON.stringify(unique))
}
