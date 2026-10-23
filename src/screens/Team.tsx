import { Archive, ChevronDown, ChevronUp, Link2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, SpritePlate, TypePills, cx } from '../components/ui'
import { monById } from '../lib/dex'
import { teamOf } from '../lib/edits'
import { useApp } from '../state/context'
import { PLAYERS, otherPlayer, type Catch, type PlayerId, type TeamView } from '../lib/types'
import { monName } from '../lib/text'

export function Team() {
  const app = useApp()
  const [view, setView] = useState<TeamView>('mine')
  const partner = otherPlayer(app.me)
  const warnings = useMemo(() => teamWarnings(app.me, app.catches, app.settings.dupeClause, app.settings.typeClause), [app])
  const mine = teamOf(app.catches, app.me)
  const theirs = teamOf(app.catches, partner)

  return (
    <div className="screen">
      <div className="seg" role="group" aria-label="Teamansicht">
        {([['mine', 'Mein Team'], ['partner', `${PLAYERS[partner].name}s Team`], ['both', 'Beide']] as const).map(([id, label]) => (
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
          <TeamColumn player="fisi" rows={teamOf(app.catches, 'fisi')} catches={app.catches} editable={app.me === 'fisi'} />
          <TeamColumn player="seri" rows={teamOf(app.catches, 'seri')} catches={app.catches} editable={app.me === 'seri'} />
        </div>
      ) : (
        <Party
          rows={view === 'mine' ? mine : theirs}
          owner={view === 'mine' ? app.me : partner}
          catches={app.catches}
          editable={view === 'mine'}
          empty={view === 'mine'}
          warned={new Set(warnings)}
        />
      )}
      {view === 'mine' && <Reserves />}
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
}: {
  rows: Catch[]
  owner: PlayerId
  catches: Catch[]
  editable: boolean
  empty: boolean
  warned?: Set<string>
}) {
  const app = useApp()
  if (!rows.length && empty) {
    return <EmptyState title="Noch kein Team. Fang was auf Route 201!" trainer={owner} />
  }
  if (!rows.length) return <EmptyState title={`${PLAYERS[owner].name} hat noch niemanden im Team.`} trainer={owner} />
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
              <SpritePlate id={row.dex_id} alt={row.pokemon ?? 'Pokémon'} size="lg" />
              <span className="lv">Lv {row.level ?? '–'}</span>
            </div>
            <div className="nm">
              <b>{row.nickname || row.pokemon}</b>
              <span className="species">{row.pokemon}</span>
            </div>
            <TypePills id={row.dex_id} />
            <div className={cx('lk', partnerId)}>
              <Link2 aria-hidden="true" />
              {partner && partner.status !== 'missed' && <SpritePlate id={partner.dex_id} alt="" size="sm" />}
              <span>{PLAYERS[partnerId].possessive} {partner ? monName(partner) : '…'}</span>
              {partner?.status === 'boxed' && <Archive className="w" size={14} aria-label="In der Box" />}
            </div>
            {editable && (
              <div className="team-actions">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => void app.place(row.id, 'box')}>In die Box</button>
                <div className="icon-row">
                  <button className="icon-btn" type="button" aria-label="Nach vorn" disabled={index === 0} onClick={() => void app.moveTeam(row.id, -1)}>
                    <ChevronUp size={18} />
                  </button>
                  <button className="icon-btn" type="button" aria-label="Nach hinten" disabled={index === rows.length - 1} onClick={() => void app.moveTeam(row.id, 1)}>
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
}: {
  player: PlayerId
  rows: Catch[]
  catches: Catch[]
  editable: boolean
}) {
  return (
    <section>
      <h2 className={player}>{PLAYERS[player].name}</h2>
      <Party rows={rows} owner={player} catches={catches} editable={editable} empty={false} />
    </section>
  )
}

function Reserves() {
  const app = useApp()
  const reserves = app.catches.filter((row) => row.player === app.me && !row.in_team && (row.status === 'alive' || row.status === 'boxed') && row.pokemon)
  if (!reserves.length) return null
  return (
    <section className="reserves">
      <h2>Nicht im Team</h2>
      {reserves.map((row) => (
        <div key={row.id} className="reserve">
          <SpritePlate id={row.dex_id} alt={row.pokemon ?? 'Pokémon'} size="sm" />
          <div>
            <strong>{row.nickname || row.pokemon}</strong>
            <p>{row.route}</p>
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => void app.place(row.id, 'team')}>
            Ins Team
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
    if (!other) {
      warnings.push(`${myName} ist im Team, aber ${PLAYERS[partner].name} hat auf ${row.route} noch nichts.`)
      continue
    }
    const otherName = monName(other)
    if (other.status === 'boxed') warnings.push(`${myName} ist im Team, aber ${otherName} liegt bei ${PLAYERS[partner].name} in der Box.`)
    else if (other.status === 'dead') warnings.push(`${myName} ist im Team, aber ${otherName} ist gefallen.`)
    else if (other.status === 'missed') warnings.push(`${myName} ist unverlinkt – ${PLAYERS[partner].name} hat die Route verpasst. Darf nicht ins Team.`)
    else if (!other.in_team) warnings.push(`${myName} ist im Team, aber ${otherName} ist bei ${PLAYERS[partner].name} nicht im Team.`)
  }
  if (dupe) {
    const seen = new Set<number>()
    for (const row of mine) {
      if (!row.dex_id) continue
      if (seen.has(row.dex_id)) warnings.push(`Dupes-Clause: ${row.pokemon ?? 'eine Art'} ist doppelt im Team.`)
      seen.add(row.dex_id)
    }
  }
  if (types) {
    const seen = new Map<string, string>()
    for (const row of mine) {
      const type = monById(row.dex_id)?.t1
      if (!type) continue
      const first = seen.get(type)
      if (first) warnings.push(`Typen-Clause: ${type} kommt bei ${first} und ${monName(row)} vor.`)
      else seen.set(type, monName(row))
    }
  }
  return warnings
}
