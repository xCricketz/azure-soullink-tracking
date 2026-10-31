import { Archive, Ban, Heart, Minus, Plus, Search, Skull, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DifficultyPicker } from '../components/DifficultyPicker'
import { InstallHint } from '../components/InstallHint'
import { LinkCard } from '../components/LinkCard'
import { BottomSheet, cx, SpritePlate, StatusChip } from '../components/ui'
import { marksFor } from '../data/marks'
import { groupTitle, routeTitle } from '../data/routes'
import { suggestedCap } from '../lib/caps'
import { nextLeader } from '../lib/gym'
import { activeCap, capColumn, EXPERT_CAP_NOTE, optionsOf } from '../lib/options'
import { countPairs, graveRows, isLinked, matchesFilter, matchesQuery, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, type RouteFilter, type Status } from '../lib/types'
import { monName, speciesName } from '../lib/text'
import { dexKey } from '../lib/unbound'

const RING = [
  'M53.7 8.2A42 42 0 0 1 77.0 17.8',
  'M82.2 23.0A42 42 0 0 1 91.8 46.3',
  'M91.8 53.7A42 42 0 0 1 82.2 77.0',
  'M77.0 82.2A42 42 0 0 1 53.7 91.8',
  'M46.3 91.8A42 42 0 0 1 23.0 82.2',
  'M17.8 77.0A42 42 0 0 1 8.2 53.7',
  'M8.2 46.3A42 42 0 0 1 17.8 23.0',
  'M23.0 17.8A42 42 0 0 1 46.3 8.2',
]

const CHIPS: { id: RouteFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'alive', label: 'Alive' },
  { id: 'boxed', label: 'Box' },
  { id: 'dead', label: 'Fainted' },
  { id: 'missed', label: 'Missed' },
]

export function Routes({ onLog, onWiki }: { onLog: (route?: string) => void; onWiki: (id: string) => void }) {
  const app = useApp()
  const [filter, setFilter] = useState<RouteFilter>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [quick, setQuick] = useState<string | null>(null)
  const [editor, setEditor] = useState<'badges' | 'cap' | null>(null)
  const rows = useMemo(() => pairRows(app.catches, app.customRoutes), [app.catches, app.customRoutes])
  const visible = rows.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query))
  const detailRow = rows.find((row) => row.route.name === detail)
  const quickRow = rows.find((row) => row.route.name === quick)
  const mine = quickRow ? quickRow[app.me] : undefined
  const options = optionsOf(app.run)
  const badges = app.run?.badges ?? 0
  const cap = app.run?.level_cap ?? null
  const shown = activeCap(app.run)
  const leader = nextLeader(badges)
  const suggestion = options.levelCapOn
    ? suggestedCap(badges, capColumn(options.difficulty), options.mansionDone, cap)
    : null
  const linked = rows.filter((row) => isLinked(row.fisi, row.seri))
  const living = linked.filter((row) => row.fisi?.status !== 'dead' && row.seri?.status !== 'dead').length
  const fallen = rows.filter((row) => row.fisi?.status === 'dead' || row.seri?.status === 'dead').length
  const counts = Object.fromEntries(CHIPS.map((chip) => [chip.id, rows.filter((row) => matchesFilter(row, chip.id)).length])) as Record<RouteFilter, number>

  return (
    <div className="screen">
      <section className="hero" aria-label="Run progress">
        <button className="cap-ring" type="button" aria-label="Open the level cap" onClick={() => window.dispatchEvent(new Event('sl-open-cap'))}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {RING.map((d, index) => (
              <path key={d} className={index < badges ? 'seg on' : 'seg'} d={d} transform="rotate(90 50 50)" />
            ))}
          </svg>
          <div className="num"><b>{shown?.level ?? '–'}</b><small>{options.levelCapOn ? 'Level cap' : 'Cap off'}</small></div>
        </button>
        <div>
          <div className="micro gate-l">Next gate</div>
          <h2>{leader?.city ?? 'Champion'}</h2>
          <div className="gate">{leader ? `Gym ${leader.badge} · ${leader.leader}` : `${countPairs(rows)} pairs · ${living} linked`}</div>
          <div className="pips" aria-label={`${badges} of 8 badges`}>
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} className={index < badges ? 'pip on' : 'pip'}>
                <svg viewBox="0 0 20 22"><path className="hexo" d="M10 1.2 18 5.6v10.8L10 20.8 2 16.4V5.6z" /><path className="hexi" d="M10 5 14.5 7.6v6.8L10 17 5.5 14.4V7.6z" /></svg>
              </span>
            ))}
          </div>
          <DifficultyPicker value={options.difficulty} onChange={(difficulty) => void app.saveOptions({ difficulty })} />
          {(options.difficulty === 'expert' || options.difficulty === 'insane') && <p className="hint">{EXPERT_CAP_NOTE}</p>}
          {suggestion && (
            <button className="btn btn-sm" type="button" style={{ marginTop: 8, width: 'auto' }} onClick={() => void app.saveProgress({ level_cap: suggestion.level })}>
              Suggest Lv {suggestion.level}
            </button>
          )}
          <p className="hint">{living} linked · {fallen} fallen</p>
        </div>
      </section>
      <div className="chips" role="toolbar" aria-label="Filter">
        {CHIPS.map((chip) => (
          <button key={chip.id} className={cx('chip', filter === chip.id && 'on')} type="button" aria-pressed={filter === chip.id} onClick={() => setFilter(chip.id)}>
            {chip.label} <span className="n">{counts[chip.id]}</span>
          </button>
        ))}
        <button
          className={cx('chip', searching && 'on')}
          type="button"
          aria-label={searching ? 'Close search' : 'Search routes or Pokémon'}
          aria-pressed={searching}
          onClick={() => { setSearching((value) => !value); setQuery('') }}
        >
          {searching ? <X size={16} /> : <Search size={16} />}
        </button>
      </div>
      {searching && (
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Route, Pokémon, nickname"
          aria-label="Search"
          autoFocus
        />
      )}
      {app.catches.length === 0 && <InstallHint />}
      {app.catches.length === 0 && (
        <div className="banner">
          <strong>Let’s go!</strong>
          <p>Log your first catch.</p>
        </div>
      )}
      <div className="list stagger">
        {visible.map((row, index) => {
          const previous = visible[index - 1]
          const showGroup = !query && filter === 'all' && row.route.group !== previous?.route.group
          const number = rows.findIndex((item) => item.route.name === row.route.name) + 1
          return (
            <div key={row.route.name}>
              {showGroup && <h3 className="group-label">{groupTitle(row.route.group)}</h3>}
              <LinkCard
                route={row.route}
                index={number}
                fisi={row.fisi}
                seri={row.seri}
                me={app.me}
                glow={app.glow?.route === row.route.name}
                pulse={app.pulse === row.route.name}
                onOpen={() => setDetail(row.route.name)}
                onAdd={() => onLog(row.route.name)}
                onQuick={() => row[app.me] && setQuick(row.route.name)}
                onTeam={() => {
                  const mine = row[app.me]
                  if (mine) void app.place(mine.id, 'team')
                }}
                onBox={() => {
                  const mine = row[app.me]
                  if (mine) void app.place(mine.id, 'box')
                }}
                onDead={() => {
                  const mine = row[app.me]
                  if (mine) void app.setStatus(mine.id, 'dead')
                }}
                onWiki={(id) => { setDetail(null); setQuick(null); onWiki(id) }}
                randomized={options.randomizerSpecies}
              />
            </div>
          )
        })}
        {!visible.length && <p className="hint center">No route matches.</p>}
      </div>

      <BottomSheet open={editor === 'badges'} title="Badges" onClose={() => setEditor(null)}>
        <div className="stepper">
          <button type="button" className="dice" aria-label="Fewer badges" disabled={badges <= 0} onClick={() => void app.saveProgress({ badges: badges - 1 })}>
            <Minus />
          </button>
          <strong>{badges} / 8</strong>
          <button type="button" className="dice" aria-label="One more badge" disabled={badges >= 8} onClick={() => void app.saveProgress({ badges: badges + 1 })}>
            <Plus />
          </button>
        </div>
        <p className="hint center">Applies to both of you. {leader ? `Next: ${leader.leader} in ${leader.city}. ${leader.boss}` : 'All eight badges are here.'}</p>
      </BottomSheet>
      <BottomSheet open={editor === 'cap'} title="Level cap" onClose={() => setEditor(null)}>
        <div className="stepper">
          <button type="button" className="dice" aria-label="Lower the level cap" disabled={!cap} onClick={() => void app.saveProgress({ level_cap: cap && cap > 1 ? cap - 1 : null })}>
            <Minus />
          </button>
          <strong>{cap ?? '–'}</strong>
          <button type="button" className="dice" aria-label="Raise the level cap" disabled={cap === 100} onClick={() => void app.saveProgress({ level_cap: Math.min(100, (cap ?? 0) + 1) })}>
            <Plus />
          </button>
        </div>
        <p className="hint center">Shared with the run. Open the level-cap chip for difficulty, the mansion step, and the on/off switch.</p>
        <button className="btn btn-primary" type="button" onClick={() => window.dispatchEvent(new Event('sl-open-cap'))}>Open cap settings</button>
      </BottomSheet>

      <BottomSheet open={Boolean(detailRow)} title={detailRow ? routeTitle(detailRow.route) : 'Route'} onClose={() => setDetail(null)}>
        {detailRow && (
          <div className="detail">
            {marksFor(detailRow.route.name).map((mark) => (
              <p key={`${mark.kind}-${mark.label}`} className="route-note"><b>{mark.label}.</b> {mark.detail}</p>
            ))}
            {(['fisi', 'seri'] as const).map((side) => {
              const row = detailRow[side]
              return (
                <section key={side} className={cx('detail-side', side)}>
                  <header>
                    <span className="avatar tiny">{PLAYERS[side].letter}</span>
                    <strong>{PLAYERS[side].name}</strong>
                  </header>
                  {row ? (
                    <>
                      <div className="detail-mon">
                        {row.status !== 'missed' && row.dex_id && (
                          <button
                            className="wiki-hit"
                            type="button"
                            aria-label={`${speciesName(row)} in the Pokédex`}
                            onClick={() => { setDetail(null); onWiki(dexKey(row.dex_id as number, row.form)) }}
                          >
                            <SpritePlate id={row.dex_id} alt={speciesName(row)} dim={row.status === 'dead'} />
                          </button>
                        )}
                        <div>
                          <h3>{row.nickname || (row.status === 'missed' ? 'Missed' : speciesName(row))}</h3>
                          <p>
                            {row.status === 'missed' ? 'No catch' : speciesName(row)}
                            {row.level ? ` · Lv. ${row.level}` : ''}
                            {row.in_team ? ' · in the team' : ''}
                          </p>
                          <StatusChip status={row.status} />
                        </div>
                      </div>
                      {row.note && <p>{row.note}</p>}
                      {row.death_cause && <p>Cause: {row.death_cause}</p>}
                    </>
                  ) : (
                    <p className="hint">{PLAYERS[side].name} hasn’t logged anything yet.</p>
                  )}
                </section>
              )
            })}
            <div className="stack">
              {detailRow[app.me] ? (
                <>
                  <button className="btn btn-primary" type="button" onClick={() => { onLog(detailRow.route.name); setDetail(null) }}>
                    Edit
                  </button>
                  {detailRow[app.me]?.status === 'alive' && !detailRow[app.me]?.in_team && (
                    <button className="btn btn-ghost" type="button" onClick={() => detailRow[app.me] && void app.place(detailRow[app.me]!.id, 'team')}>
                      To the team
                    </button>
                  )}
                  {detailRow[app.me]?.in_team && (
                    <button className="btn btn-ghost" type="button" onClick={() => detailRow[app.me] && void app.place(detailRow[app.me]!.id, 'box')}>
                      To the box
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => {
                      const id = detailRow[app.me]?.id
                      if (!id) return
                      if (window.confirm('Delete this catch?')) {
                        void app.deleteCatch(id)
                        setDetail(null)
                      }
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => { onLog(detailRow.route.name); setDetail(null) }}>
                  Log a catch
                </button>
              )}
            </div>
            {graveRows([detailRow]).length > 0 && <p className="hint">{monName(detailRow.fisi)} & {monName(detailRow.seri)}</p>}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={Boolean(mine)} title="Change status" onClose={() => setQuick(null)}>
        {mine && (
          <div className="stseg">
            {([
              ['alive', 'Alive', Heart],
              ['boxed', 'Box', Archive],
              ['dead', 'Fainted', Skull],
              ['missed', 'Missed', Ban],
            ] as const).map(([status, label, Icon]) => (
              <button
                key={status}
                type="button"
                className={cx('seg', `is-${status}`, mine.status === status && 'on')}
                aria-pressed={mine.status === status}
                onClick={() => {
                  void app.setStatus(mine.id, status as Status)
                  setQuick(null)
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
