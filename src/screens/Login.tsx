import { useState } from 'react'
import { BottomSheet } from '../components/ui'
import { supabase } from '../lib/supabase'
import { authError } from '../lib/text'
import { PLAYERS, type PlayerId } from '../lib/types'

export function Login() {
  const [picked, setPicked] = useState<PlayerId | null>(null)
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!picked || !code.trim() || busy) return
    setBusy(true)
    setError('')
    const { error: auth } = await supabase.auth.signInWithPassword({
      email: PLAYERS[picked].email,
      password: code,
    })
    setBusy(false)
    if (auth) setError(authError(auth.message))
  }

  return (
    <div className="login">
      <div className="login-inner">
        <header className="login-brand">
          <p className="pixel">SOUL LINK</p>
          <p>Azure Platinum · Fisi & Seri</p>
        </header>
        <h1>Wer bist du?</h1>
        <div className="who-grid">
          {(['fisi', 'seri'] as PlayerId[]).map((id) => (
            <button key={id} className={`who ${id}`} type="button" onClick={() => { setPicked(id); setError(''); setCode('') }}>
              <span className="avatar" aria-hidden="true">{PLAYERS[id].letter}</span>
              <span className="who-name">{PLAYERS[id].name}</span>
              <span className="who-cta">Als {PLAYERS[id].name} starten</span>
            </button>
          ))}
        </div>
        <p className="hint center">Einmal den Geheimcode, danach bleibt ihr angemeldet.</p>
      </div>
      <BottomSheet
        open={picked !== null}
        title={picked ? `Du bist ${PLAYERS[picked].name}?` : 'Geheimcode'}
        onClose={() => setPicked(null)}
        footer={
          <div className="sheet-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setPicked(null)}>Zurück</button>
            <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={busy || !code.trim()}>
              {busy ? 'Prüfe…' : 'Ja, los!'}
            </button>
          </div>
        }
      >
        {picked && (
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <p>Das kannst du später unter Mehr ändern.</p>
            <input className="sr-only" name="username" autoComplete="username" value={PLAYERS[picked].email} readOnly />
            <label className="field">
              <span>Geheimcode</span>
              <div className="inline">
                <input
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-label="Geheimcode"
                  autoFocus
                />
                <button className="btn btn-ghost" type="button" onClick={() => setShow((value) => !value)}>
                  {show ? 'Verbergen' : 'Zeigen'}
                </button>
              </div>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>
        )}
      </BottomSheet>
    </div>
  )
}

export function UnknownAccount({ onOut }: { onOut: () => void }) {
  return (
    <div className="boot">
      <p className="pixel">SOUL LINK</p>
      <p>Dieses Konto gehört nicht zu Fisi oder Seri.</p>
      <button className="btn btn-primary" type="button" onClick={onOut}>Abmelden</button>
    </div>
  )
}
