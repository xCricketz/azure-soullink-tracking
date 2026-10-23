import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SpritePlate, TypePills, typeStyle } from '../components/ui'
import { NATURES, STAT_DE } from '../data/natures'
import {
  GEN4_TYPES,
  TYPE_DE,
  TYPE_SHORT,
  asGen4,
  attackMultiplier,
  defenseProfile,
  formatMult,
  gen4TypeNames,
  type Gen4Type,
} from '../data/typechart'
import { monById, searchMons } from '../lib/dex'
import { loadWiki, peekWiki, type EvoNode, type WikiMon } from '../lib/pokeapi'

const VANILLA = 'Vanilla-Daten – in Azure Platinum können Details abweichen'
const MAX_ID = 493

export function WikiHome({ onOpen }: { onOpen: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const cleaned = query.trim().replace(/^#/, '')
  const lookup = /^\d+$/.test(cleaned) ? String(Number(cleaned)) : cleaned
  const numeric = /^\d+$/.test(cleaned) ? Number(cleaned) : NaN
  const outOfRange = Number.isFinite(numeric) && numeric > MAX_ID
  const results = useMemo(() => (lookup && !outOfRange ? searchMons(lookup, 8, MAX_ID) : []), [lookup, outOfRange])

  return (
    <div className="screen wiki" data-screen="wiki">
      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Deutscher Name oder Nummer"
        aria-label="Pokémon suchen"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <p className="wiki-hint">{VANILLA}</p>
      {outOfRange && <p className="hint">Nur Gen. 1–4 (#1–493).</p>}
      {!outOfRange && lookup && results.length === 0 && <p className="hint">Nichts gefunden.</p>}
      {results.length > 0 && (
        <div className="wiki-list" role="listbox" aria-label="Vorschläge">
          {results.map((mon) => (
            <button key={mon.id} className="wiki-row" type="button" role="option" onClick={() => onOpen(mon.id)}>
              <SpritePlate id={mon.id} alt="" size="sm" />
              <span>
                <b>{mon.de}</b>
                <small>#{mon.id}</small>
              </span>
              <TypePills names={gen4TypeNames(mon.id)} />
            </button>
          ))}
        </div>
      )}
      {!lookup && (
        <>
          <details className="wiki-fold">
            <summary>Wesen</summary>
            <div className="fold-body">
              <ul className="natures">
                {NATURES.map((nature) => (
                  <li key={nature.name} className="nature">
                    <b>{nature.name}</b>
                    {nature.up && nature.down ? (
                      <span>
                        <span className="up">{STAT_DE[nature.up]} +</span>
                        <span className="down">{STAT_DE[nature.down]} −</span>
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
            <summary>Typentabelle · Gen. IV</summary>
            <div className="fold-body">
              <div className="chart-scroll">
                <table className="typechart" aria-label="Typentabelle Generation 4. Zeile greift an, Spalte verteidigt.">
                  <thead>
                    <tr>
                      <th />
                      {GEN4_TYPES.map((type) => (
                        <th key={type} style={{ background: `var(--t-${type})` }} title={TYPE_DE[type]}>{TYPE_SHORT[type]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GEN4_TYPES.map((attack) => (
                      <tr key={attack}>
                        <th style={typeStyle(TYPE_DE[attack])}>{TYPE_DE[attack]}</th>
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
              <p className="wiki-hint">Zeile greift an, Spalte verteidigt. Kein Feen-Typ.</p>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

export function WikiDetail({ id, onOpen, onClose }: { id: number; onOpen: (id: number) => void; onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [mon, setMon] = useState<WikiMon | null>(() => peekWiki(id))
  const [error, setError] = useState('')
  const local = monById(id)
  const name = mon?.name ?? local?.de ?? `#${id}`
  const types = gen4TypeNames(id)
  const slugs = types.map(asGen4).filter((type): type is Gen4Type => type !== null)
  const profile = defenseProfile(slugs)
  const weak = profile.filter((row) => row.mult > 1).sort((a, b) => b.mult - a.mult)
  const resist = profile.filter((row) => row.mult > 0 && row.mult < 1).sort((a, b) => a.mult - b.mult)
  const immune = profile.filter((row) => row.mult === 0)

  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [id])

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
        setError(offline ? 'Offline – diese Karte ist noch nicht gespeichert.' : 'PokeAPI gerade nicht erreichbar.')
      },
    )
    return () => { live = false }
  }, [id])

  const href = `https://www.pokewiki.de/${encodeURIComponent(name)}`

  return (
    <div className="wiki-layer" ref={scroller} data-screen="wiki-detail" data-wiki-id={id}>
      <button className="btn btn-ghost btn-sm wiki-back" type="button" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" /> Zurück
      </button>
      {id < 1 || id > MAX_ID ? (
        <p className="hint">Nur Gen. 1–4 (#1–493).</p>
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
          {!mon && !error && <p className="hint">Lade Werte…</p>}
          {mon && (
            <>
              <h3 className="wiki-sec">Basiswerte</h3>
              <div className="stats-col">
                {mon.stats.map((stat) => (
                  <div key={stat.label} className="stat">
                    <span>{stat.label}</span>
                    <span className="stat-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }} /></span>
                    <b>{stat.value}</b>
                  </div>
                ))}
              </div>
              <h3 className="wiki-sec">Fähigkeiten</h3>
              <ul className="ability-list">
                {mon.abilities.map((ability) => (
                  <li key={`${ability.name}-${ability.hidden ? 'h' : 'n'}`}>
                    {ability.name}
                    {ability.hidden && <small>versteckt</small>}
                  </li>
                ))}
              </ul>
              <h3 className="wiki-sec">Entwicklung</h3>
              {mon.chain.to.length === 0 && mon.chain.id === id ? (
                <p className="hint">Keine Entwicklung.</p>
              ) : (
                <ul className="evo">
                  <EvoBranch node={mon.chain} current={id} onOpen={onOpen} />
                </ul>
              )}
            </>
          )}
          <h3 className="wiki-sec">Defensiv · Gen. IV</h3>
          <Matchup label="Schwach" rows={weak} empty="Keine Schwäche." />
          <Matchup label="Resistent" rows={resist} empty="Keine Resistenz." />
          <Matchup label="Immun" rows={immune} empty="Keine Immunität." />
          <a className="btn btn-primary wiki-out" href={href} target="_blank" rel="noopener noreferrer">
            Im PokéWiki öffnen <ExternalLink size={18} aria-hidden="true" />
          </a>
        </article>
      )}
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
            <span key={row.type} className="match-chip" style={typeStyle(TYPE_DE[row.type])}>
              <i aria-hidden="true" />
              {TYPE_DE[row.type]}
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
        {blocked && <small> spätere Gen.</small>}
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
