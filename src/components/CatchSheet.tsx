import { Archive, Ban, Dices, Heart, Skull } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { randomNickname } from '../data/nicknames'
import { searchMons, type Mon } from '../lib/dex'
import { findRoute, nextOpenRoute, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type CatchDraft, type Status } from '../lib/types'
import { norm, shortStatus, statusLabel } from '../lib/text'
import { BottomSheet, cx, Sprite, StatusChip } from './ui'

const SEGMENTS: { status: Status; label: string; icon: typeof Heart }[] = [
  { status: 'alive', label: 'Lebt', icon: Heart },
  { status: 'boxed', label: 'Box', icon: Archive },
  { status: 'dead', label: 'Gefallen', icon: Skull },
  { status: 'missed', label: 'Verpasst', icon: Ban },
]

export function CatchSheet({
  open,
  presetRoute,
  onClose,
}: {
  open: boolean
  presetRoute?: string | null
  onClose: () => void
}) {
  const app = useApp()
  const rows = useMemo(() => pairRows(app.catches, app.customRoutes), [app.catches, app.customRoutes])
  const [draft, setDraft] = useState<CatchDraft | null>(null)
  const [query, setQuery] = useState('')
  const [routeQuery, setRouteQuery] = useState('')
  const [pickingRoute, setPickingRoute] = useState(false)
  const [customName, setCustomName] = useState('')
  const [busy, setBusy] = useState(false)
  const bag = useRef(app)
  bag.current = app

  useEffect(() => {
    if (!open) return
    const current = bag.current
    const currentRows = pairRows(current.catches, current.customRoutes)
    const route = (presetRoute && findRoute(presetRoute, current.customRoutes)) || nextOpenRoute(currentRows, current.me)
    const existing = route ? current.catches.find((row) => row.player === current.me && row.route === route.name) : undefined
    setDraft({
      route: route?.name ?? '',
      routeOrder: route?.order ?? 0,
      dexId: existing?.dex_id ?? null,
      pokemon: existing?.pokemon ?? null,
      nickname: existing?.nickname ?? '',
      status: existing?.status ?? 'alive',
      level: existing?.level ? String(existing.level) : '',
      note: existing?.note ?? '',
      deathCause: existing?.death_cause ?? '',
      epitaph: existing?.epitaph ?? '',
    })
    setQuery(existing?.pokemon ?? '')
    setRouteQuery('')
    setPickingRoute(!route)
    setCustomName('')
    setBusy(false)
  }, [open, presetRoute])

  const results = useMemo(() => searchMons(query), [query])
  const partner = draft
    ? app.catches.find((row) => row.player !== app.me && row.route === draft.route)
    : undefined
  const partnerMeta = PLAYERS[otherPlayer(app.me)]
  const routeChoices = rows.filter((row) => {
    const needle = norm(routeQuery)
    if (!needle) return true
    return norm(row.route.name).includes(needle) || norm(row.route.en).includes(needle)
  })

  async function save() {
    if (!draft || busy) return
    setBusy(true)
    const result = await app.saveCatch(draft)
    setBusy(false)
    if (result !== 'invalid') onClose()
  }

  return (
    <BottomSheet
      open={open && Boolean(draft)}
      title={draft?.pokemon ? 'Fang bearbeiten' : 'Fang eintragen'}
      onClose={onClose}
      footer={
        <div className="sheet-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={busy}>
            Speichern
          </button>
        </div>
      }
    >
      {draft && (
        <div className="form">
          <div className="partner-banner">
            {partner ? (
              <>
                <Sprite id={partner.dex_id} alt={partner.pokemon ?? 'Pokémon'} />
                <p>
                  <span>{partnerMeta.possessive} Fang</span>
                  <strong>
                    {partner.status === 'missed'
                      ? 'verpasst'
                      : `${partner.pokemon ?? 'Pokémon'}${partner.nickname ? ` „${partner.nickname}“` : ''}`}
                  </strong>
                </p>
                <StatusChip status={partner.status} inTeam={partner.in_team} />
              </>
            ) : (
              <p>{partnerMeta.name} hat hier noch nichts eingetragen.</p>
            )}
          </div>

          <label className="field">
            <span>Route / Ort</span>
            <button className="pick-current" type="button" onClick={() => setPickingRoute((value) => !value)}>
              <strong>{draft.route || 'Route wählen'}</strong>
              <em>{draft.route ? rows.find((row) => row.route.name === draft.route)?.route.en : 'Suche oder eigener Ort'}</em>
            </button>
          </label>
          {pickingRoute && (
            <div className="picker">
              <input
                value={routeQuery}
                onChange={(event) => setRouteQuery(event.target.value)}
                placeholder="Route suchen"
                aria-label="Route suchen"
                enterKeyHint="search"
              />
              <div className="picker-list">
                {routeChoices.map((row) => {
                  const taken = Boolean(row[app.me]) && row.route.name !== draft.route
                  return (
                    <button
                      key={row.route.name}
                      type="button"
                      className="pick"
                      disabled={taken}
                      onClick={() => {
                        const existing = app.catches.find((item) => item.player === app.me && item.route === row.route.name)
                        setDraft({
                          ...draft,
                          route: row.route.name,
                          routeOrder: row.route.order,
                          dexId: existing?.dex_id ?? draft.dexId,
                          pokemon: existing?.pokemon ?? draft.pokemon,
                          nickname: existing?.nickname ?? draft.nickname,
                          status: existing?.status ?? draft.status,
                        })
                        setPickingRoute(false)
                      }}
                    >
                      <span>
                        <strong>{row.route.name}</strong>
                        <em>{row.route.en}</em>
                      </span>
                      {taken ? <em>schon belegt</em> : row.route.name === draft.route ? <em>gewählt</em> : null}
                    </button>
                  )
                })}
              </div>
              <div className="custom-row">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Eigenen Ort anlegen"
                  aria-label="Eigenen Ort anlegen"
                  maxLength={40}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    const created = app.addCustomRoute(customName)
                    if (!created) return
                    setDraft({ ...draft, route: created.name, routeOrder: created.order })
                    setCustomName('')
                    setPickingRoute(false)
                  }}
                >
                  Anlegen
                </button>
              </div>
            </div>
          )}

          <div className="segments" role="group" aria-label="Status">
            {SEGMENTS.map((segment) => {
              const Icon = segment.icon
              const pressed = draft.status === segment.status
              return (
                <button
                  key={segment.status}
                  type="button"
                  className={cx('seg', `is-${segment.status}`)}
                  aria-pressed={pressed}
                  onClick={() => setDraft({ ...draft, status: segment.status })}
                >
                  <Icon size={18} aria-hidden="true" />
                  {segment.label}
                </button>
              )
            })}
          </div>

          {draft.status !== 'missed' && (
            <>
              <label className="field">
                <span>Pokémon</span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setDraft({ ...draft, dexId: null, pokemon: null })
                  }}
                  placeholder="Name oder Nummer"
                  aria-label="Pokémon suchen"
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </label>
              {draft.dexId && draft.pokemon && norm(query) === norm(draft.pokemon) ? (
                <div className="picked">
                  <Sprite id={draft.dexId} alt={draft.pokemon} />
                  <div>
                    <strong>{draft.pokemon}</strong>
                    <em>#{String(draft.dexId).padStart(3, '0')}</em>
                  </div>
                </div>
              ) : (
                <div className="picker-list mons">
                  {query.trim() ? results.map((mon) => (
                    <MonRow
                      key={mon.id}
                      mon={mon}
                      onPick={() => {
                        setDraft({ ...draft, dexId: mon.id, pokemon: mon.de })
                        setQuery(mon.de)
                      }}
                    />
                  )) : <p className="hint">Zwei, drei Buchstaben reichen.</p>}
                  {query.trim() && !results.length && <p className="hint">Kein Pokémon mit diesem Namen.</p>}
                </div>
              )}

              <label className="field">
                <span>Spitzname</span>
                <div className="inline">
                  <input
                    value={draft.nickname}
                    maxLength={24}
                    onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
                    placeholder="optional"
                    aria-label="Spitzname"
                  />
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label="Zufälligen Spitznamen würfeln"
                    onClick={() => setDraft({ ...draft, nickname: randomNickname(draft.nickname) })}
                  >
                    <Dices />
                  </button>
                </div>
              </label>
            </>
          )}

          <details className="more-details">
            <summary>Mehr Details</summary>
            {draft.status !== 'missed' && (
              <label className="field">
                <span>Level</span>
                <input
                  inputMode="numeric"
                  value={draft.level}
                  onChange={(event) => setDraft({ ...draft, level: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                  placeholder="1–100"
                  aria-label="Level"
                />
              </label>
            )}
            <label className="field">
              <span>Notiz</span>
              <textarea
                value={draft.note}
                maxLength={280}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                rows={2}
                aria-label="Notiz"
              />
            </label>
            {draft.status === 'dead' && (
              <>
                <label className="field">
                  <span>Ursache</span>
                  <input
                    value={draft.deathCause}
                    maxLength={160}
                    onChange={(event) => setDraft({ ...draft, deathCause: event.target.value })}
                    placeholder="von Rivale Lucas' Garados"
                    aria-label="Todesursache"
                  />
                </label>
                <label className="field">
                  <span>Epitaph</span>
                  <input
                    value={draft.epitaph}
                    maxLength={140}
                    onChange={(event) => setDraft({ ...draft, epitaph: event.target.value })}
                    placeholder="Ruhe in Frieden, tapferer Freund."
                    aria-label="Epitaph"
                  />
                </label>
              </>
            )}
          </details>
          <p className="hint">Status: {draft.status === 'alive' ? statusLabel('alive') : shortStatus(draft.status)}. Speichern sitzt unten im Daumenbereich.</p>
        </div>
      )}
    </BottomSheet>
  )
}

function MonRow({ mon, onPick }: { mon: Mon; onPick: () => void }) {
  return (
    <button className="pick" type="button" onClick={onPick}>
      <Sprite id={mon.id} alt={mon.de} />
      <span>
        <strong>{mon.de}</strong>
        <em>{mon.en} · {mon.t2 ? `${mon.t1} / ${mon.t2}` : mon.t1}</em>
      </span>
    </button>
  )
}
