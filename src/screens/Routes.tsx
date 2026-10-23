import { Archive, Ban, Heart, Minus, Plus, Search, Skull, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InstallHint } from '../components/InstallHint'
import { LinkCard } from '../components/LinkCard'
import { BottomSheet, cx, SpritePlate, StatusChip } from '../components/ui'
import { nextLeader } from '../lib/gym'
import { countPairs, graveRows, isLinked, matchesFilter, matchesQuery, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { PLAYERS, type RouteFilter, type Status } from '../lib/types'
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
  const [editor, setEditor] = useState<'badges' | 'cap' | null>(null)
  const rows = useMemo(() => pairRows(app.catches, app.customRoutes), [app.catches, app.customRoutes])
  const visible = rows.filter((row) => matchesFilter(row, filter) && matchesQuery(row, query))
  const detailRow = rows.find((row) => row.route.name === detail)
  const quickRow = rows.find((row) => row.route.name === quick)
  const mine = quickRow ? quickRow[app.me] : undefined
  const badges = app.run?.badges ?? 0
  const cap = app.run?.level_cap ?? null
  const leader = nextLeader(badges)
  const linked = rows.filter((row) => isLinked(row.fisi, row.seri))
  const living = linked.filter((row) => row.fisi?.status !== 'dead' && row.seri?.status !== 'dead').length
  const fallen = rows.filter((row) => row.fisi?.status === 'dead' || row.seri?.status === 'dead').length
  const counts = Object.fromEntries(CHIPS.map((chip) => [chip.id, rows.filter((row) => matchesFilter(row, chip.id)).length])) as Record<RouteFilter, number>

  return (
    <div className="screen">
      <div className="progress" role="group" aria-label="Run-Überblick">
        <button className="ptile" type="button" onClick={() => setEditor('badges')}>
          <div className="lbl">Orden</div>
          <div className="val">{badges}<small>/ 8</small></div>
          <div className="badges" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <b key={index} className={index < badges ? 'on' : ''} />)}
          </div>
        </button>
        <button className="ptile" type="button" onClick={() => setEditor('cap')}>
          <div className="lbl">Levelcap</div>
          <div className="val">{cap ?? '–'}</div>
          {leader && <div className="species">Nächste: {leader}</div>}
        </button>
        <div className="ptile">
          <div className="lbl">Paare</div>
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
          aria-label={searching ? 'Suche schließen' : 'Route oder Pokémon suchen'}
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
          const number = rows.findIndex((item) => item.route.name === row.route.name) + 1
          return (
            <div key={row.route.name}>
              {showGroup && <h3 className="group-label">{row.route.group}</h3>}
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
              />
            </div>
          )
        })}
        {!visible.length && <p className="hint center">Keine Route passt.</p>}
      </div>

      <BottomSheet open={editor === 'badges'} title="Orden" onClose={() => setEditor(null)}>
        <div className="stepper">
          <button type="button" className="dice" aria-label="Orden zurück" disabled={badges <= 0} onClick={() => void app.saveProgress({ badges: badges - 1 })}>
            <Minus />
          </button>
          <strong>{badges} / 8</strong>
          <button type="button" className="dice" aria-label="Orden dazu" disabled={badges >= 8} onClick={() => void app.saveProgress({ badges: badges + 1 })}>
            <Plus />
          </button>
        </div>
        <p className="hint center">Gilt für euch beide. {leader ? `Als Nächstes: ${leader}.` : 'Alle acht Orden sind da.'}</p>
      </BottomSheet>
      <BottomSheet open={editor === 'cap'} title="Levelcap" onClose={() => setEditor(null)}>
        <div className="stepper">
          <button type="button" className="dice" aria-label="Levelcap senken" disabled={!cap} onClick={() => void app.saveProgress({ level_cap: cap && cap > 1 ? cap - 1 : null })}>
            <Minus />
          </button>
          <strong>{cap ?? '–'}</strong>
          <button type="button" className="dice" aria-label="Levelcap erhöhen" disabled={cap === 100} onClick={() => void app.saveProgress({ level_cap: Math.min(100, (cap ?? 0) + 1) })}>
            <Plus />
          </button>
        </div>
        <p className="hint center">Manuell, für den nächsten Arena-Kampf.</p>
      </BottomSheet>

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
                        {row.status !== 'missed' && <SpritePlate id={row.dex_id} alt={row.pokemon ?? 'Pokémon'} dim={row.status === 'dead'} />}
                        <div>
                          <h3>{row.nickname || row.pokemon || 'Verpasst'}</h3>
                          <p>
                            {row.pokemon}
                            {row.level ? ` · Lv. ${row.level}` : ''}
                            {row.in_team ? ' · im Team' : ''}
                          </p>
                          <StatusChip status={row.status} />
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
          <div className="stseg">
            {([
              ['alive', 'Lebt', Heart],
              ['boxed', 'Box', Archive],
              ['dead', 'Gefallen', Skull],
              ['missed', 'Verpasst', Ban],
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
