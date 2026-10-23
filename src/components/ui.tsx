import { Archive, Ban, Heart, Loader2, Skull, WifiOff, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { monTypes, spriteSources, typeKey } from '../lib/dex'
import { useToasts } from '../lib/toast'
import { shortStatus } from '../lib/text'
import type { Status, SyncState } from '../lib/types'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function typeStyle(name?: string | null): CSSProperties {
  const key = typeKey(name)
  return { ['--tc' as string]: key ? `var(--t-${key})` : 'var(--missed)' }
}

export function PokeballIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 12h17" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.6" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function SpritePlate({
  id,
  alt,
  size = 'md',
  dim = false,
  grave = false,
}: {
  id?: number | null
  alt: string
  size?: 'sm' | 'md' | 'lg'
  dim?: boolean
  grave?: boolean
}) {
  const type = monTypes(id)[0]
  return (
    <span className={cx('plate', size, dim && 'dim', grave && 'grave')} style={typeStyle(type)}>
      <PlateImage id={id} alt={alt} size={size} />
    </span>
  )
}

function PlateImage({ id, alt, size }: { id?: number | null; alt: string; size: 'sm' | 'md' | 'lg' }) {
  const sources = id ? spriteSources(id) : []
  const [step, setStep] = useState(0)
  useEffect(() => setStep(0), [id])
  if (!id || step >= sources.length) {
    return <PokeballIcon size={size === 'lg' ? 36 : size === 'md' ? 22 : 14} />
  }
  return (
    <img
      src={sources[step]}
      alt={alt}
      draggable={false}
      onError={() => setStep((current) => current + 1)}
    />
  )
}

export function TypePills({ id, names }: { id?: number | null; names?: string[] }) {
  const list = (names ?? monTypes(id)).filter(Boolean)
  if (!list.length) return null
  return (
    <span className="tys">
      {list.map((name) => (
        <span key={name} className="ty" style={typeStyle(name)}>{name}</span>
      ))}
    </span>
  )
}

export function Marked({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return <>{text}</>
  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  )
}

const STATUS_ICONS: Record<Status | 'open', LucideIcon> = {
  alive: Heart,
  boxed: Archive,
  dead: Skull,
  missed: Ban,
  open: Heart,
}

export function StatusChip({ status }: { status: Status | 'open'; inTeam?: boolean }) {
  const Icon = STATUS_ICONS[status]
  const label = status === 'open' ? 'Offen' : shortStatus(status)
  return (
    <span className={cx('st', status === 'open' ? 'missed' : status)}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  )
}

export function SyncIndicator({ state }: { state: SyncState }) {
  const full = state === 'live' ? 'Live' : state === 'syncing' ? 'Synchronisiere…' : 'Offline – Änderungen werden gespeichert'
  const short = state === 'offline' ? 'Offline' : full
  return (
    <p className={cx('sync', state)} role="status" aria-live="polite" title={full}>
      {state === 'live' && <i className="dot" aria-hidden="true" />}
      {state === 'syncing' && <Loader2 size={14} className="spin" aria-hidden="true" />}
      {state === 'offline' && <WifiOff size={14} aria-hidden="true" />}
      <span className="sync-label">{short}</span>
      {short !== full && <span className="sr-only">{full}</span>}
    </p>
  )
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <PokeballIcon size={42} />
      <p>{title}</p>
      {action}
    </div>
  )
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()
  const [snap, setSnap] = useState<'full' | 'half'>('full')
  const [drag, setDrag] = useState(0)
  const startY = useRef(0)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    setSnap('full')
    setDrag(0)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])
  if (!open) return null
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet-align"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={cx('sheet', snap === 'half' && 'snap-half')} style={{ transform: drag ? `translateY(${Math.max(drag, 0)}px)` : undefined }}>
          <button
            className="handle"
            type="button"
            aria-label="Verschieben oder schließen"
            onPointerDown={(event) => {
              startY.current = event.clientY
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              setDrag(event.clientY - startY.current)
            }}
            onPointerUp={(event) => {
              const dy = event.clientY - startY.current
              if (snap === 'full' && dy > 220) onClose()
              else if (snap === 'full' && dy > 90) setSnap('half')
              else if (snap === 'half' && dy > 80) onClose()
              else if (snap === 'half' && dy < -40) setSnap('full')
              setDrag(0)
            }}
          >
            <span />
          </button>
          <div className="sh-h">
            <h2 id={titleId}>{title}</h2>
            <button className="x" type="button" aria-label="Schließen" onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-foot">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export function Dialog({
  open,
  title,
  children,
  actions,
  danger = false,
}: {
  open: boolean
  title: string
  children?: ReactNode
  danger?: boolean
  actions: { label: string; onClick: () => void; tone?: 'primary' | 'danger' | 'ghost' }[]
}) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') actions.find((action) => action.tone === 'ghost')?.onClick()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [actions, open])
  if (!open) return null
  return (
    <div className="dialog-align" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={cx('dialog', danger && 'danger')}>
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="dialog-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={cx('btn', action.tone === 'danger' ? 'btn-danger' : action.tone === 'ghost' ? 'btn-ghost' : 'btn-primary')}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ToastHost() {
  const toasts = useToasts()
  if (!toasts.length) return null
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id} role="status">
          <p>{toast.text}</p>
          {toast.actionLabel && toast.onAction && (
            <button type="button" className="btn btn-tiny" onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
