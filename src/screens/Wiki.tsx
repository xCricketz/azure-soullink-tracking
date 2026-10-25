import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, SpritePlate, TypePills } from '../components/ui'
import { NATURES, STAT_EN } from '../data/natures'
import { abilityText, loadAbilityText } from '../lib/abilities'
import { loadWiki, peekWiki, type EvoNode, type WikiMon } from '../lib/pokeapi'
import { optionsOf } from '../lib/options'
import { norm } from '../lib/text'
import {
  evoUnconfirmed,
  evolutionsFor,
  findByEvoName,
  findMon,
  loadEvolutions,
  monLabel,
  parseDexKey,
  useDex,
  wikiUrl,
  type UEvo,
  type UMon,
} from '../lib/unbound'
import { useApp } from '../state/context'

const DISCLAIMER = 'Main-series data – Unbound stats and abilities may differ'
const ROW = 64
const OVERSCAN = 6

export function WikiHome({ onOpen }: { onOpen: (id: string) => void }) {
  const app = useApp()
  const dex = useDex()
  const [query, setQuery] = useState('')
  const cleaned = query.trim().replace(/^#/, '')
  const items = useMemo(() => {
    const ordered = orderDex(dex ?? [], app.settings.dexOrder, app.settings.showGen8)
    const needle = norm(cleaned)
    if (!needle) return ordered
    const numeric = /^\d+$/.test(cleaned)
    return ordered.filter((mon) => {
      if (numeric) {
        const nums = [String(mon.nat), mon.borrius ? String(mon.borrius) : '']
        return nums.some((num) => num === cleaned || num.padStart(3, '0').startsWith(cleaned))
      }
      return norm(monLabel(mon)).includes(needle)
    })
  }, [app.settings.dexOrder, app.settings.showGen8, cleaned, dex])

  return (
    <div className="screen wiki" data-screen="wiki">
      <div className="dex-tools">
        <div className="seg dex-order" role="group" aria-label="Dex order">
          <button
            type="button"
            className={app.settings.dexOrder === 'borrius' ? 'on' : ''}
            aria-pressed={app.settings.dexOrder === 'borrius'}
            onClick={() => app.updateSettings({ dexOrder: 'borrius' })}
          >
            Borrius
          </button>
          <button
            type="button"
            className={app.settings.dexOrder === 'national' ? 'on' : ''}
            aria-pressed={app.settings.dexOrder === 'national'}
            onClick={() => app.updateSettings({ dexOrder: 'national' })}
          >
            National
          </button>
        </div>
        <label className="switch dex-gen8">
          <input
            type="checkbox"
            checked={app.settings.showGen8}
            onChange={(event) => app.updateSettings({ showGen8: event.target.checked })}
          />
          <span>Show Gen 8 content (post-game)</span>
        </label>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or number"
          aria-label="Search Pokémon"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <details className="wiki-fold">
          <summary>Natures</summary>
          <div className="fold-body">
            <ul className="natures">
              {NATURES.map((nature) => (
                <li key={nature.name} className="nature">
                  <b>{nature.name}</b>
                  {nature.up && nature.down ? (
                    <span>
                      <span className="up">{STAT_EN[nature.up]} +</span>
                      <span className="down">{STAT_EN[nature.down]} −</span>
                    </span>
                  ) : (
                    <span className="neutral">neutral</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
        <p className="wiki-hint">
          {dex ? `${items.length} shown` : 'Loading the dex…'}
          {app.settings.showGen8 ? '' : ' · Gen 8 post-game hidden'}
          {' · '}
          {DISCLAIMER}
        </p>
      </div>
      <DexList items={items} order={app.settings.dexOrder} dex={dex} onOpen={onOpen} loading={!dex} />
    </div>
  )
}

function orderDex(list: UMon[], order: 'borrius' | 'national', gen8: boolean): UMon[] {
  const pool = gen8 ? list : list.filter((mon) => !mon.gen8)
  const byForm = (a: UMon, b: UMon) => (a.form ? 1 : 0) - (b.form ? 1 : 0) || (a.form ?? '').localeCompare(b.form ?? '')
  if (order === 'national') return [...pool].sort((a, b) => a.nat - b.nat || byForm(a, b))
  const regional = pool.filter((mon) => mon.borrius != null).sort((a, b) => (a.borrius ?? 0) - (b.borrius ?? 0) || byForm(a, b))
  const bases = new Set(regional.filter((mon) => !mon.form).map((mon) => mon.nat))
  const extras = pool.filter((mon) => mon.form && mon.borrius == null && bases.has(mon.nat))
  const out: UMon[] = []
  for (const mon of regional) {
    out.push(mon)
    if (!mon.form) extras.filter((form) => form.nat === mon.nat).forEach((form) => out.push(form))
  }
  return out
}

function displayNo(mon: UMon, order: 'borrius' | 'national', dex: UMon[] | null): number {
  if (order === 'national') return mon.nat
  if (mon.borrius) return mon.borrius
  return findMon(dex, mon.nat, null)?.borrius ?? mon.nat
}

function DexList({
  items,
  order,
  dex,
  onOpen,
  loading,
}: {
  items: UMon[]
  order: 'borrius' | 'national'
  dex: UMon[] | null
  onOpen: (id: string) => void
  loading: boolean
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({ start: 0, end: 18 })

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => {
      const start = Math.max(0, Math.floor(el.scrollTop / ROW) - OVERSCAN)
      const end = Math.min(items.length, Math.ceil((el.scrollTop + el.clientHeight) / ROW) + OVERSCAN)
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    el.scrollTop = 0
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      obs.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [items])

  const slice = items.slice(range.start, range.end)

  return (
    <div className="dex-scroll" ref={scroller} data-count={items.length} data-virtual="1">
      {loading ? (
        <p className="hint">Loading the dex…</p>
      ) : items.length === 0 ? (
        <p className="hint">No Pokémon matches.</p>
      ) : (
        <div className="dex-spacer" style={{ height: items.length * ROW }}>
          {slice.map((entry, index) => (
            <button
              key={entry.key}
              className="dex-row"
              type="button"
              style={{ top: (range.start + index) * ROW }}
              onClick={() => onOpen(entry.key)}
            >
              <span className="dex-no">#{String(displayNo(entry, order, dex)).padStart(3, '0')}</span>
              <SpritePlate id={entry.nat} alt="" size="sm" types={entry.types} />
              <span className="dex-name"><b>{monLabel(entry)}</b></span>
              <TypePills names={entry.types} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function WikiDetail({ id, onOpen, onClose }: { id: string; onOpen: (id: string) => void; onClose: () => void }) {
  const app = useApp()
  const dex = useDex()
  const parsed = parseDexKey(id)
  const local = findMon(dex, parsed.nat, parsed.form)
  const scroller = useRef<HTMLDivElement>(null)
  const [mon, setMon] = useState<WikiMon | null>(() => peekWiki(parsed.nat))
  const [error, setError] = useState('')
  const [ability, setAbility] = useState<{ name: string; hidden: boolean } | null>(null)
  const [blurb, setBlurb] = useState('')
  const [evos, setEvos] = useState<UEvo[]>([])
  const name = local ? monLabel(local) : mon?.name ?? `#${parsed.nat}`

  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    setAbility(null)
  }, [id])

  useEffect(() => {
    if (!ability) return
    setBlurb(abilityText(ability.name))
    let live = true
    void loadAbilityText(ability.name).then((text) => {
      if (live) setBlurb(text)
    })
    return () => {
      live = false
    }
  }, [ability])

  useEffect(() => {
    let live = true
    setMon(peekWiki(parsed.nat))
    setError('')
    if (parsed.nat < 1 || parsed.nat > 1025) return
    void loadWiki(parsed.nat).then(
      (value) => { if (live) setMon(value) },
      () => {
        if (!live) return
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false
        setError(offline ? 'Offline – this card hasn’t been saved yet.' : 'PokeAPI is unreachable right now.')
      },
    )
    return () => { live = false }
  }, [parsed.nat])

  useEffect(() => {
    if (!local) return
    let live = true
    void loadEvolutions().then((list) => {
      if (live) setEvos(evolutionsFor(list, local))
    })
    return () => { live = false }
  }, [local])

  return (
    <div className="wiki-layer" ref={scroller} data-screen="wiki-detail" data-wiki-id={id}>
      <button className="btn btn-ghost btn-sm wiki-back" type="button" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" /> Back
      </button>
      {parsed.nat < 1 ? (
        <p className="hint">That Pokédex entry isn’t in the list.</p>
      ) : (
        <article className="wiki-card">
          <div className="wiki-hero">
            <SpritePlate id={parsed.nat} alt={name} size="lg" types={local?.types} />
            <div>
              <h2>{name}</h2>
              <p className="wiki-no">National #{String(parsed.nat).padStart(3, '0')}{local?.borrius ? ` · Borrius #${String(local.borrius).padStart(3, '0')}` : ''}</p>
              <TypePills names={local?.types} />
            </div>
          </div>
          {local?.gen8 && <p className="wiki-hint">Post-game · Gen 8</p>}
          {local && (
            <>
              <h3 className="wiki-sec">How to get</h3>
              {optionsOf(app.run).randomizerSpecies ? (
                <p className="how-note">Species randomizer is on, so this note does not predict what you will find. The area name is still useful. The species list is not.</p>
              ) : (
                <p className="how-note">{local.how}</p>
              )}
              {local.note && <p className="hint">{local.note}</p>}
              <h3 className="wiki-sec">Evolution in Unbound</h3>
              {evos.length === 0 ? (
                <p className="hint">No Unbound-specific evolution change on file.</p>
              ) : (
                <ul className="evo unbound-evo">
                  {evos.map((evo) => {
                    const target = evo.species === local.name || evo.species === `${local.form ?? ''} ${local.name}`.trim()
                      ? evo.evolves_to
                      : evo.species
                    const linked = findByEvoName(dex, target)
                    const quiet = evoUnconfirmed(evo)
                    return (
                      <li key={`${evo.species}-${evo.evolves_to}-${evo.method}`} className={quiet ? 'evo-unconfirmed' : ''} data-unbound-evo={evo.evolves_to}>
                        <span className="evo-how">
                          {evo.species} → {evo.evolves_to}. {evo.method}
                          {quiet && <span className="evo-flag">unconfirmed</span>}
                        </span>
                        {linked && (
                          <button type="button" onClick={() => onOpen(linked.key)}>{monLabel(linked)}</button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
          <p className="wiki-hint">{DISCLAIMER}</p>
          {error && !mon && <p className="hint" role="status">{error}</p>}
          {!mon && !error && <p className="hint">Loading stats…</p>}
          {mon && (
            <>
              <h3 className="wiki-sec">Base stats</h3>
              <div className="stats-col">
                {mon.stats.map((stat) => (
                  <div key={stat.label} className="stat">
                    <span>{stat.label}</span>
                    <span className="stat-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }} /></span>
                    <b>{stat.value}</b>
                  </div>
                ))}
              </div>
              <h3 className="wiki-sec">Abilities</h3>
              <ul className="ability-list">
                {mon.abilities.map((row) => (
                  <li key={`${row.name}-${row.hidden ? 'h' : 'n'}`}>
                    <button type="button" onClick={() => setAbility(row)}>
                      <span>{row.name}</span>
                      {row.hidden && <small>Hidden</small>}
                    </button>
                  </li>
                ))}
              </ul>
              <h3 className="wiki-sec">Main-series evolution</h3>
              {mon.chain.to.length === 0 && mon.chain.id === parsed.nat ? (
                <p className="hint">Does not evolve in the main series.</p>
              ) : (
                <ul className="evo">
                  <EvoBranch node={mon.chain} current={parsed.nat} onOpen={onOpen} />
                </ul>
              )}
            </>
          )}
          {local && (
            <a className="btn btn-primary wiki-out" href={wikiUrl(local)} target="_blank" rel="noopener noreferrer">
              Open on the Unbound Wiki <ExternalLink size={18} aria-hidden="true" />
            </a>
          )}
        </article>
      )}
      <BottomSheet open={ability !== null} title={ability?.name ?? 'Ability'} onClose={() => setAbility(null)}>
        {ability?.hidden && <p className="hint">Hidden</p>}
        <p className="ability-copy" data-ability-text>{blurb}</p>
      </BottomSheet>
    </div>
  )
}

function EvoBranch({ node, current, onOpen }: { node: EvoNode; current: number; onOpen: (id: string) => void }) {
  const blocked = node.id < 1 || node.id > 1025
  return (
    <li>
      {node.method && <span className="evo-how">{node.method}</span>}
      <button
        type="button"
        className={node.id === current ? 'on' : ''}
        disabled={blocked}
        onClick={() => onOpen(String(node.id))}
      >
        {node.name}
      </button>
      {node.to.length > 0 && (
        <ul>
          {node.to.map((child) => (
            <EvoBranch key={`${child.id}-${child.method}`} node={child} current={current} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  )
}
