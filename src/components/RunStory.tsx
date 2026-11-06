import { routeTitleByKey } from '../data/routes'
import { runStory } from '../lib/run-story'
import { PLAYERS, type Catch } from '../lib/types'

export function RunStory({ catches }: { catches: Catch[] }) {
  const story = runStory(catches)
  const routeMax = story.deathsByRoute[0]?.count ?? 1
  const causeMax = story.causes[0]?.count ?? 1
  return (
    <div className="run-story" data-story-screen="true">
      <div className="cap-board">
        <div>
          <small>{PLAYERS.fisi.name}</small>
          <b>{story.deathsByPlayer.fisi}</b>
          <span>fainted</span>
        </div>
        <div>
          <small>{PLAYERS.seri.name}</small>
          <b>{story.deathsByPlayer.seri}</b>
          <span>fainted</span>
        </div>
      </div>
      <h3>By route</h3>
      {story.deathsByRoute.length === 0 ? <p className="import-help">No faints yet.</p> : (
        <ul className="bars">
          {story.deathsByRoute.map((row) => (
            <li key={row.route}>
              <span>{routeTitleByKey(row.route)}</span>
              <span className="bar" style={{ ['--w' as string]: `${Math.round((row.count / routeMax) * 100)}%` }} />
              <b>{row.count}</b>
            </li>
          ))}
        </ul>
      )}
      <h3>Causes</h3>
      {story.causes.length === 0 ? <p className="import-help">No causes written.</p> : (
        <ul className="bars">
          {story.causes.map((row) => (
            <li key={row.cause}>
              <span>{row.cause}</span>
              <span className="bar" style={{ ['--w' as string]: `${Math.round((row.count / causeMax) * 100)}%` }} />
              <b>{row.count}</b>
            </li>
          ))}
        </ul>
      )}
      <h3>Timeline</h3>
      {story.timeline.length === 0 ? <p className="import-help">Nothing logged yet.</p> : (
        <ol className="timeline">
          {story.timeline.map((event, index) => (
            <li key={`${event.at}-${event.kind}-${event.name}-${index}`}>
              <time>{event.at.slice(0, 10)}</time>
              <span>{event.kind === 'death' ? 'Fainted' : 'Caught'} · {PLAYERS[event.player].name} · {event.name}</span>
              <small>{routeTitleByKey(event.route)}{event.cause ? ` · ${event.cause}` : ''}</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
