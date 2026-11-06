import type { PlayerId } from './types'

export const NOTE_MAX = 2000

export interface RunNote {
  id: string
  run_id: string
  player_id: PlayerId
  body: string
  created_at: string
  updated_at: string
  pending?: boolean
  error?: string | null
}

export function noteBodyOk(body: string): boolean {
  const text = body.trim()
  return text.length >= 1 && text.length <= NOTE_MAX
}

export function orderNotes(notes: RunNote[]): RunNote[] {
  return [...notes].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}

export function upsertNote(notes: RunNote[], note: RunNote): RunNote[] {
  const index = notes.findIndex((row) => row.id === note.id)
  const next = index === -1 ? [...notes, note] : notes.map((row, i) => (i === index ? note : row))
  return orderNotes(next)
}

export function removeNote(notes: RunNote[], id: string): RunNote[] {
  return notes.filter((row) => row.id !== id)
}

export function canEditNote(note: RunNote, me: PlayerId): boolean {
  return note.player_id === me && !note.pending
}

export function beginSave(notes: RunNote[], draft: RunNote): RunNote[] {
  return upsertNote(notes, { ...draft, pending: true, error: null })
}

export function confirmSave(notes: RunNote[], tempId: string, saved: RunNote): RunNote[] {
  return orderNotes(
    notes
      .filter((row) => row.id !== tempId)
      .concat({ ...saved, pending: false, error: null }),
  )
}

export function rejectSave(notes: RunNote[], id: string, message: string): RunNote[] {
  return notes.map((row) => (row.id === id ? { ...row, pending: false, error: message } : row))
}

/** Keep optimistic rows the server has not confirmed yet, including an edit still in flight. */
export function mergeRemote(local: RunNote[], remote: RunNote[]): RunNote[] {
  const remoteIds = new Set(remote.map((row) => row.id))
  const localPending = new Map(
    local.filter((row) => row.pending || row.error).map((row) => [row.id, row]),
  )
  const merged = remote.map((row) => localPending.get(row.id) ?? row)
  const extras = local.filter((row) => (row.pending || row.error || row.id.startsWith('tmp-')) && !remoteIds.has(row.id))
  return orderNotes([...merged, ...extras])
}

export function notesTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = error.code ?? ''
  const message = error.message ?? ''
  return code === 'PGRST205' || code === '42P01' || /run_notes|schema cache|does not exist|could not find the table/i.test(message)
}
