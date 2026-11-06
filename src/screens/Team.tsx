import { Archive, ChevronDown, ChevronUp, Link2, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { BossCard } from '../components/BossCard'
import { CountUp } from '../components/CountUp'
import { Photo } from '../components/Photo'
import { EmptyState, SpritePlate, TypePills, cx } from '../components/ui'
import { routeTitleByKey } from '../data/routes'
import { nextCap } from '../lib/caps'
import { teamOf } from '../lib/edits'
import { capWarningText, capWarnings } from '../lib/level-warn'
import { activeCap, capColumn, optionsOf } from '../lib/options'
import { dexKey, findMon, useDex, type UMon } from '../lib/unbound'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type Catch, type PlayerId, type TeamView } from '../lib/types'
import { useListEntrance } from '../lib/list-entrance'
import { monName, speciesName } from '../lib/text'

export function Team({ onWiki }: { onWiki: (id: string) => void }) {
  const app = useApp()
  const dex = useDex()
  const [view, setView] = useState<TeamView>('mine')
  const partner = otherPlayer(app.me)
  const warnings = useMemo(() => teamWarnings(app.me, app.catches, app.settings.dupeClause, app.settings.typeClause, dex), [app, dex])
  const mine = teamOf(app.catches, app.me)
  const theirs = teamOf(app.catches, partner)
  const options = optionsOf(app.run)
  const cap = activeCap(app.run)
  const upcoming = cap ? nextCap(app.run?.badges ?? 0, capColumn(options.difficulty), options.mansionDone) : null
  const over = capWarnings(mine.map((row) => ({ name: monName(row), level: row.level, onTeam: true })), cap?.level ?? null)
  const aliveCount = (player: PlayerId) => app.catches.filter((row) => row.player === player && row.status === 'alive').length

  return (
    <div className="screen">
      <div className="pairbar">
        <div className="p l">
          <Photo id="fisi" size="md" alt="Fisi" />
          <div><b>Fisi</b><small>{aliveCount('fisi')} alive</small></div>
        </div>
        <div className="lk2"><span className="ln" /><span className="nd"><Link2 aria-hidden="true" /></span><span className="ln" /></div>
        <div className="p r">
          <Photo id="seri" size="md" alt="Seri" />
          <div><b>Seri</b><small>{aliveCount('seri')} alive</small></div>
        </div>
      </div>
      <BossCard
        badges={app.run?.badges ?? 0}
        capLevel={cap?.level ?? null}
        nextLevel={upcoming?.level ?? null}
        team={mine}
        typesOf={(row) => findMon(dex, row.dex_id, row.form)?.types ?? []}
      />
      {cap && (
        <section className="cap-board" aria-label="Level cap">
          <div>
            <small>Level cap</small>
            <CountUp value={cap.level} />
            <span>{cap.label}</span>
          </div>
          <div>
            <small>Next cap</small>
            {upcoming ? <CountUp value={upcoming.level} /> : <b>—</b>}
            <span>{upcoming ? upcoming.label : 'No further cap'}</span>
          </div>
        </section>
      )}
      {over.length > 0 && (
        <div className="banner" role="status">
          <TriangleAlert aria-hidden="true" />
          <span>
            {over.map((warning) => <span key={warning.name}>{capWarningText(warning)} </span>)}
            The cap does not remove them from the team.
          </span>
        </div>
      )}
      <div className="seg" role="group" aria-label="Team view">
        {([['mine', 'My team'], ['partner', `${PLAYERS[partner].name}’s team`], ['both', 'Both']] as const).map(([id, label]) => (
          <button key={id} type="button" className={view === id ? 'on' : ''} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>
      {warnings.length > 0 && view !== 'partner' && (
        <div className="banner" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>
            {warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </span>
        </div>
      )}
      {view === 'both' ? (
        <div className="both-grid">
          <TeamColumn player="fisi" rows={teamOf(app.catches, 'fisi')} catches={app.catches} editable={app.me === 'fisi'} onWiki={onWiki} />
          <TeamColumn player="seri" rows={teamOf(app.catches, 'seri')} catches={app.catches} editable={app.me === 'seri'} onWiki={onWiki} />
        </div>
      ) : (
        <Party
          rows={view === 'mine' ? mine : theirs}
          owner={view === 'mine' ? app.me : partner}
          catches={app.catches}
          editable={view === 'mine'}
          empty={view === 'mine'}
          warned={new Set(warnings)}
          onWiki={onWiki}
          capLevel={cap?.level ?? null}
        />
      )}
      {view === 'mine' && <Reserves onWiki={onWiki} />}
    </div>
  )
}

function Party({
  rows,
  owner,
  catches,
  editable,
  empty,
  warned,
  onWiki,
  capLevel = null,
}: {
  rows: Catch[]
  owner: PlayerId
  catches: Catch[]
  editable: boolean
  empty: boolean
  warned?: Set<string>
  onWiki: (id: string) => void
  capLevel?: number | null
}) {
  const app = useApp()
  const dex = useDex()
  const gridRef = useRef<HTMLDivElement>(null)
  useListEntrance(gridRef, rows.map((row) => row.id).join('|'))
  if (!rows.length && empty) {
    return <EmptyState title="No team yet. Catch something on Route 1!" trainer={owner} />
  }
  if (!rows.length) return <EmptyState title={`${PLAYERS[owner].name} doesn’t have anyone in the team yet.`} trainer={owner} />
  return (
    <div className="grid2" ref={gridRef}>
      {rows.map((row, index) => {
        const partner = catches.find((item) => item.player !== row.player && item.route === row.route)
        const partnerId = row.player === 'fisi' ? 'seri' : 'fisi'
        const split = partner ? partner.status !== 'alive' || !partner.in_team : true
        const name = monName(row)
        const flagged = warned ? [...warned].some((warning) => warning.startsWith(name)) : split && editable
        const overBy = capLevel != null && row.level != null && row.level > capLevel ? row.level - capLevel : 0
        return (
          <article key={row.id} data-enter={index < 12 ? '' : undefined} className={cx('tcard', flagged && 'warn', overBy > 0 && 'over')} style={{ ['--tc' as string]: 'var(--me)', viewTransitionName: `team-${row.id}` }}>
            <div className="art">
              <span className="lv"><small>Lv</small>{row.level ?? '–'}</span>
              {overBy > 0 && <span className="cap"><TriangleAlert aria-hidden="true" />+{overBy}</span>}
              <button
                className="wiki-hit"
                type="button"
                aria-label={`${name} in the Pokédex`}
                disabled={!row.dex_id}
                onClick={() => row.dex_id && onWiki(dexKey(row.dex_id, row.form))}
              >
                <SpritePlate id={row.dex_id} alt={speciesName(row)} size="lg" types={findMon(dex, row.dex_id, row.form)?.types} />
              </button>
            </div>
            <div className="nm">
              <b>{row.nickname || speciesName(row)}</b>
              <span className="species">{speciesName(row)}</span>
            </div>
            <TypePills id={row.dex_id} names={findMon(dex, row.dex_id, row.form)?.types} />
            <div className={cx('lk', partnerId)}>
              <Photo id={partnerId} size="xs" alt="" />
              <Link2 aria-hidden="true" />
              {partner && partner.status !== 'missed' && partner.dex_id && (
                <button
                  className="wiki-hit"
                  type="button"
                  aria-label={`${monName(partner)} in the Pokédex`}
                  onClick={() => onWiki(dexKey(partner.dex_id as number, partner.form))}
                >
                  <SpritePlate id={partner.dex_id} alt="" size="sm" types={findMon(dex, partner.dex_id, partner.form)?.types} />
                </button>
              )}
              <span>{PLAYERS[partnerId].possessive} {partner ? monName(partner) : '…'}</span>
              {partner?.status === 'boxed' && <Archive className="w" size={14} aria-label="In the box" />}
            </div>
            {editable && (
              <div className="team-actions">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => void app.place(row.id, 'box')}>To the box</button>
                <div className="icon-row">
                  <button className="icon-btn" type="button" aria-label="Move up" disabled={index === 0} onClick={() => void app.moveTeam(row.id, -1)}>
                    <ChevronUp size={18} />
                  </button>
                  <button className="icon-btn" type="button" aria-label="Move down" disabled={index === rows.length - 1} onClick={() => void app.moveTeam(row.id, 1)}>
                    <ChevronDown size={18} />
                  </button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function TeamColumn({
  player,
  rows,
  catches,
  editable,
  onWiki,
}: {
  player: PlayerId
  rows: Catch[]
  catches: Catch[]
  editable: boolean
  onWiki: (id: string) => void
}) {
  return (
    <section>
      <h2 className={player}>{PLAYERS[player].name}</h2>
      <Party rows={rows} owner={player} catches={catches} editable={editable} empty={false} onWiki={onWiki} />
    </section>
  )
}

function Reserves({ onWiki }: { onWiki: (id: string) => void }) {
  const app = useApp()
  const reserves = app.catches.filter((row) => row.player === app.me && !row.in_team && (row.status === 'alive' || row.status === 'boxed') && row.pokemon)
  if (!reserves.length) return null
  return (
    <section className="reserves">
      <h2>Not in the team</h2>
      {reserves.map((row) => (
        <div key={row.id} className="reserve">
          <button
            className="wiki-hit"
            type="button"
            aria-label={`${monName(row)} in the Pokédex`}
            disabled={!row.dex_id}
            onClick={() => row.dex_id && onWiki(dexKey(row.dex_id, row.form))}
          >
            <SpritePlate id={row.dex_id} alt={speciesName(row)} size="sm" />
          </button>
          <div>
            <strong>{monName(row)}</strong>
            <p>{routeTitleByKey(row.route)}</p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => void app.place(row.id, 'team')}>
            To the team
          </button>
        </div>
      ))}
    </section>
  )
}

function teamWarnings(me: PlayerId, catches: Catch[], dupe: boolean, types: boolean, dex: UMon[] | null): string[] {
  const warnings: string[] = []
  const mine = teamOf(catches, me)
  const partner = otherPlayer(me)
  for (const row of mine) {
    const other = catches.find((item) => item.player === partner && item.route === row.route)
    const myName = monName(row)
    const place = routeTitleByKey(row.route)
    if (!other) {
      warnings.push(`${myName} is in the team, but ${PLAYERS[partner].name} has nothing on ${place} yet.`)
      continue
    }
    const otherName = monName(other)
    if (other.status === 'boxed') warnings.push(`${myName} is in the team, but ${otherName} is boxed for ${PLAYERS[partner].name}.`)
    else if (other.status === 'dead') warnings.push(`${myName} is in the team, but ${otherName} has fainted.`)
    else if (other.status === 'missed') warnings.push(`${myName} is unlinked — ${PLAYERS[partner].name} missed the route. Can’t be in the team.`)
    else if (!other.in_team) warnings.push(`${myName} is in the team, but ${otherName} isn’t in ${PLAYERS[partner].name}’s team.`)
  }
  if (dupe) {
    const seen = new Set<string>()
    for (const row of mine) {
      if (!row.dex_id) continue
      const key = dexKey(row.dex_id, row.form)
      if (seen.has(key)) warnings.push(`Dupes Clause: ${speciesName(row)} is in the team twice.`)
      seen.add(key)
    }
  }
  if (types) {
    const seen = new Map<string, string>()
    for (const row of mine) {
      const type = findMon(dex, row.dex_id, row.form)?.types[0]
      if (!type) continue
      const first = seen.get(type)
      if (first) warnings.push(`Type Clause: ${type} is on ${first} and ${monName(row)}.`)
      else seen.set(type, monName(row))
    }
  }
  return warnings
}
