import { Archive, Ban, Heart, Search, Skull, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { LinkCard } from '../components/LinkCard'
import { BottomSheet, cx, Sprite, StatusChip } from '../components/ui'
import { countAlive, countDead, countPairs, graveRows, matchesFilter, matchesQuery, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { greetingLine, PLAYERS, type RouteFilter, type Status } from '../lib/types'
import { monName } from '../lib/text'

const CHIPS: { id: RouteFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Offen' },
  { id: 'alive', label: 'Lebt' },
  { id: 'boxed', label: 'Box' },
  { id: 'dead', label: 'Gefallen' },
  { id: 'missed', label: 'Verpasst' },
]

export function Routes({ onLog }: { onLog: (route?: string) => void }) {
  const app = useApp()
  const [filter, setFilter] = useState<RouteFilter>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [quick, setQuick] = useState<string | null>(null)
  const rows = useMemo(() => pairRows(app.catches, app.customRoutes), [app.catches, app.customRoutes])
  const visible = rows.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query))
  const detailRow = rows.find((row) => row.route.name === detail)
  const quickRow = rows.find((row) => row.route.name === quick)
  const mine = quickRow ? quickRow[app.me] : undefined
  const line = useMemo(() => greetingLine(), [])

  return (
    <div className="screen">
      <p className="greet-line">{line}</p>
      <div className="stats" role="group" aria-label="Run-Überblick">
        <button className="pill" type="button" aria-pressed={filter === 'pairs'} onClick={() => setFilter(filter === 'pairs' ? 'all' : 'pairs')}>
          🔗 {countPairs(rows)} Paare
        </button>
        <button className="pill" type="button" aria-pressed={filter === 'alive'} onClick={() => setFilter(filter === 'alive' ? 'all' : 'alive')}>
          ❤ {countAlive(app.catches)} leben
        </button>
        <button className="pill" type="button" aria-pressed={filter === 'dead'} onClick={() => setFilter(filter === 'dead' ? 'all' : 'dead')}>
          💀 {countDead(app.catches)} gefallen
        </button>
      </div>
      <div className="chip-row">
        <div className="chips" role="toolbar" aria-label="Filter">
          {CHIPS.map((chip) => (
            <button key={chip.id} className="chip-btn" type="button" aria-pressed={filter === chip.id} onClick={() => setFilter(chip.id)}>
              {chip.label}
            </button>
          ))}
        </div>
        <button className="icon-btn" type="button" aria-label={searching ? 'Suche schließen' : 'Route oder Pokémon suchen'} aria-pressed={searching} onClick={() => { setSearching((value) => !value); setQuery('') }}>
          {searching ? <X /> : <Search />}
        </button>
      </div>
      {searching && (
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Route, Pokémon, Spitzname"
          aria-label="Suche"
          autoFocus
        />
      )}
      {app.catches.length === 0 && <InstallHint />}
      {app.catches.length === 0 && (
        <div className="banner">
          <strong>Los geht's!</strong>
          <p>Trag deinen ersten Fang ein.</p>
        </div>
      )}
      <div className="route-list">
        {visible.map((row, index) => {
          const previous = visible[index - 1]
          const showGroup = !query && filter === 'all' && row.route.group !== previous?.route.group
          return (
            <div key={row.route.name}>
              {showGroup && <h3 className="group-label">{row.route.group}</h3>}
              <LinkCard
                route={row.route}
                fisi={row.fisi}
                seri={row.seri}
                me={app.me}
                glow={app.glow?.route === row.route.name}
                onOpen={() => setDetail(row.route.name)}
                onAdd={() => onLog(row.route.name)}
                onQuick={() => row[app.me] && setQuick(row.route.name)}
              />
            </div>
          )
        })}
        {!visible.length && <p className="hint center">Keine Route passt.</p>}
      </div>

      <BottomSheet open={Boolean(detailRow)} title={detailRow?.route.name ?? 'Route'} onClose={() => setDetail(null)}>
        {detailRow && (
          <div className="detail">
            <p className="hint">{detailRow.route.en}</p>
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
                        <Sprite id={row.dex_id} alt={row.pokemon ?? 'Pokémon'} large dim={row.status === 'dead'} />
                        <div>
                          <h3>{row.nickname || row.pokemon || 'Verpasst'}</h3>
                          <p>{row.pokemon}{row.level ? ` · Lv. ${row.level}` : ''}</p>
                          <StatusChip status={row.status} inTeam={row.in_team} />
                        </div>
                      </div>
                      {row.note && <p>{row.note}</p>}
                      {row.death_cause && <p>Ursache: {row.death_cause}</p>}
                    </>
                  ) : (
                    <p className="hint">{PLAYERS[side].name} hat noch nichts eingetragen.</p>
                  )}
                </section>
              )
            })}
            <div className="stack">
              {detailRow[app.me] ? (
                <>
                  <button className="btn btn-primary" type="button" onClick={() => { onLog(detailRow.route.name); setDetail(null) }}>
                    Bearbeiten
                  </button>
                  {detailRow[app.me]?.status === 'alive' && !detailRow[app.me]?.in_team && (
                    <button className="btn btn-ghost" type="button" onClick={() => detailRow[app.me] && void app.place(detailRow[app.me]!.id, 'team')}>
                      Ins Team
                    </button>
                  )}
                  {detailRow[app.me]?.in_team && (
                    <button className="btn btn-ghost" type="button" onClick={() => detailRow[app.me] && void app.place(detailRow[app.me]!.id, 'box')}>
                      In die Box
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => {
                      const id = detailRow[app.me]?.id
                      if (!id) return
                      if (window.confirm('Diesen Fang wirklich löschen?')) {
                        void app.deleteCatch(id)
                        setDetail(null)
                      }
                    }}
                  >
                    Löschen
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => { onLog(detailRow.route.name); setDetail(null) }}>
                  Fang eintragen
                </button>
              )}
            </div>
            {graveRows([detailRow]).length > 0 && <p className="hint">{monName(detailRow.fisi)} & {monName(detailRow.seri)}</p>}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={Boolean(mine)} title="Status ändern" onClose={() => setQuick(null)}>
        {mine && (
          <div className="quick-grid">
            {([
              ['alive', 'Lebt', Heart],
              ['boxed', 'Box', Archive],
              ['dead', 'Gefallen', Skull],
              ['missed', 'Verpasst', Ban],
            ] as const).map(([status, label, Icon]) => (
              <button
                key={status}
                type="button"
                className={cx('seg', `is-${status}`)}
                aria-pressed={mine.status === status}
                onClick={() => {
                  void app.setStatus(mine.id, status as Status)
                  setQuick(null)
                }}
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
