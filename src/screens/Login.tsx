import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowRight, Lock, PlayCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppWaves } from '../components/LoginBackdrop'
import { Cutout, Photo } from '../components/Photo'
import { BottomSheet, SpritePlate } from '../components/ui'
import { supabase } from '../lib/supabase'
import { authError, relativeWhen } from '../lib/text'
import { PLAYERS, type LoginPreview, type PlayerId } from '../lib/types'

export function Login({
  sessionPlayer = null,
  onContinue,
  onDemo,
  previewSeed = null,
}: {
  sessionPlayer?: PlayerId | null
  onContinue?: () => void
  onDemo?: () => void
  previewSeed?: LoginPreview | null
}) {
  const [picked, setPicked] = useState<PlayerId | null>(null)
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<LoginPreview | null>(previewSeed)
  const [waves, setWaves] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.login-hero', { y: 12, autoAlpha: 0, duration: 0.55, ease: 'power2.out', clearProps: 'transform,opacity,visibility' })
      gsap.from('.pcard, .demo', { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.07, delay: 0.1, ease: 'power2.out', clearProps: 'transform,opacity,visibility' })
    })
    return () => motion.revert()
  }, { scope: root })

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
    <div className="login-app" ref={root} data-me={sessionPlayer ?? picked ?? 'fisi'} data-screen="start" data-waves={waves ? 'on' : 'off'}>
      <AppWaves onLive={setWaves} />
      <div className="scroll">
        <div className="login-hero">
          <img className="logo logo-float" src={`${import.meta.env.BASE_URL}design/app-logo.svg`} alt="" width={76} height={76} />
          <div className="wordmark">Fisi's Tracker</div>
          <div className="tagline">Two trainers. One fate.</div>
          <span className="ver">Pokémon Unbound</span>
        </div>
        <div className="pcards">
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
                className={`pcard ${id}`}
                type="button"
                aria-label={sessionPlayer === id ? `Continue as ${player.name}` : `Start as ${player.name}`}
                onClick={() => choose(id)}
              >
                <span className="ground" />
                <Cutout id={id} />
                <div className="col">
                  <div className="row1">
                    <Photo id={id} size="md" alt={player.name} />
                    <div>
                      <h2>{player.name}</h2>
                      <div className="m">{meta || player.device}</div>
                    </div>
                  </div>
                  {sprites.length > 0 && (
                    <div className="team">
                      {sprites.map((dex) => <SpritePlate key={dex} id={dex} alt="" size="sm" />)}
                      {extra > 0 && <span className="more">+{extra}</span>}
                    </div>
                  )}
                  <div className="cta">
                    {sessionPlayer === id ? 'Continue' : `Start as ${player.name}`}
                    <ArrowRight size={18} aria-hidden="true" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <button className="demo" type="button" onClick={() => onDemo?.()}>
          <PlayCircle size={18} aria-hidden="true" />
          View demo
        </button>
        <p className="note">
          <Lock size={14} aria-hidden="true" />
          {sessionPlayer ? 'Signed in. Tap your card.' : 'Enter the secret code once. You’ll stay signed in.'}
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
      <p className="pixel">FISI'S TRACKER</p>
      <p>This account isn’t Fisi or Seri.</p>
      <button className="btn btn-primary" type="button" onClick={onOut}>Sign out</button>
    </div>
  )
}
