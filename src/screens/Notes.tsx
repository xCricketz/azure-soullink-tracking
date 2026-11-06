import { useEffect, useState } from 'react'
import { uid } from '../lib/id'
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
} from '../lib/notes'
import { supabase } from '../lib/supabase'
import { PLAYERS, type PlayerId } from '../lib/types'
import { useApp } from '../state/context'

const DEMO_NOTES: RunNote[] = [
  {
    id: 'demo-note-1',
    run_id: 'demo-run',
    player_id: 'seri',
    body: 'Alice is Flying. Ground moves if we have them.',
    created_at: '2026-10-20T18:04:00.000Z',
    updated_at: '2026-10-20T18:04:00.000Z',
  },
  {
    id: 'demo-note-2',
    run_id: 'demo-run',
    player_id: 'fisi',
    body: 'Crabominable is nicknamed Longnickname. Cap is 29.',
    created_at: '2026-10-21T09:12:00.000Z',
    updated_at: '2026-10-21T09:12:00.000Z',
  },
]

function stamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function Notes() {
  const app = useApp()
  const [notes, setNotes] = useState<RunNote[]>(() => (app.demo ? orderNotes(DEMO_NOTES) : []))
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const runId = app.run?.id ?? ''

  useEffect(() => {
    if (app.demo || !runId) return
    let stop = false

    async function load() {
      const { data, error } = await supabase
        .from('run_notes')
        .select('id, run_id, player_id, body, created_at, updated_at')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })
      if (stop) return
      if (error) {
        if (notesTableMissing(error)) {
          setMissing(true)
          setLoadError('')
          return
        }
        setLoadError('Couldn’t load notes. We’ll try again when you come back to this tab.')
        return
      }
      setMissing(false)
      setLoadError('')
      const remote = (data ?? []) as RunNote[]
      setNotes((current) => mergeRemote(current, remote))
    }

    void load()
    const channel = supabase
      .channel(`run-notes-${runId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_notes', filter: `run_id=eq.${runId}` }, () => {
        void load()
      })
      .subscribe()

    const onShow = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      stop = true
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
      void supabase.removeChannel(channel)
    }
  }, [app.demo, runId])

  async function saveNew() {
    const body = draft.trim()
    if (!noteBodyOk(body) || !runId) return
    const temp: RunNote = {
      id: `tmp-${uid()}`,
      run_id: runId,
      player_id: app.me,
      body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending: !app.demo,
    }
    setNotes((current) => beginSave(current, temp))
    setDraft('')
    if (app.demo) {
      setNotes((current) => confirmSave(current, temp.id, { ...temp, pending: false }))
      return
    }
    const { data, error } = await supabase
      .from('run_notes')
      .insert({ run_id: runId, player_id: app.me, body })
      .select('id, run_id, player_id, body, created_at, updated_at')
      .single()
    if (error) {
      if (notesTableMissing(error)) {
        setMissing(true)
        setNotes((current) => removeNote(current, temp.id))
        return
      }
      setNotes((current) => rejectSave(current, temp.id, 'Not saved. Try again.'))
      return
    }
    setNotes((current) => confirmSave(current, temp.id, data as RunNote))
  }

  async function saveEdit(id: string) {
    const body = editBody.trim()
    const currentNote = notes.find((row) => row.id === id)
    if (!currentNote || !canEditNote(currentNote, app.me) || !noteBodyOk(body)) return
    const previous = currentNote.body
    setNotes((current) => beginSave(current, { ...currentNote, body }))
    setEditing(null)
    if (app.demo) {
      setNotes((current) => current.map((row) => (row.id === id ? { ...row, body, pending: false, updated_at: new Date().toISOString() } : row)))
      return
    }
    const { error } = await supabase.from('run_notes').update({ body }).eq('id', id).eq('player_id', app.me)
    if (error) {
      if (notesTableMissing(error)) {
        setMissing(true)
        setNotes((current) => current.map((row) => (row.id === id ? { ...row, body: previous, pending: false } : row)))
        return
      }
      setNotes((current) => rejectSave(current.map((row) => (row.id === id ? { ...row, body: previous } : row)), id, 'Edit was not saved.'))
    } else {
      setNotes((current) => current.map((row) => (row.id === id ? { ...row, pending: false, error: null } : row)))
    }
  }

  async function remove(id: string) {
    const currentNote = notes.find((row) => row.id === id)
    if (!currentNote || !canEditNote(currentNote, app.me)) return
    setNotes((current) => removeNote(current, id))
    setEditing((value) => (value === id ? null : value))
    if (app.demo) return
    const { error } = await supabase.from('run_notes').delete().eq('id', id).eq('player_id', app.me)
    if (error) {
      if (notesTableMissing(error)) {
        setMissing(true)
        return
      }
      setNotes((current) => orderNotes([...current, { ...currentNote, pending: false, error: 'Delete failed. The note is still there.' }]))
    }
  }

  return (
    <div className="screen notes-screen">
      <p className="note-lead">A shared list for this run. Save a line and it shows up on the other phone.</p>
      {missing && (
        <div className="banner note-missing" role="status">
          <strong>Notes aren’t on the server yet.</strong>
          <p>They’ll show up here after the run_notes migration is applied. Nothing was lost on this phone.</p>
        </div>
      )}
      {loadError && <p className="note-error" role="alert">{loadError}</p>}
      <form
        className="note-composer"
        onSubmit={(event) => {
          event.preventDefault()
          void saveNew()
        }}
      >
        <label className="note-label" htmlFor="note-draft">New note</label>
        <textarea
          id="note-draft"
          value={draft}
          maxLength={2000}
          rows={3}
          placeholder="Write a line for both of you"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!noteBodyOk(draft)}>Save</button>
      </form>
      {notes.length === 0 && !missing && !loadError && <p className="note-empty">No notes yet.</p>}
      <ol className="note-list">
        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            me={app.me}
            editing={editing === note.id}
            editBody={editing === note.id ? editBody : note.body}
            onEdit={() => {
              setEditing(note.id)
              setEditBody(note.body)
            }}
            onCancel={() => setEditing(null)}
            onChange={setEditBody}
            onSave={() => void saveEdit(note.id)}
            onDelete={() => void remove(note.id)}
          />
        ))}
      </ol>
    </div>
  )
}

function NoteRow({
  note,
  me,
  editing,
  editBody,
  onEdit,
  onCancel,
  onChange,
  onSave,
  onDelete,
}: {
  note: RunNote
  me: PlayerId
  editing: boolean
  editBody: string
  onEdit: () => void
  onCancel: () => void
  onChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
}) {
  const mine = canEditNote(note, me)
  return (
    <li className={`run-note ${note.player_id}${note.error ? ' is-error' : ''}${note.pending ? ' is-pending' : ''}`}>
      <header>
        <span className={`who ${note.player_id}`}>{PLAYERS[note.player_id].name}</span>
        <time dateTime={note.created_at}>{stamp(note.created_at)}</time>
      </header>
      {editing ? (
        <textarea value={editBody} maxLength={2000} rows={3} aria-label={`Edit ${PLAYERS[note.player_id].name}'s note`} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <p>{note.body}</p>
      )}
      {note.pending && <p className="note-pending">Saving…</p>}
      {note.error && <p className="note-error" role="alert">{note.error}</p>}
      {mine && (
        <div className="note-actions">
          {editing ? (
            <>
              <button className="btn btn-sm" type="button" onClick={onSave} disabled={!noteBodyOk(editBody)}>Save</button>
              <button className="btn btn-sm ghost" type="button" onClick={onCancel}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm" type="button" onClick={onEdit}>Edit</button>
              <button className="btn btn-sm ghost" type="button" onClick={onDelete}>Delete</button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
