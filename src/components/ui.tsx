import { Archive, Ban, Heart, Loader2, Plus, Skull, WifiOff, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { artworkUrl, spriteUrl } from '../lib/dex'
import { useToasts } from '../lib/toast'
import { statusLabel } from '../lib/text'
import type { Status, SyncState } from '../lib/types'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
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

export function Sprite({
  id,
  alt,
  dim = false,
  large = false,
}: {
  id?: number | null
  alt: string
  dim?: boolean
  large?: boolean
}) {
  const [mode, setMode] = useState<'sprite' | 'art' | 'none'>('sprite')
  useEffect(() => setMode('sprite'), [id])
  const className = cx('sprite', dim && 'dim', large && 'large')
  if (!id || mode === 'none') {
    return (
      <span className={cx(className, 'fallback')} aria-hidden="true">
        <PokeballIcon size={large ? 32 : 22} />
      </span>
    )
  }
  return (
    <img
      className={className}
      src={mode === 'sprite' ? spriteUrl(id) : artworkUrl(id)}
      alt={alt}
      width={large ? 72 : 48}
      height={large ? 72 : 48}
      loading="lazy"
      decoding="async"
      onError={() => setMode((current) => (current === 'sprite' ? 'art' : 'none'))}
    />
  )
}

const STATUS_ICONS: Record<Status | 'open', LucideIcon> = {
  alive: Heart,
  boxed: Archive,
  dead: Skull,
  missed: Ban,
  open: Plus,
}

export function StatusChip({ status, inTeam = false }: { status: Status | 'open'; inTeam?: boolean }) {
  const Icon = STATUS_ICONS[status]
  const label = status === 'open' ? 'Offen' : statusLabel(status, inTeam)
  return (
    <span className={cx('status-chip', `is-${status}`)}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  )
}

export function SyncIndicator({ state }: { state: SyncState }) {
  const full = state === 'live' ? 'Live' : state === 'syncing' ? 'Synchronisiere…' : 'Offline – Änderungen werden gespeichert'
  const short = state === 'offline' ? 'Offline' : full
  return (
    <p className={cx('sync', state)} role="status" aria-live="polite" title={full}>
      {state === 'live' && <span className="dot" aria-hidden="true" />}
      {state === 'syncing' && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {state === 'offline' && <WifiOff size={16} aria-hidden="true" />}
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
        <div className={cx('sheet', snap === 'half' && 'half')} style={{ transform: drag ? `translateY(${Math.max(drag, 0)}px)` : undefined }}>
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
          <h2 id={titleId} className="sheet-title">{title}</h2>
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
