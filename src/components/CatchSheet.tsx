import { Archive, Ban, Check, ChevronDown, Dices, Heart, MapPin, Search, Shuffle, Skull } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { randomNickname } from '../data/nicknames'
import { groupTitle, routeTitle, routeTitleByKey } from '../data/routes'
import { monById } from '../lib/dex'
import { loadAreas, monLabel, searchDex, useDex, type EncounterArea, type UMon } from '../lib/unbound'
import { findRoute, nextOpenRoute, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type CatchDraft, type Status } from '../lib/types'
import { norm } from '../lib/text'
import { dexKey } from '../lib/unbound'
import { optionsOf } from '../lib/options'
import { speciesName } from '../lib/text'
import { ImportSheet, SaveFileControl } from './ImportSheet'
import { Photo } from './Photo'
import { BottomSheet, cx, Marked, SpritePlate, StatusChip, TypePills } from './ui'

const SEGMENTS: { status: Status; label: string; icon: typeof Heart }[] = [
  { status: 'alive', label: 'Alive', icon: Heart },
  { status: 'boxed', label: 'Box', icon: Archive },
  { status: 'dead', label: 'Fainted', icon: Skull },
  { status: 'missed', label: 'Missed', icon: Ban },
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
  const [importOpen, setImportOpen] = useState(false)
  const [incoming, setIncoming] = useState<File | null>(null)
  const [area, setArea] = useState<EncounterArea | null>(null)
  const dex = useDex()
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
      form: existing?.form ?? null,
      pokemon: existing?.pokemon ?? null,
      nickname: existing?.nickname ?? '',
      status: existing?.status ?? 'alive',
      level: existing?.level ? String(existing.level) : '',
      note: existing?.note ?? '',
      deathCause: existing?.death_cause ?? '',
      epitaph: existing?.epitaph ?? '',
    })
    setQuery(existing?.form ? `${monById(existing.dex_id)?.en ?? existing.pokemon ?? ''} (${existing.form})` : (monById(existing?.dex_id)?.en ?? existing?.pokemon ?? ''))
    setRouteQuery('')
    setPickingRoute(!route)
    setCustomName('')
    setBusy(false)
  }, [open, presetRoute])

  const results = useMemo(() => (dex ? searchDex(dex, query, 8) : []), [dex, query])
  const suggested = useMemo(() => {
    if (!dex || !area) return []
    const seen = new Set<string>()
    const found: UMon[] = []
    for (const row of [...area.wild, ...area.special]) {
      const token = `${row.species}|${row.form ?? ''}`
      if (seen.has(token)) continue
      seen.add(token)
      const mon = dex.find((item) => item.name === row.species && (item.form ?? null) === (row.form ?? null))
      if (mon) found.push(mon)
      if (found.length >= 24) break
    }
    return found
  }, [area, dex])

  useEffect(() => {
    if (!draft?.route) {
      setArea(null)
      return
    }
    const route = draft.route
    let live = true
    void loadAreas().then((map) => {
      if (live) setArea(map.get(route) ?? null)
    })
    return () => { live = false }
  }, [draft?.route])
  const partner = draft
    ? app.catches.find((row) => row.player !== app.me && row.route === draft.route)
    : undefined
  const partnerMeta = PLAYERS[otherPlayer(app.me)]
  const next = nextOpenRoute(rows, app.me)
  const routeChoices = rows.filter((row) => {
    const needle = norm(routeQuery)
    if (!needle) return true
    return norm(row.route.name).includes(needle) || norm(row.route.en).includes(needle) || norm(groupTitle(row.route.group)).includes(needle)
  })
  const pickedLabel = draft?.pokemon ? (draft.form ? `${draft.pokemon} (${draft.form})` : draft.pokemon) : ''
  const showResults = Boolean(query.trim()) && !(draft?.dexId && norm(query) === norm(pickedLabel))
  const options = optionsOf(app.run)
  const randomized = options.randomizerSpecies
  const speciesHints = randomized ? [] : suggested
  const methods = area ? [...new Set([...area.wild, ...area.special].map((row) => row.method))] : []
  const clauseDex = draft?.dexId ?? null
  const clause = clauseDex && draft && options.speciesClause !== 'off'
    ? app.catches.find((row) => {
        if (!row.dex_id || row.status === 'missed' || row.status === 'dead') return false
        if (row.route === draft.route && row.player === app.me) return false
        if (dexKey(row.dex_id, row.form) !== dexKey(clauseDex, draft.form)) return false
        if (options.speciesClause === 'player') return row.player === app.me
        return true
      })
    : undefined

  async function save() {
    if (!draft || busy) return
    setBusy(true)
    const result = await app.saveCatch(draft)
    setBusy(false)
    if (result !== 'invalid') onClose()
  }

  return (
    <>
    <BottomSheet
      open={open && Boolean(draft)}
      title="Log a catch"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={busy}>
          <Check size={18} strokeWidth={2.75} aria-hidden="true" />
          {busy ? 'Saving…' : 'Save'}
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
          <SaveFileControl
            controlClass="btn btn-sm import-jump"
            inputLabel="Import a .sav"
            onFile={(file) => { setIncoming(file); setImportOpen(true) }}
          >
            Import a .sav
          </SaveFileControl>
          {randomized && <p className="rand-note"><Shuffle size={14} aria-hidden="true" /> Randomizer on · any species. Area names and methods only.</p>}
          <div className={cx('partner', partnerMeta.id)}>
            <Photo id={partnerMeta.id} size="sm" alt="" />
            {partner && partner.status !== 'missed' ? (
              <>
                <SpritePlate id={partner.dex_id} alt={partner.pokemon ?? 'Pokémon'} size="sm" />
                <p>
                  <span className="lbl">{partnerMeta.possessive} catch</span>
                  <strong>
                    {monById(partner.dex_id)?.en ?? partner.pokemon ?? 'Pokémon'}
                    {partner.nickname ? ` „${partner.nickname}“` : ''}
                  </strong>
                </p>
                <StatusChip status={partner.status} />
              </>
            ) : (
              <p>{partner?.status === 'missed' ? `${partnerMeta.name} missed this route.` : `${partnerMeta.name} hasn’t logged anything here.`}</p>
            )}
          </div>

          <div className="fl">
            Route
            {draft.route && draft.route === next?.name && <em>next open route</em>}
          </div>
          <button className="inp" type="button" onClick={() => setPickingRoute((value) => !value)}>
            <MapPin size={18} aria-hidden="true" />
            <span className="grow">{draft.route ? routeTitleByKey(draft.route) : 'Choose a route'}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {pickingRoute && (
            <div className="picker">
              <input
                value={routeQuery}
                onChange={(event) => setRouteQuery(event.target.value)}
                placeholder="Search routes"
                aria-label="Search routes"
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
                          form: existing?.form ?? draft.form,
                          pokemon: existing?.pokemon ?? draft.pokemon,
                          nickname: existing?.nickname ?? draft.nickname,
                          status: existing?.status ?? draft.status,
                        })
                        if (existing?.pokemon) setQuery(monById(existing.dex_id)?.en ?? existing.pokemon)
                        setPickingRoute(false)
                      }}
                    >
                      <span>
                        <strong>{routeTitle(row.route)}</strong>
                      </span>
                      {taken ? <em>taken</em> : row.route.name === draft.route ? <em>selected</em> : null}
                    </button>
                  )
                })}
              </div>
              <div className="custom-row">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Add a custom place"
                  aria-label="Add a custom place"
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
                  Add
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
                    setDraft({ ...draft, dexId: null, form: null, pokemon: null })
                  }}
                  placeholder="Name or number"
                  aria-label="Search Pokémon"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {query.trim() && <span className="hit-count">{results.length} results</span>}
              </div>
              {randomized && area && (
                <p className="hint">{area.name}{methods.length ? ` · ${methods.join(', ')}` : ''}. The species list is hidden while the randomizer is on.</p>
              )}
              {speciesHints.length > 0 && (
                <div className="enc-row" aria-label="Species seen here">
                  {speciesHints.map((mon) => (
                    <button
                      key={mon.key}
                      type="button"
                      className={draft.dexId === mon.nat && draft.form === mon.form ? 'on' : ''}
                      onClick={() => {
                        setDraft({ ...draft, dexId: mon.nat, form: mon.form, pokemon: mon.name })
                        setQuery(monLabel(mon))
                      }}
                    >
                      {monLabel(mon)}
                    </button>
                  ))}
                </div>
              )}
              {showResults && (
                <div className="res" role="listbox" aria-label="Pokémon">
                  {results.map((mon) => (
                    <MonRow
                      key={mon.key}
                      mon={mon}
                      query={query}
                      selected={draft.dexId === mon.nat && (draft.form ?? null) === (mon.form ?? null)}
                      onPick={() => {
                        setDraft({ ...draft, dexId: mon.nat, form: mon.form, pokemon: mon.name })
                        setQuery(monLabel(mon))
                      }}
                    />
                  ))}
                  {!results.length && <p className="hint">No Pokémon with that name.</p>}
                </div>
              )}

              {clause && <p className="clause-note">Species clause: {PLAYERS[clause.player].name} already logged {speciesName(clause)}.</p>}
              <div className="fl">Nickname <em>optional</em></div>
              <div className="nickrow">
                <div className="inp">
                  <input
                    value={draft.nickname}
                    maxLength={24}
                    onChange={(event) => setDraft({ ...draft, nickname: event.target.value })}
                    placeholder="Nickname"
                    aria-label="Nickname"
                  />
                </div>
                <button
                  className="dice"
                  type="button"
                  aria-label="Roll a random nickname"
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
            <summary>More details (level, note)</summary>
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
                <span>Note</span>
              <textarea
                value={draft.note}
                maxLength={280}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                rows={2}
                aria-label="Note"
              />
            </label>
            {draft.status === 'dead' && (
              <>
                <label className="field">
                  <span>Cause</span>
                  <input
                    value={draft.deathCause}
                    maxLength={160}
                    onChange={(event) => setDraft({ ...draft, deathCause: event.target.value })}
                    placeholder="by rival Lucas’s Gyarados"
                    aria-label="Cause of death"
                  />
                </label>
                <label className="field">
                  <span>Epitaph</span>
                  <input
                    value={draft.epitaph}
                    maxLength={140}
                    onChange={(event) => setDraft({ ...draft, epitaph: event.target.value })}
                    placeholder="Rest in peace, brave friend."
                    aria-label="Epitaph"
                  />
                </label>
              </>
            )}
          </details>
        </form>
      )}
    </BottomSheet>
    <ImportSheet open={open && importOpen} incoming={incoming} onClose={() => { setImportOpen(false); setIncoming(null) }} />
    </>
  )
}

function MonRow({ mon, query, selected, onPick }: { mon: UMon; query: string; selected: boolean; onPick: () => void }) {
  const label = monLabel(mon)
  return (
    <button className={cx('r', selected && 'sel')} type="button" role="option" aria-selected={selected} onClick={onPick}>
      <SpritePlate id={mon.nat} alt={label} size="sm" types={mon.types} />
      <span className="nm">
        <Marked text={label} query={query} />
        <small>#{String(mon.nat).padStart(3, '0')}{mon.form ? ` · ${mon.form}` : ''}</small>
      </span>
      <TypePills names={mon.types} />
      {selected && <Check size={18} aria-hidden="true" />}
    </button>
  )
}
