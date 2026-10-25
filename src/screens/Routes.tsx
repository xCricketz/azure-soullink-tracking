import { Archive, Ban, Heart, Minus, Plus, Search, Skull, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { LinkCard } from '../components/LinkCard'
import { BottomSheet, cx, SpritePlate, StatusChip } from '../components/ui'
import { marksFor } from '../data/marks'
import { groupTitle, routeTitle } from '../data/routes'
import { suggestedCap } from '../lib/caps'
import { nextLeader } from '../lib/gym'
import { countPairs, graveRows, isLinked, matchesFilter, matchesQuery, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, type RouteFilter, type Status } from '../lib/types'
import { monName, speciesName } from '../lib/text'
import { dexKey } from '../lib/unbound'

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
  const badges = app.run?.badges ?? 0
  const cap = app.run?.level_cap ?? null
  const leader = nextLeader(badges)
  const suggestion = suggestedCap(badges, app.settings.capMode, app.settings.mansionDone, cap)
  const linked = rows.filter((row) => isLinked(row.fisi, row.seri))
  const living = linked.filter((row) => row.fisi?.status !== 'dead' && row.seri?.status !== 'dead').length
  const fallen = rows.filter((row) => row.fisi?.status === 'dead' || row.seri?.status === 'dead').length
  const counts = Object.fromEntries(CHIPS.map((chip) => [chip.id, rows.filter((row) => matchesFilter(row, chip.id)).length])) as Record<RouteFilter, number>

  return (
    <div className="screen">
      <div className="progress" role="group" aria-label="Run overview">
        <button className="ptile" type="button" onClick={() => setEditor('badges')}>
          <div className="lbl">Badges</div>
          <div className="val">{badges}<small>/ 8</small></div>
          <div className="badges" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <b key={index} className={index < badges ? 'on' : ''} />)}
          </div>
        </button>
        <div className="ptile">
          <button className="ptile-hit" type="button" onClick={() => setEditor('cap')}>
            <div className="lbl">Level cap</div>
            <div className="val">{cap ?? '–'}</div>
            {leader && <div className="species">Next: {leader.leader}</div>}
          </button>
          {suggestion && suggestion.level !== cap && (
            <button
              className="cap-suggest"
              type="button"
              aria-label={`Set level cap to ${suggestion.label}, Lv ${suggestion.level}`}
              onClick={() => void app.saveProgress({ level_cap: suggestion.level })}
            >
              Suggest Lv {suggestion.level}
            </button>
          )}
        </div>
        <div className="ptile">
          <div className="lbl">Pairs</div>
          <div className="val">{countPairs(rows)}</div>
          <div className="species">
            <span className="alive-ink">{living} ♥</span> · <span className="dead-ink">{fallen} ✝</span>
          </div>
        </div>
      </div>
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
      <div className="route-list">
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
                onWiki={(id) => { setDetail(null); setQuick(null); onWiki(id) }}
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
        <div className="seg cap-mode" role="group" aria-label="Level cap table">
          {(['vanilla', 'difficult'] as const).map((mode) => (
            <button key={mode} type="button" className={app.settings.capMode === mode ? 'on' : ''} aria-pressed={app.settings.capMode === mode} onClick={() => app.updateSettings({ capMode: mode })}>
              {mode === 'vanilla' ? 'Vanilla' : 'Difficult+'}
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={app.settings.mansionDone} onChange={(event) => app.updateSettings({ mansionDone: event.target.checked })} />
          <span>Tarmigan Mansion finished</span>
        </label>
        {suggestion && (
          <button className="btn btn-primary cap-apply" type="button" onClick={() => void app.saveProgress({ level_cap: suggestion.level })}>
            Suggest Lv {suggestion.level}
          </button>
        )}
        <p className="hint center">{suggestion ? `${suggestion.label} · Lv ${suggestion.level} on ${app.settings.capMode === 'difficult' ? 'Difficult+' : 'Vanilla'}.` : 'The cap already matches this badge count.'} Saved for this phone.</p>
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
