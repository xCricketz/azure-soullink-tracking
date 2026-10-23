import { Archive, Ban, Check, ChevronDown, Dices, Heart, MapPin, Search, Skull } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { randomNickname } from '../data/nicknames'
import { searchMons, type Mon } from '../lib/dex'
import { findRoute, nextOpenRoute, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type CatchDraft, type Status } from '../lib/types'
import { norm } from '../lib/text'
import { BottomSheet, cx, Marked, SpritePlate, StatusChip, TypePills } from './ui'

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

  const results = useMemo(() => searchMons(query, 8), [query])
  const partner = draft
    ? app.catches.find((row) => row.player !== app.me && row.route === draft.route)
    : undefined
  const partnerMeta = PLAYERS[otherPlayer(app.me)]
  const next = nextOpenRoute(rows, app.me)
  const routeChoices = rows.filter((row) => {
    const needle = norm(routeQuery)
    if (!needle) return true
    return norm(row.route.name).includes(needle) || norm(row.route.en).includes(needle)
  })
  const showResults = Boolean(query.trim()) && !(draft?.dexId && draft.pokemon && norm(query) === norm(draft.pokemon))

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
      title="Fang eintragen"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={busy}>
          <Check size={18} strokeWidth={2.75} aria-hidden="true" />
          {busy ? 'Speichere…' : 'Speichern'}
        </button>
      }
    >
      {draft && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div className={cx('partner', partnerMeta.id)}>
            {partner && partner.status !== 'missed' ? (
              <>
                <SpritePlate id={partner.dex_id} alt={partner.pokemon ?? 'Pokémon'} size="sm" />
                <p>
                  <span className="lbl">{partnerMeta.possessive} Fang</span>
                  <strong>
                    {partner.pokemon ?? 'Pokémon'}
                    {partner.nickname ? ` „${partner.nickname}“` : ''}
                  </strong>
                </p>
                <StatusChip status={partner.status} />
              </>
            ) : (
              <p>{partner?.status === 'missed' ? `${partnerMeta.name} hat die Route verpasst.` : `${partnerMeta.name} hat hier noch nichts eingetragen.`}</p>
            )}
          </div>

          <div className="fl">
            Route / Ort
            {draft.route && draft.route === next?.name && <em>nächste offene Route</em>}
          </div>
          <button className="inp" type="button" onClick={() => setPickingRoute((value) => !value)}>
            <MapPin size={18} aria-hidden="true" />
            <span className="grow">{draft.route || 'Route wählen'}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
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
                        if (existing?.pokemon) setQuery(existing.pokemon)
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

          {draft.status !== 'missed' && (
            <>
              <div className="fl">Pokémon</div>
              <div className={cx('inp', showResults && 'focus')}>
                <Search size={18} aria-hidden="true" />
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
                {query.trim() && <span className="hit-count">{results.length} Treffer</span>}
              </div>
              {showResults && (
                <div className="res" role="listbox" aria-label="Pokémon">
                  {results.map((mon) => (
                    <MonRow
                      key={mon.id}
                      mon={mon}
                      query={query}
                      selected={draft.dexId === mon.id}
                      onPick={() => {
                        setDraft({ ...draft, dexId: mon.id, pokemon: mon.de })
                        setQuery(mon.de)
                      }}
                    />
                  ))}
                  {!results.length && <p className="hint">Kein Pokémon mit diesem Namen.</p>}
                </div>
              )}

              <div className="fl">Spitzname <em>optional</em></div>
              <div className="nickrow">
                <div className="inp">
                  <input
                    value={draft.nickname}
                    maxLength={24}
                    onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
                    placeholder="Spitzname"
                    aria-label="Spitzname"
                  />
                </div>
                <button
                  className="dice"
                  type="button"
                  aria-label="Zufälligen Spitznamen würfeln"
                  onClick={() => setDraft({ ...draft, nickname: randomNickname(draft.nickname) })}
                >
                  <Dices size={22} aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          <div className="fl">Status</div>
          <div className="stseg" role="group" aria-label="Status">
            {SEGMENTS.map((segment) => {
              const Icon = segment.icon
              const pressed = draft.status === segment.status
              return (
                <button
                  key={segment.status}
                  type="button"
                  className={cx('seg', `is-${segment.status}`, pressed && 'on')}
                  aria-pressed={pressed}
                  onClick={() => setDraft({ ...draft, status: segment.status })}
                >
                  <Icon size={18} aria-hidden="true" />
                  {segment.label}
                </button>
              )
            })}
          </div>

          <details className="more-details">
            <summary>Mehr Details (Level, Notiz)</summary>
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
        </form>
      )}
    </BottomSheet>
  )
}

function MonRow({ mon, query, selected, onPick }: { mon: Mon; query: string; selected: boolean; onPick: () => void }) {
  return (
    <button className={cx('r', selected && 'sel')} type="button" role="option" aria-selected={selected} onClick={onPick}>
      <SpritePlate id={mon.id} alt={mon.de} size="sm" />
      <span className="nm">
        <Marked text={mon.de} query={query} />
        <small>#{mon.id}</small>
      </span>
      <TypePills names={[mon.t1]} />
      {selected && <Check size={18} aria-hidden="true" />}
    </button>
  )
}
