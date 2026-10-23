import { ArrowRight, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TrainerShot } from '../components/TrainerShot'
import { BottomSheet, SpritePlate } from '../components/ui'
import { supabase } from '../lib/supabase'
import { authError, relativeWhen } from '../lib/text'
import { PLAYERS, type LoginPreview, type PlayerId } from '../lib/types'

export function Login({
  sessionPlayer = null,
  onContinue,
  previewSeed = null,
}: {
  sessionPlayer?: PlayerId | null
  onContinue?: () => void
  previewSeed?: LoginPreview | null
}) {
  const [picked, setPicked] = useState<PlayerId | null>(null)
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<LoginPreview | null>(previewSeed)

  useEffect(() => {
    if (previewSeed) return
    void supabase.rpc('login_preview').then(({ data, error: rpcError }) => {
      if (rpcError || !data || typeof data !== 'object') return
      setPreview(data as LoginPreview)
    })
  }, [previewSeed])

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
    else onContinue?.()
  }

  function choose(id: PlayerId) {
    if (sessionPlayer === id) {
      onContinue?.()
      return
    }
    setPicked(id)
    setError('')
    setCode('')
  }

  return (
    <div className="login" data-me={sessionPlayer ?? picked ?? 'fisi'} data-screen="start">
      <div className="login-inner">
        <header className="lg">
          <img className="logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <h1 className="pixel">SOUL LINK</h1>
          <p className="sub">Azure Platinum · Fisi & Seri</p>
          <h2>Who are you?</h2>
        </header>
        <div className="who-grid">
          {(['fisi', 'seri'] as PlayerId[]).map((id) => {
            const player = PLAYERS[id]
            const card = preview?.players?.[id]
            const badges = preview?.badges
            const sprites = (card?.dex_ids ?? []).slice(0, 3)
            const extra = Math.max(0, (card?.team_count ?? sprites.length) - sprites.length)
            const when = relativeWhen(card?.last_at)
            const meta = [player.device, badges != null ? `${badges} badges` : '', when].filter(Boolean).join(' · ')
            return (
              <button
                key={id}
                className={sessionPlayer === id ? 'pc you' : 'pc'}
                style={{ ['--pc' as string]: `var(--${id})` }}
                type="button"
                aria-label={sessionPlayer === id ? `Continue as ${player.name}` : `Start as ${player.name}`}
                onClick={() => choose(id)}
              >
                <TrainerShot id={id} crop="full" className="pc-figure" alt="" />
                <div className="r1">
                  <span>
                    <span className="nm">{player.name}</span>
                    <span className="meta">{meta}</span>
                  </span>
                </div>
                {sprites.length > 0 && (
                  <span className="mons">
                    {sprites.map((dex) => <SpritePlate key={dex} id={dex} alt="" />)}
                    {extra > 0 && <span className="more">+{extra}</span>}
                  </span>
                )}
                <span className="go">
                  {sessionPlayer === id ? 'Continue' : `Start as ${player.name}`}
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </div>
        {sessionPlayer ? (
          <button className="btn btn-primary login-go" type="button" onClick={() => onContinue?.()}>Continue</button>
        ) : null}
        <p className="note">
          <Lock size={14} aria-hidden="true" />
          {sessionPlayer ? ' Signed in. Tap your card or Continue.' : ' Enter the secret code once. You’ll stay signed in.'}
        </p>
      </div>
      <BottomSheet
        open={picked !== null}
        title={picked ? `You are ${PLAYERS[picked].name}?` : 'Secret code'}
        onClose={() => setPicked(null)}
        footer={
          <div className="sheet-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setPicked(null)}>Back</button>
            <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={busy || !code.trim()}>
              {busy ? 'Checking…' : 'Let’s go'}
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
            <p>You can switch later under More.</p>
            <input className="sr-only" name="username" autoComplete="username" value={PLAYERS[picked].email} readOnly />
            <label className="field">
              <span>Secret code</span>
              <div className="inline">
                <input
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-label="Secret code"
                  autoFocus
                />
                <button className="btn btn-ghost" type="button" onClick={() => setShow((value) => !value)}>
                  {show ? 'Hide' : 'Show'}
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
      <p>This account isn’t Fisi or Seri.</p>
      <button className="btn btn-primary" type="button" onClick={onOut}>Sign out</button>
    </div>
  )
}
