import { Check, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ROUTES } from '../data/routes'
import { loadAreas } from '../lib/unbound'
import { optionsOf } from '../lib/options'
import { readImportedNats, writeImportedNats } from '../lib/save/memory'
import { detectedImportIds, planSave, routeClash, type AreaHint, type PlannedMon } from '../lib/save/plan'
import type { ParsedSave } from '../lib/save/unbound-save'
import { pushToast } from '../lib/toast'
import { PLAYERS, otherPlayer, type CatchDraft } from '../lib/types'
import { useApp } from '../state/context'
import { BottomSheet, cx } from './ui'

/** The file input covers the control. A tap is the user gesture; nothing calls click(). */
export function SaveFileControl({
  inputLabel,
  wrapClass,
  controlClass,
  disabled,
  onFile,
  children,
}: {
  inputLabel: string
  wrapClass?: string
  controlClass?: string
  disabled?: boolean
  onFile: (file: File) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className={cx('file-btn', wrapClass)}>
      <label htmlFor={id} className={controlClass}>{children}</label>
      <input
        id={id}
        type="file"
        aria-label={inputLabel}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (file) onFile(file)
        }}
      />
    </div>
  )
}

export function ImportSheet({ open, onClose, incoming = null }: { open: boolean; onClose: () => void; incoming?: File | null }) {
  const app = useApp()
  const [save, setSave] = useState<ParsedSave | null>(null)
  const [areas, setAreas] = useState<AreaHint[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const [routes, setRoutes] = useState<Record<string, string>>({})
  const [areasReady, setAreasReady] = useState(false)
  const seededFor = useRef<ParsedSave | null>(null)
  const options = optionsOf(app.run)
  const previous = useMemo(() => (open ? readImportedNats(app.run?.id) : []), [open, app.run?.id, save])

  const plan = useMemo(() => {
    if (!save) return null
    return planSave(save, {
      me: app.me,
      catches: app.catches,
      previousNats: previous,
      randomizerSpecies: options.randomizerSpecies,
      routes: ROUTES.map((route) => ({ name: route.name, en: route.en, order: route.order, group: route.group })),
      areas,
    })
  }, [save, app.me, app.catches, previous, options.randomizerSpecies, areas])

  useEffect(() => {
    if (!open) return
    let cancel = false
    setSave(null)
    setError('')
    setBusy(false)
    setDenied(false)
    setRoutes({})
    seededFor.current = null
    setAreasReady(false)
    void loadAreas().then((map) => {
      if (cancel) return
      setAreas([...map.values()].map((area) => ({
        key: area.key,
        species: [...area.wild, ...area.special].map((row) => row.species),
      })))
    }).finally(() => {
      if (!cancel) setAreasReady(true)
    })
    if (incoming) void readIncoming(incoming)
    return () => { cancel = true }

    async function readIncoming(file: File) {
      setBusy(true)
      try {
        let bytes: Uint8Array
        try {
          bytes = new Uint8Array(await file.arrayBuffer())
        } catch {
          bytes = await readFileFallback(file)
        }
        if (cancel) return
        const { readSave } = await import('../lib/save/read')
        const result = await readSave(bytes)
        if (cancel) return
        setBusy(false)
        if (!result.ok) {
          setSave(null)
          setError(result.message)
          return
        }
        setSave(result.save)
      } catch {
        if (cancel) return
        setBusy(false)
        setError('That file could not be read. Save in the game, then export the .sav again.')
      }
    }
  }, [open, incoming])

  useEffect(() => {
    if (!plan || !save || !areasReady || seededFor.current === save) return
    seededFor.current = save
    const nextRoutes: Record<string, string> = {}
    for (const mon of plan.mons) nextRoutes[mon.id] = mon.suggestedRoute ?? ''
    setRoutes(nextRoutes)
  }, [plan, save, areasReady])

  async function loadBytes(bytes: Uint8Array) {
    setBusy(true)
    setError('')
    setDenied(false)
    const { readSave } = await import('../lib/save/read')
    const result = await readSave(bytes)
    setBusy(false)
    if (!result.ok) {
      setSave(null)
      setError(result.message)
      return
    }
    setSave(result.save)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      let bytes: Uint8Array
      try {
        bytes = new Uint8Array(await file.arrayBuffer())
      } catch {
        bytes = await readFileFallback(file)
      }
      await loadBytes(bytes)
    } catch {
      setBusy(false)
      setError('That file could not be read. Save in the game, then export the .sav again.')
    }
  }

  async function onSample() {
    const { sampleSave } = await import('../lib/save/synthetic')
    await loadBytes(sampleSave())
  }

  function draftFor(mon: PlannedMon): CatchDraft {
    const route = ROUTES.find((item) => item.name === routes[mon.id])
    return {
      route: route?.name ?? '',
      routeOrder: route?.order ?? 0,
      dexId: mon.nat,
      form: null,
      pokemon: mon.name,
      nickname: mon.nickname,
      status: mon.where === 'party' ? 'alive' : 'boxed',
      level: mon.level ? String(mon.level) : '',
      note: 'Imported from a save.',
      deathCause: '',
      epitaph: '',
    }
  }

  async function confirm(ids: string[]) {
    if (!save || !plan || busy) return
    const byId = new Map(plan.mons.map((mon) => [mon.id, mon]))
    const adding = ids.filter((id) => {
      const mon = byId.get(id)
      return mon && !mon.duplicate
    })
    if (!adding.length) {
      pushToast('Nothing to add. Detected routes are already taken or still missing.')
      return
    }
    if (adding.some((id) => !routes[id])) {
      pushToast('Choose a route for each Pokémon you add.')
      return
    }
    if (routeClash(adding, routes)) {
      pushToast('Two Pokémon are on the same route. A route holds one catch.')
      return
    }
    if (adding.some((id) => occupies(app.catches, app.me, routes[id]))) {
      pushToast('That route already has your catch.')
      return
    }
    setBusy(true)
    setDenied(false)
    for (const id of adding) {
      const mon = byId.get(id)
      if (!mon) continue
      const result = await app.saveCatch(draftFor(mon))
      if (result === 'invalid') {
        setBusy(false)
        setDenied(true)
        return
      }
    }
    if (app.run) {
      const owned = plan.mons.map((mon) => mon.nat)
      writeImportedNats(app.run.id, owned)
    }
    setBusy(false)
    onClose()
  }

  const groups = groupRoutes()
  const partyCount = plan?.mons.filter((mon) => mon.where === 'party').length ?? 0
  const fromSave = plan?.mons.filter((mon) => mon.place === 'route') ?? []
  const needsRoute = plan?.mons.filter((mon) => mon.place === 'needs-route') ?? []
  const special = plan?.mons.filter((mon) => mon.place === 'trade' || mon.place === 'gift' || mon.place === 'event') ?? []
  const detected = plan ? detectedImportIds(plan.mons).filter((id) => routes[id]) : []

  function rowProps(mon: PlannedMon) {
    return {
      mon,
      route: routes[mon.id] ?? '',
      groups,
      catches: app.catches,
      me: app.me,
      clause: options.speciesClause,
      busy,
      onRoute: (value: string) => setRoutes((current) => ({ ...current, [mon.id]: value })),
      onAdd: () => void confirm([mon.id]),
    }
  }

  return (
    <BottomSheet
      open={open}
      title="Import save"
      onClose={onClose}
      footer={plan ? (
        <button className="btn btn-primary" type="button" disabled={busy || detected.length === 0} onClick={() => void confirm(detected)}>
          <Check size={18} aria-hidden="true" />
          {busy ? 'Adding…' : `Import all with detected routes (${detected.length})`}
        </button>
      ) : undefined}
    >
      <div className="import-sheet" data-import={plan ? 'review' : 'picker'} data-import-denied={denied ? 'true' : 'false'}>
        {!plan && (
          <>
            <div className="import-help">
              <p>Pick a Pokémon Unbound v2.1.1.1 <strong>.sav</strong> file (128 KB, FireRed-based). It is read on this phone. Nothing is uploaded.</p>
              <p>Save inside the game first. A save state is not a .sav file.</p>
              <p>The shiny mark is a guess. Box levels are worked out from experience points. Nature comes from the personality value, so a mint would not show.</p>
              <p><strong>Android.</strong> Open the emulator’s save folder (often under the game’s name, or in Android/data) and choose the .sav. Copy it to Downloads if the picker cannot see that folder.</p>
              <p><strong>iPhone.</strong> Open the Files app, then On My iPhone, and look in the emulator’s folder for a file ending in .sav. If it is not there, use the emulator’s export or share button and choose Save to Files, then pick that file here. This works in Safari and in the home-screen app. Every file is listed, because iOS hides .sav when a page asks only for known types.</p>
            </div>
            <div className="import-actions">
              <SaveFileControl inputLabel="Unbound save file" controlClass="btn btn-primary" disabled={busy} onFile={(file) => void onFile(file)}>
                <Upload size={18} aria-hidden="true" />
                {busy ? 'Reading…' : 'Choose a save file'}
              </SaveFileControl>
              {app.demo && (
                <button className="btn" type="button" disabled={busy} data-sample="true" onClick={() => void onSample()}>
                  Use the sample save
                </button>
              )}
            </div>
          </>
        )}
        {error && <p className="import-error" role="alert">{error}</p>}
        {plan && save && (
          <>
            <button className="text-btn" type="button" onClick={() => { setSave(null); setError('') }}>Choose another file</button>
            <p className="import-summary">
              <strong>{save.trainer.name || 'Trainer'}</strong>
              {' · '}Pokédex caught {save.dex.caughtCount}
              {' · '}party {partyCount}
              {' · '}boxed {plan.mons.length - partyCount}
              {' · '}{fromSave.length} with a route
              {' · '}{needsRoute.length} need a route
            </p>
            <p className="import-help">
              Nothing is written until you import. This logs only your side. Party Pokémon join the team until it is full. Box Pokémon are logged as boxed.
              The route is the met location stored on the Pokémon. The first catch on a route is kept. A later one is marked and skipped.
              Shiny is a guess. Box levels are worked out from EXP. A mint would not show.
              {!save.checksumsOk && ' One save slot failed its checksum, so this is the other slot.'}
            </p>
            {previous.length === 0 && <p className="import-help">No earlier import is stored on this phone, so every species counts as new.</p>}
            {options.randomizerSpecies && <p className="import-help">Species randomizer is on, so encounter lists are not used to guess a route.</p>}
            <ImportGroup title="From the save" empty="No route was read from the save yet." group="route">
              {fromSave.map((mon) => (
                <MonRow key={mon.id} {...rowProps(mon)} />
              ))}
            </ImportGroup>
            <ImportGroup title="Needs a route" empty="Every Pokémon has a route." group="needs-route">
              {needsRoute.map((mon) => (
                <MonRow key={mon.id} {...rowProps(mon)} />
              ))}
            </ImportGroup>
            <ImportGroup title="Trades, gifts, and events" empty="No trades, gifts, or events." group="special">
              {special.map((mon) => (
                <MonRow key={mon.id} {...rowProps(mon)} />
              ))}
            </ImportGroup>
            {(plan.skippedEggs > 0 || plan.skippedUnknown > 0) && (
              <p className="import-help">{plan.skippedEggs + plan.skippedUnknown} Pokémon skipped (eggs or unknown species).</p>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function readFileFallback(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (result instanceof ArrayBuffer) resolve(new Uint8Array(result))
      else reject(new Error('unreadable'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('unreadable'))
    reader.readAsArrayBuffer(file)
  })
}

function occupies(catches: { player: string; route: string; pokemon: string | null; status: string }[], me: string, route: string): boolean {
  return catches.some((row) => row.player === me && row.route === route && row.pokemon && row.status !== 'missed')
}

function groupRoutes() {
  const groups = new Map<string, { name: string; en: string }[]>()
  for (const route of ROUTES) {
    const list = groups.get(route.group) ?? []
    list.push({ name: route.name, en: route.en })
    groups.set(route.group, list)
  }
  return [...groups.entries()]
}

function ImportGroup({ title, empty, group, children }: { title: string; empty: string; group: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  return (
    <section className="import-block" data-import-group={group}>
      <h3>{title}</h3>
      {items.length === 0 ? <p className="import-help">{empty}</p> : children}
    </section>
  )
}

function routeTitle(key: string): string {
  return ROUTES.find((route) => route.name === key)?.en ?? key
}

function placeCopy(mon: PlannedMon): string {
  const where = mon.metLevel > 0
    ? `map section ${mon.metLocation}, met at Lv ${mon.metLevel}`
    : `map section ${mon.metLocation}`
  if (mon.duplicate) {
    return mon.duplicateOf
      ? `${mon.duplicateOf} is already the catch on this route, so this one is not added.`
      : 'This route already has a catch, so this one is not added.'
  }
  if (mon.place === 'trade') return `Caught by another trainer (${where}). Not added automatically.`
  if (mon.place === 'gift' || mon.place === 'event') {
    const label = mon.placeLabel ?? (mon.place === 'gift' ? 'Gift' : 'Event')
    return `${label} (${where}). Not added automatically.`
  }
  if (mon.place === 'route') return `Route from the save (${where}).`
  if (mon.ambiguous.length > 0) return `This place could be ${mon.ambiguous.map(routeTitle).join(' or ')}. Choose one.`
  if (mon.suggestion === 'area') return 'An encounter list names this place. That is a hint, not the save, so it is not imported automatically.'
  if (!mon.metLocation) return 'No met location was stored. Choose the route.'
  return `Map section ${mon.metLocation} is not in the route table yet. Choose the route.`
}

function MonRow({
  mon,
  route,
  groups,
  catches,
  me,
  clause,
  busy,
  onRoute,
  onAdd,
}: {
  mon: PlannedMon
  route: string
  groups: [string, { name: string; en: string }[]][]
  catches: { player: 'fisi' | 'seri'; route: string; pokemon: string | null; status: string; dex_id: number | null }[]
  me: 'fisi' | 'seri'
  clause: 'off' | 'player' | 'both'
  busy: boolean
  onRoute: (route: string) => void
  onAdd: () => void
}) {
  const partner = route ? catches.find((row) => row.player !== me && row.route === route && row.pokemon && row.status !== 'missed') : undefined
  const clauseHit = clause === 'off' || !route ? undefined : catches.find((row) => {
    if (row.dex_id !== mon.nat || row.status === 'missed' || row.status === 'dead') return false
    if (row.player === me && row.route === route) return false
    if (clause === 'player') return row.player === me
    return true
  })
  const level = mon.level == null
    ? 'Level unknown'
    : mon.levelSource === 'exp-derived'
      ? `Lv ${mon.level} · worked out from EXP`
      : `Lv ${mon.level} · from the save`
  const manual = mon.place !== 'route' && !mon.duplicate
  return (
    <article
      className="import-mon"
      data-mon={mon.name}
      data-place={mon.place}
      data-duplicate={mon.duplicate ? 'true' : 'false'}
      data-met={mon.metLocation}
      data-logged={mon.alreadyLogged ? 'true' : 'false'}
      data-new={mon.newSinceImport ? 'true' : 'false'}
    >
      <div className="import-top">
        <span>
          <b>{mon.name}</b>
          {mon.nickname ? <span className="s"> “{mon.nickname}”</span> : null}
          <span className="s"> · {level} · {mon.nature} · {mon.where === 'party' ? 'Party' : `Box ${(mon.boxIndex ?? 0) + 1}`}</span>
        </span>
      </div>
      <div className="import-flags">
        {mon.duplicate && <span className="import-pill">Duplicate</span>}
        {mon.alreadyLogged && <span className="import-pill">On this run</span>}
        {mon.newSinceImport && <span className="import-pill new">New since last import</span>}
        {mon.shiny && <span className="import-pill">Maybe shiny (guess, xor {mon.shinyXor})</span>}
      </div>
      <p className="import-meta">Nature is from personality. A mint would not show.</p>
      {mon.formNote && <p className="import-meta">{mon.formNote}</p>}
      <label className="import-route">
        Route
        <select aria-label={`Route for ${mon.name}`} value={route} disabled={mon.duplicate} onChange={(event) => onRoute(event.target.value)}>
          <option value="">Choose a route</option>
          {groups.map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((item) => <option key={item.name} value={item.name}>{item.en}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="import-meta">{placeCopy(mon)}</p>
      {partner && !mon.duplicate && <p className="import-meta">{PLAYERS[otherPlayer(me)].name} already has a catch here. Adding yours links the pair.</p>}
      {clauseHit && <p className="import-meta">Species clause: {PLAYERS[clauseHit.player].name} already logged this species. You can still add it.</p>}
      {manual && (
        <button className="btn btn-sm" type="button" disabled={busy || !route} onClick={onAdd}>
          Add this one
        </button>
      )}
    </article>
  )
}
