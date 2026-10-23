import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomSheet, SpritePlate, TypePills, typeStyle } from '../components/ui'
import { NATURES, STAT_EN } from '../data/natures'
import {
  GEN4_TYPES,
  TYPE_NAME,
  TYPE_SHORT,
  asGen4,
  attackMultiplier,
  defenseProfile,
  formatMult,
  gen4TypeNames,
  type Gen4Type,
} from '../data/typechart'
import listData from '../data/wiki-list.json'
import { abilityText, loadAbilityText } from '../lib/abilities'
import { monById } from '../lib/dex'
import { loadWiki, peekWiki, type EvoNode, type WikiMon } from '../lib/pokeapi'
import { norm } from '../lib/text'

const VANILLA = 'Vanilla data – Azure Platinum may differ'
const MAX_ID = 493
const ROW = 64
const OVERSCAN = 6

interface DexEntry {
  id: number
  name: string
  types: string[]
}

const LIST = listData as DexEntry[]
const BY_ID = new Map(LIST.map((entry) => [entry.id, entry]))

export function bulbapediaUrl(name: string): string {
  const slug = name
    .replace(/ /g, '_')
    .replace(/♀/g, '%E2%99%80')
    .replace(/♂/g, '%E2%99%82')
    .replace(/'/g, '%27')
  return `https://bulbapedia.bulbagarden.net/wiki/${slug}_(Pok%C3%A9mon)`
}

export function WikiHome({ onOpen }: { onOpen: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string | null>(null)
  const cleaned = query.trim().replace(/^#/, '')
  const numeric = /^\d+$/.test(cleaned)
  const items = useMemo(() => {
    const needle = norm(cleaned)
    return LIST.filter((entry) => {
      if (type && !entry.types.includes(type)) return false
      if (!needle) return true
      if (numeric) return String(entry.id).padStart(3, '0').startsWith(cleaned)
      return norm(entry.name).includes(needle)
    })
  }, [cleaned, numeric, type])

  return (
    <div className="screen wiki" data-screen="wiki">
      <div className="dex-tools">
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
        <div className="dex-chips" role="toolbar" aria-label="Filter by type">
          <button type="button" className={type === null ? 'on' : ''} aria-pressed={type === null} onClick={() => setType(null)}>All</button>
          {GEN4_TYPES.map((slug) => (
            <button
              key={slug}
              type="button"
              className={type === TYPE_NAME[slug] ? 'on' : ''}
              aria-pressed={type === TYPE_NAME[slug]}
              onClick={() => setType((current) => (current === TYPE_NAME[slug] ? null : TYPE_NAME[slug]))}
            >
              {TYPE_NAME[slug]}
            </button>
          ))}
        </div>
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
        <details className="wiki-fold">
          <summary>Type chart · Gen IV</summary>
          <div className="fold-body">
            <div className="chart-scroll">
              <table className="typechart" aria-label="Type chart, Generation IV. Row attacks, column defends.">
                <thead>
                  <tr>
                    <th />
                    {GEN4_TYPES.map((slug) => (
                      <th key={slug} style={{ background: `var(--t-${slug})` }} title={TYPE_NAME[slug]}>{TYPE_SHORT[slug]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GEN4_TYPES.map((attack) => (
                    <tr key={attack}>
                      <th style={typeStyle(TYPE_NAME[attack])}>{TYPE_NAME[attack]}</th>
                      {GEN4_TYPES.map((defense) => {
                        const mult = attackMultiplier(attack, defense)
                        const kind = mult === 0 ? 'imm' : mult > 1 ? 'se' : mult < 1 ? 'nve' : ''
                        return <td key={defense} className={kind}>{mult === 1 ? '' : formatMult(mult)}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="wiki-hint">Row attacks, column defends. No Fairy type.</p>
          </div>
        </details>
        <p className="wiki-hint">{VANILLA}</p>
      </div>
      <DexList items={items} onOpen={onOpen} />
    </div>
  )
}

function DexList({ items, onOpen }: { items: DexEntry[]; onOpen: (id: number) => void }) {
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
      {items.length === 0 ? (
        <p className="hint">No Pokémon matches.</p>
      ) : (
        <div className="dex-spacer" style={{ height: items.length * ROW }}>
          {slice.map((entry, index) => (
            <button
              key={entry.id}
              className="dex-row"
              type="button"
              style={{ top: (range.start + index) * ROW }}
              onClick={() => onOpen(entry.id)}
            >
              <span className="dex-no">#{String(entry.id).padStart(3, '0')}</span>
              <SpritePlate id={entry.id} alt="" size="sm" />
              <span className="dex-name"><b>{entry.name}</b></span>
              <TypePills names={entry.types} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function WikiDetail({ id, onOpen, onClose }: { id: number; onOpen: (id: number) => void; onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [mon, setMon] = useState<WikiMon | null>(() => peekWiki(id))
  const [error, setError] = useState('')
  const [ability, setAbility] = useState<{ name: string; hidden: boolean } | null>(null)
  const [blurb, setBlurb] = useState('')
  const listed = BY_ID.get(id)
  const local = monById(id)
  const name = mon?.name ?? listed?.name ?? local?.en ?? `#${id}`
  const types = listed?.types?.length ? listed.types : gen4TypeNames(id)
  const slugs = types.map(asGen4).filter((type): type is Gen4Type => type !== null)
  const profile = defenseProfile(slugs)
  const weak = profile.filter((row) => row.mult > 1).sort((a, b) => b.mult - a.mult)
  const resist = profile.filter((row) => row.mult > 0 && row.mult < 1).sort((a, b) => a.mult - b.mult)
  const immune = profile.filter((row) => row.mult === 0)

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
    setMon(peekWiki(id))
    setError('')
    if (id < 1 || id > MAX_ID) return
    void loadWiki(id).then(
      (value) => { if (live) setMon(value) },
      () => {
        if (!live) return
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false
        setError(offline ? 'Offline – this card hasn’t been saved yet.' : 'PokeAPI is unreachable right now.')
      },
    )
    return () => { live = false }
  }, [id])

  return (
    <div className="wiki-layer" ref={scroller} data-screen="wiki-detail" data-wiki-id={id}>
      <button className="btn btn-ghost btn-sm wiki-back" type="button" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" /> Back
      </button>
      {id < 1 || id > MAX_ID ? (
        <p className="hint">Only Gen 1–4 (#1–493).</p>
      ) : (
        <article className="wiki-card">
          <div className="wiki-hero">
            <SpritePlate id={id} alt={name} size="lg" />
            <div>
              <h2>{name}</h2>
              <p className="wiki-no">#{String(id).padStart(3, '0')}</p>
              <TypePills names={types} />
            </div>
          </div>
          <p className="wiki-hint">{VANILLA}</p>
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
              <h3 className="wiki-sec">Evolution</h3>
              {mon.chain.to.length === 0 && mon.chain.id === id ? (
                <p className="hint">Does not evolve.</p>
              ) : (
                <ul className="evo">
                  <EvoBranch node={mon.chain} current={id} onOpen={onOpen} />
                </ul>
              )}
            </>
          )}
          <h3 className="wiki-sec">Defensive · Gen IV</h3>
          <Matchup label="Weak to" rows={weak} empty="No weakness." />
          <Matchup label="Resists" rows={resist} empty="No resistance." />
          <Matchup label="Immune" rows={immune} empty="No immunity." />
          <a className="btn btn-primary wiki-out" href={bulbapediaUrl(name)} target="_blank" rel="noopener noreferrer">
            Open on Bulbapedia <ExternalLink size={18} aria-hidden="true" />
          </a>
        </article>
      )}
      <BottomSheet open={ability !== null} title={ability?.name ?? 'Ability'} onClose={() => setAbility(null)}>
        {ability?.hidden && <p className="hint">Hidden</p>}
        <p className="ability-copy" data-ability-text>{blurb}</p>
      </BottomSheet>
    </div>
  )
}

function Matchup({ label, rows, empty }: { label: string; rows: { type: Gen4Type; mult: number }[]; empty: string }) {
  return (
    <section className="matchup">
      <h4>{label}</h4>
      {rows.length === 0 ? <p className="hint">{empty}</p> : (
        <div className="match-row">
          {rows.map((row) => (
            <span key={row.type} className="match-chip" style={typeStyle(TYPE_NAME[row.type])}>
              <i aria-hidden="true" />
              {TYPE_NAME[row.type]}
              <b>×{formatMult(row.mult)}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function EvoBranch({ node, current, onOpen }: { node: EvoNode; current: number; onOpen: (id: number) => void }) {
  const blocked = node.id < 1 || node.id > MAX_ID
  return (
    <li>
      {node.method && <span className="evo-how">{node.method}</span>}
      <button
        type="button"
        className={node.id === current ? 'on' : ''}
        disabled={blocked}
        onClick={() => onOpen(node.id)}
      >
        {node.name}
        {blocked && <small> later gen</small>}
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
