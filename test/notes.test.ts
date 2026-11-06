import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  beginSave,
  canEditNote,
  confirmSave,
  mergeRemote,
  noteBodyOk,
  notesTableMissing,
  orderNotes,
  rejectSave,
  removeNote,
  type RunNote,
} from '../src/lib/notes.ts'

function note(partial: Partial<RunNote> & Pick<RunNote, 'id' | 'created_at' | 'player_id'>): RunNote {
  return {
    run_id: 'run-1',
    body: 'hello',
    updated_at: partial.created_at,
    ...partial,
  }
}

test('notes stay in created order and a failed save stays visible', () => {
  const seri = note({ id: 'b', created_at: '2026-10-21T09:00:00.000Z', player_id: 'seri', body: 'second' })
  const fisi = note({ id: 'a', created_at: '2026-10-20T09:00:00.000Z', player_id: 'fisi', body: 'first' })
  assert.deepEqual(orderNotes([seri, fisi]).map((row) => row.id), ['a', 'b'])

  const draft = note({ id: 'tmp-1', created_at: '2026-10-22T09:00:00.000Z', player_id: 'fisi', body: 'third' })
  const pending = beginSave([fisi, seri], draft)
  assert.equal(pending.at(-1)?.pending, true)
  assert.deepEqual(pending.map((row) => row.id), ['a', 'b', 'tmp-1'])

  const saved = note({ id: 'c', created_at: '2026-10-22T09:00:01.000Z', player_id: 'fisi', body: 'third' })
  assert.deepEqual(confirmSave(pending, 'tmp-1', saved).map((row) => row.id), ['a', 'b', 'c'])

  const failed = rejectSave(pending, 'tmp-1', 'Not saved. Try again.')
  assert.equal(failed.find((row) => row.id === 'tmp-1')?.error, 'Not saved. Try again.')
  assert.equal(failed.find((row) => row.id === 'tmp-1')?.pending, false)
  assert.equal(canEditNote(fisi, 'fisi'), true)
  assert.equal(canEditNote(seri, 'fisi'), false)
  assert.equal(canEditNote({ ...fisi, pending: true }, 'fisi'), false)
  assert.deepEqual(removeNote(failed, 'tmp-1').map((row) => row.id), ['a', 'b'])
})

test('a refetch keeps an optimistic note the server has not stored', () => {
  const remote = [note({ id: 'a', created_at: '2026-10-20T09:00:00.000Z', player_id: 'fisi' })]
  const local = [
    ...remote,
    note({ id: 'tmp-9', created_at: '2026-10-22T09:00:00.000Z', player_id: 'seri', pending: true, body: 'still sending' }),
  ]
  const merged = mergeRemote(local, remote)
  assert.deepEqual(merged.map((row) => row.id), ['a', 'tmp-9'])
  const editing = mergeRemote(
    [note({ id: 'a', created_at: '2026-10-20T09:00:00.000Z', player_id: 'fisi', body: 'edited', pending: true })],
    remote,
  )
  assert.equal(editing[0]?.body, 'edited')
  assert.equal(noteBodyOk('  x '), true)
  assert.equal(noteBodyOk('   '), false)
  assert.equal(noteBodyOk('x'.repeat(2001)), false)
})

test('a missing notes table is recognized and does not look like a network error', () => {
  assert.equal(notesTableMissing({ code: 'PGRST205', message: "Could not find the table 'public.run_notes' in the schema cache" }), true)
  assert.equal(notesTableMissing({ code: '42P01', message: 'relation "public.run_notes" does not exist' }), true)
  assert.equal(notesTableMissing({ code: 'PGRST116', message: 'no rows' }), false)
  assert.equal(notesTableMissing(null), false)
})
