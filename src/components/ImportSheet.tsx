import { Check, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ROUTES } from '../data/routes'
import { loadAreas } from '../lib/unbound'
import { optionsOf } from '../lib/options'
import { readImportedNats, writeImportedNats } from '../lib/save/memory'
import { planSave, routeClash, type AreaHint, type PlannedMon } from '../lib/save/plan'
import type { ParsedSave } from '../lib/save/unbound-save'
import { pushToast } from '../lib/toast'
import { PLAYERS, otherPlayer, type CatchDraft } from '../lib/types'
import { useApp } from '../state/context'
import { BottomSheet } from './ui'

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [save, setSave] = useState<ParsedSave | null>(null)
  const [areas, setAreas] = useState<AreaHint[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)
  const [routes, setRoutes] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState<string[]>([])
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
    setSave(null)
    setError('')
    setBusy(false)
    setDenied(false)
    setRoutes({})
    setPicked([])
    seededFor.current = null
    setAreasReady(false)
    void loadAreas().then((map) => {
      setAreas([...map.values()].map((area) => ({
        key: area.key,
        species: [...area.wild, ...area.special].map((row) => row.species),
      })))
    }).finally(() => setAreasReady(true))
  }, [open])

  useEffect(() => {
    if (!plan || !save || !areasReady || seededFor.current === save) return
    seededFor.current = save
    const nextRoutes: Record<string, string> = {}
    const nextPicked: string[] = []
    const used = new Set<string>()
    for (const mon of plan.mons) {
      nextRoutes[mon.id] = mon.suggestedRoute
      if (!mon.alreadyLogged && !used.has(mon.suggestedRoute)) {
        nextPicked.push(mon.id)
        used.add(mon.suggestedRoute)
      }
    }
    setRoutes(nextRoutes)
    setPicked(nextPicked)
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
    if (fileRef.current) fileRef.current.value = ''
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
    if (!ids.length) {
      pushToast('Select at least one Pokémon.')
      return
    }
    if (routeClash(ids, routes)) {
      pushToast('Two Pokémon are on the same route. A route holds one catch.')
      return
    }
    setBusy(true)
    setDenied(false)
    const byId = new Map(plan.mons.map((mon) => [mon.id, mon]))
    for (const id of ids) {
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

  const selected = plan ? picked.filter((id) => plan.mons.some((mon) => mon.id === id)) : []
  const groups = groupRoutes()
  const party = plan?.mons.filter((mon) => mon.where === 'party') ?? []
  const boxes = new Map<number, PlannedMon[]>()
  for (const mon of plan?.mons ?? []) {
    if (mon.where !== 'box' || mon.boxIndex == null) continue
    const list = boxes.get(mon.boxIndex) ?? []
    list.push(mon)
    boxes.set(mon.boxIndex, list)
  }
  const boxEntries = [...boxes.entries()]
  const emptyBoxes = save ? save.boxes.length - boxEntries.length : 0
  const replacing = selected.some((id) => {
    const mon = plan?.mons.find((item) => item.id === id)
    return mon ? occupies(app.catches, app.me, routes[id]) : false
  })

  return (
    <BottomSheet
      open={open}
      title="Import save"
      onClose={onClose}
      footer={plan ? (
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void confirm(selected)}>
          <Check size={18} aria-hidden="true" />
          {busy ? 'Adding…' : `Add selected (${selected.length})`}
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
              <label className="btn btn-primary file-btn">
                <Upload size={18} aria-hidden="true" />
                {busy ? 'Reading…' : 'Choose a save file'}
                <input
                  ref={fileRef}
                  type="file"
                  aria-label="Unbound save file"
                  disabled={busy}
                  onChange={(event) => void onFile(event.target.files?.[0])}
                />
              </label>
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
              {' · '}party {party.length}
              {' · '}boxed {plan.mons.length - party.length}
            </p>
            <p className="import-help">
              Nothing is written until you add it. This logs only your side. Party Pokémon join the team until it is full. Box Pokémon are logged as boxed.
              Shiny is a guess. Box levels are worked out from EXP. A mint would not show.
              {!save.checksumsOk && ' One save slot failed its checksum, so this is the other slot.'}
            </p>
            {previous.length === 0 && <p className="import-help">No earlier import is stored on this phone, so every species counts as new.</p>}
            {options.randomizerSpecies && <p className="import-help">Species randomizer is on. Suggestions follow your progress and do not use encounter lists.</p>}
            <section className="import-block">
              <h3>Party</h3>
              {party.length === 0 && <p className="import-help">No party Pokémon.</p>}
              {party.map((mon) => (
                <MonRow
                  key={mon.id}
                  mon={mon}
                  route={routes[mon.id] ?? mon.suggestedRoute}
                  checked={picked.includes(mon.id)}
                  groups={groups}
                  catches={app.catches}
                  me={app.me}
                  clause={options.speciesClause}
                  busy={busy}
                  onRoute={(value) => setRoutes((current) => ({ ...current, [mon.id]: value }))}
                  onToggle={(on) => setPicked((current) => on ? [...current, mon.id] : current.filter((id) => id !== mon.id))}
                  onAdd={() => void confirm([mon.id])}
                />
              ))}
            </section>
            {boxEntries.map(([index, mons], order) => (
              <details key={index} className="import-box" open={order === 0}>
                <summary>Box {index + 1}{mons[0]?.boxName ? ` · ${mons[0].boxName}` : ''} · {mons.length}</summary>
                {mons.map((mon) => (
                  <MonRow
                    key={mon.id}
                    mon={mon}
                    route={routes[mon.id] ?? mon.suggestedRoute}
                    checked={picked.includes(mon.id)}
                    groups={groups}
                    catches={app.catches}
                    me={app.me}
                    clause={options.speciesClause}
                    busy={busy}
                    onRoute={(value) => setRoutes((current) => ({ ...current, [mon.id]: value }))}
                    onToggle={(on) => setPicked((current) => on ? [...current, mon.id] : current.filter((id) => id !== mon.id))}
                    onAdd={() => void confirm([mon.id])}
                  />
                ))}
              </details>
            ))}
            {emptyBoxes > 0 && <p className="import-help">{emptyBoxes} empty {emptyBoxes === 1 ? 'box is' : 'boxes are'} hidden.</p>}
            {(plan.skippedEggs > 0 || plan.skippedUnknown > 0) && (
              <p className="import-help">{plan.skippedEggs + plan.skippedUnknown} Pokémon skipped (eggs or unknown species).</p>
            )}
            {replacing && <p className="import-help">Some selected routes already have your catch. Adding replaces those.</p>}
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

function MonRow({
  mon,
  route,
  checked,
  groups,
  catches,
  me,
  clause,
  busy,
  onRoute,
  onToggle,
  onAdd,
}: {
  mon: PlannedMon
  route: string
  checked: boolean
  groups: [string, { name: string; en: string }[]][]
  catches: { player: 'fisi' | 'seri'; route: string; pokemon: string | null; status: string; dex_id: number | null }[]
  me: 'fisi' | 'seri'
  clause: 'off' | 'player' | 'both'
  busy: boolean
  onRoute: (route: string) => void
  onToggle: (on: boolean) => void
  onAdd: () => void
}) {
  const mine = occupies(catches, me, route)
  const partner = catches.find((row) => row.player !== me && row.route === route && row.pokemon && row.status !== 'missed')
  const clauseHit = clause === 'off' ? undefined : catches.find((row) => {
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
  return (
    <article className="import-mon" data-mon={mon.name} data-logged={mon.alreadyLogged ? 'true' : 'false'} data-new={mon.newSinceImport ? 'true' : 'false'}>
      <label className="import-top">
        <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} aria-label={`Include ${mon.name}`} />
        <span>
          <b>{mon.name}</b>
          {mon.nickname ? <span className="s"> “{mon.nickname}”</span> : null}
          <span className="s"> · {level} · {mon.nature}</span>
        </span>
      </label>
      <div className="import-flags">
        {mon.alreadyLogged && <span className="import-pill">On this run</span>}
        {mon.newSinceImport && <span className="import-pill new">New since last import</span>}
        {mon.shiny && <span className="import-pill">Maybe shiny (guess, xor {mon.shinyXor})</span>}
      </div>
      <p className="import-meta">Nature is from personality. A mint would not show.</p>
      {mon.formNote && <p className="import-meta">{mon.formNote}</p>}
      <label className="import-route">
        Route
        <select aria-label={`Route for ${mon.name}`} value={route} onChange={(event) => onRoute(event.target.value)}>
          {groups.map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((item) => <option key={item.name} value={item.name}>{item.en}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="import-meta">
        {mon.suggestion === 'area' && route === mon.suggestedRoute
          ? 'Suggested because an area list names this place. That is not a prediction.'
          : 'Suggested from your progress.'}
      </p>
      {mine && <p className="import-meta">This route already has your catch. Adding replaces it.</p>}
      {partner && <p className="import-meta">{PLAYERS[otherPlayer(me)].name} already has a catch here. Adding yours links the pair.</p>}
      {clauseHit && <p className="import-meta">Species clause: {PLAYERS[clauseHit.player].name} already logged this species. You can still add it.</p>}
      <button className="btn btn-sm" type="button" disabled={busy} onClick={onAdd}>
        {mine ? 'Replace this one' : 'Add this one'}
      </button>
    </article>
  )
}
