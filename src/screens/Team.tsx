import { Archive, ChevronDown, ChevronUp, Link2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, SpritePlate, TypePills, cx } from '../components/ui'
import { routeTitleByKey } from '../data/routes'
import { gen4TypeNames } from '../data/typechart'
import { teamOf } from '../lib/edits'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type Catch, type PlayerId, type TeamView } from '../lib/types'
import { monName, speciesName } from '../lib/text'

export function Team({ onWiki }: { onWiki: (id: number) => void }) {
  const app = useApp()
  const [view, setView] = useState<TeamView>('mine')
  const partner = otherPlayer(app.me)
  const warnings = useMemo(() => teamWarnings(app.me, app.catches, app.settings.dupeClause, app.settings.typeClause), [app])
  const mine = teamOf(app.catches, app.me)
  const theirs = teamOf(app.catches, partner)

  return (
    <div className="screen">
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
}: {
  rows: Catch[]
  owner: PlayerId
  catches: Catch[]
  editable: boolean
  empty: boolean
  warned?: Set<string>
  onWiki: (id: number) => void
}) {
  const app = useApp()
  if (!rows.length && empty) {
    return <EmptyState title="No team yet. Catch something on Route 201!" trainer={owner} />
  }
  if (!rows.length) return <EmptyState title={`${PLAYERS[owner].name} doesn’t have anyone in the team yet.`} trainer={owner} />
  return (
    <div className="team-grid">
      {rows.map((row, index) => {
        const partner = catches.find((item) => item.player !== row.player && item.route === row.route)
        const partnerId = row.player === 'fisi' ? 'seri' : 'fisi'
        const split = partner ? partner.status !== 'alive' || !partner.in_team : true
        const name = monName(row)
        const flagged = warned ? [...warned].some((warning) => warning.startsWith(name)) : split && editable
        return (
          <article key={row.id} className={cx('tcard', flagged && 'warn')}>
            <div className="plate-wrap">
              <button
                className="wiki-hit"
                type="button"
                aria-label={`${name} in the Pokédex`}
                disabled={!row.dex_id}
                onClick={() => row.dex_id && onWiki(row.dex_id)}
              >
                <SpritePlate id={row.dex_id} alt={speciesName(row)} size="lg" />
              </button>
              <span className="lv">Lv {row.level ?? '–'}</span>
            </div>
            <div className="nm">
              <b>{row.nickname || speciesName(row)}</b>
              <span className="species">{speciesName(row)}</span>
            </div>
            <TypePills id={row.dex_id} />
            <div className={cx('lk', partnerId)}>
              <Link2 aria-hidden="true" />
              {partner && partner.status !== 'missed' && partner.dex_id && (
                <button
                  className="wiki-hit"
                  type="button"
                  aria-label={`${monName(partner)} in the Pokédex`}
                  onClick={() => onWiki(partner.dex_id as number)}
                >
                  <SpritePlate id={partner.dex_id} alt="" size="sm" />
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
  onWiki: (id: number) => void
}) {
  return (
    <section>
      <h2 className={player}>{PLAYERS[player].name}</h2>
      <Party rows={rows} owner={player} catches={catches} editable={editable} empty={false} onWiki={onWiki} />
    </section>
  )
}

function Reserves({ onWiki }: { onWiki: (id: number) => void }) {
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
            onClick={() => row.dex_id && onWiki(row.dex_id)}
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

function teamWarnings(me: PlayerId, catches: Catch[], dupe: boolean, types: boolean): string[] {
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
    const seen = new Set<number>()
    for (const row of mine) {
      if (!row.dex_id) continue
      if (seen.has(row.dex_id)) warnings.push(`Dupes Clause: ${speciesName(row)} is in the team twice.`)
      seen.add(row.dex_id)
    }
  }
  if (types) {
    const seen = new Map<string, string>()
    for (const row of mine) {
      const type = row.dex_id ? gen4TypeNames(row.dex_id)[0] : undefined
      if (!type) continue
      const first = seen.get(type)
      if (first) warnings.push(`Type Clause: ${type} is on ${first} and ${monName(row)}.`)
      else seen.set(type, monName(row))
    }
  }
  return warnings
}
