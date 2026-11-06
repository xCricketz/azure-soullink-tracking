import type { Catch, Run } from './types'

const SECRET_KEY = /email|token|password|secret|authorization|cookie|apikey|api_key/i

export interface BackupRun {
  id: string
  name: string
  rules: string | null
  active: boolean
  badges: number | null
  level_cap: number | null
  options: unknown
  created_at: string
  updated_at: string
}

export interface BackupFile {
  kind: 'soullink-backup'
  exportedAt: string
  run: BackupRun | null
  catches: Catch[]
}

function publicValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicValue)
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue
    out[key] = publicValue(item)
  }
  return out
}

/** Current run and both players' catches. No session, email, or token. */
export function backupPayload(run: Run | null, catches: Catch[], now = new Date()): BackupFile {
  const file: BackupFile = {
    kind: 'soullink-backup',
    exportedAt: now.toISOString(),
    run: run
      ? {
        id: run.id,
        name: run.name,
        rules: run.rules ?? null,
        active: run.active,
        badges: run.badges ?? null,
        level_cap: run.level_cap ?? null,
        options: publicValue(run.options ?? null),
        created_at: run.created_at,
        updated_at: run.updated_at,
      }
      : null,
    catches: publicValue(catches) as Catch[],
  }
  return file
}

function filename(exportedAt: string): string {
  return `soullink-backup-${exportedAt.slice(0, 10)}.json`
}

function iosBrowser(): boolean {
  return /iP(ad|hone|od)/.test(navigator.userAgent)
}

/**
 * Save the backup on this phone. iOS Safari often ignores an anchor download,
 * so that browser uses the share sheet when it can take a file.
 */
export async function downloadBackup(run: Run | null, catches: Catch[]): Promise<'saved' | 'shared' | 'cancelled'> {
  const payload = backupPayload(run, catches)
  const name = filename(payload.exportedAt)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  if (iosBrowser() && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Soul-Link backup' })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  return 'saved'
}
