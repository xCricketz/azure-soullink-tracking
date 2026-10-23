import { Flame, Swords, Unlink2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Dialog, SpritePlate } from '../components/ui'
import { routeTitle } from '../data/routes'
import { graveRows, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { formatDate, monName, speciesName } from '../lib/text'

export function Graveyard() {
  const app = useApp()
  const tombs = useMemo(() => graveRows(pairRows(app.catches, app.customRoutes)), [app.catches, app.customRoutes])
  const souls = app.catches.filter((row) => row.status === 'dead').length
  const [route, setRoute] = useState<string | null>(null)
  const [epitaph, setEpitaph] = useState('')
  const [confirm, setConfirm] = useState(false)
  const tomb = tombs.find((row) => row.route.name === route)
  const mine = tomb?.[app.me]

  return (
    <div className="screen grave">
      <header className="fh">
        <div className="cand" aria-hidden="true">
          <Flame />
          <Flame />
        </div>
        <h2 className="pixel">GRAVEYARD</h2>
        <div className="cnt">
          <b>{souls}</b>
          {souls === 1 ? 'soul lost' : 'souls lost'} · {tombs.length} {tombs.length === 1 ? 'pair' : 'pairs'}
        </div>
      </header>
      {!tombs.length && <p className="empty-copy">Nobody has fallen yet. Let’s keep it that way.</p>}
      <div className="tombs">
        {tombs.map((row) => {
          const when = row.fisi?.died_at || row.seri?.died_at
          const cause = row.fisi?.death_cause || row.seri?.death_cause
          const epitaphText = row[app.me]?.epitaph || row.fisi?.epitaph || row.seri?.epitaph
          return (
            <button
              key={row.route.name}
              className="tomb"
              type="button"
              onClick={() => {
                setRoute(row.route.name)
                setEpitaph(row[app.me]?.epitaph ?? '')
              }}
            >
              <div className="pair">
                <Side label="Fisi" dex={row.fisi?.dex_id} species={row.fisi ? speciesName(row.fisi) : null} player="fisi" />
                <div className="chain"><span><Unlink2 aria-hidden="true" /></span></div>
                <Side label="Seri" dex={row.seri?.dex_id} species={row.seri ? speciesName(row.seri) : null} player="seri" />
              </div>
              <h3>{monName(row.fisi)} & {monName(row.seri)}</h3>
              <div className="when">{routeTitle(row.route)}{when ? ` · fainted on ${formatDate(when)}` : ''}</div>
              {cause && <div className="cause"><Swords aria-hidden="true" />{cause}</div>}
              <div className="ep">“{epitaphText || 'Rest in peace, brave friend.'}”</div>
            </button>
          )
        })}
      </div>
      {tomb && (
        <div className="overlay" onClick={() => setRoute(null)}>
          <div className="sheet-align" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tomb-title">
            <div className="sheet">
              <h2 id="tomb-title" className="sheet-title">{routeTitle(tomb.route)}</h2>
              <div className="sheet-body">
                <p>{monName(tomb.fisi)} & {monName(tomb.seri)}</p>
                {mine ? (
                  <label className="field">
                    <span>Epitaph</span>
                    <textarea
                      value={epitaph}
                      maxLength={140}
                      rows={3}
                      placeholder="Rest in peace, brave friend."
                      aria-label="Epitaph"
                      onChange={(event) => setEpitaph(event.target.value)}
                    />
                  </label>
                ) : (
                  <p className="hint">This side doesn’t have its own entry yet.</p>
                )}
              </div>
              <div className="sheet-foot stack">
                {mine && (
                  <button className="btn btn-primary" type="button" onClick={() => void app.saveEpitaph(mine.id, epitaph)}>
                    Save epitaph
                  </button>
                )}
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm(true)}>Revive</button>
                <button className="btn btn-ghost" type="button" onClick={() => setRoute(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={confirm}
        title="Revive both?"
        actions={[
          { label: 'Yes, bring them back', tone: 'primary', onClick: () => { if (route) void app.revivePair(route); setConfirm(false); setRoute(null) } },
          { label: 'Back', tone: 'ghost', onClick: () => setConfirm(false) },
        ]}
      >
        <p>Status becomes Alive for the pair. You can undo a mistake.</p>
      </Dialog>
    </div>
  )
}

function Side({ label, dex, species, player }: { label: string; dex?: number | null; species?: string | null; player: 'fisi' | 'seri' }) {
  return (
    <div>
      <SpritePlate id={dex} alt={species ?? label} grave />
      <span className={`who ${player}`}>{label}</span>
      <span className="species">{species ?? '—'}</span>
    </div>
  )
}
