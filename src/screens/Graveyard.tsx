import { Flame, Swords, Unlink2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Dialog, SpritePlate } from '../components/ui'
import { graveRows, pairRows } from '../lib/pairs'
import { useApp } from '../state/context'
import { formatDate, monName } from '../lib/text'

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
        <h2 className="pixel">FRIEDHOF</h2>
        <div className="cnt">
          <b>{souls}</b>
          {souls === 1 ? 'Seele verloren' : 'Seelen verloren'} · {tombs.length} {tombs.length === 1 ? 'Paar' : 'Paare'}
        </div>
      </header>
      {!tombs.length && <p className="empty-copy">Noch ist niemand gefallen. So soll es bleiben.</p>}
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
                <Side label="Fisi" dex={row.fisi?.dex_id} species={row.fisi?.pokemon} player="fisi" />
                <div className="chain"><span><Unlink2 aria-hidden="true" /></span></div>
                <Side label="Seri" dex={row.seri?.dex_id} species={row.seri?.pokemon} player="seri" />
              </div>
              <h3>{monName(row.fisi)} & {monName(row.seri)}</h3>
              <div className="when">{row.route.name}{when ? ` · gefallen am ${formatDate(when)}` : ''}</div>
              {cause && <div className="cause"><Swords aria-hidden="true" />{cause}</div>}
              <div className="ep">„{epitaphText || 'Ruhe in Frieden, tapferer Freund.'}“</div>
            </button>
          )
        })}
      </div>
      {tomb && (
        <div className="overlay" onClick={() => setRoute(null)}>
          <div className="sheet-align" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tomb-title">
            <div className="sheet">
              <h2 id="tomb-title" className="sheet-title">{tomb.route.name}</h2>
              <div className="sheet-body">
                <p>{monName(tomb.fisi)} & {monName(tomb.seri)}</p>
                {mine ? (
                  <label className="field">
                    <span>Epitaph</span>
                    <textarea
                      value={epitaph}
                      maxLength={140}
                      rows={3}
                      placeholder="Ruhe in Frieden, tapferer Freund."
                      aria-label="Epitaph"
                      onChange={(event) => setEpitaph(event.target.value)}
                    />
                  </label>
                ) : (
                  <p className="hint">Für diese Seite gibt es noch keinen eigenen Eintrag.</p>
                )}
              </div>
              <div className="sheet-foot stack">
                {mine && (
                  <button className="btn btn-primary" type="button" onClick={() => void app.saveEpitaph(mine.id, epitaph)}>
                    Epitaph speichern
                  </button>
                )}
                <button className="btn btn-ghost" type="button" onClick={() => setConfirm(true)}>Wiederbeleben</button>
                <button className="btn btn-ghost" type="button" onClick={() => setRoute(null)}>Schließen</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={confirm}
        title="Beide wiederbeleben?"
        actions={[
          { label: 'Ja, zurückholen', tone: 'primary', onClick: () => { if (route) void app.revivePair(route); setConfirm(false); setRoute(null) } },
          { label: 'Zurück', tone: 'ghost', onClick: () => setConfirm(false) },
        ]}
      >
        <p>Der Status wird für das Paar auf Lebt gesetzt. Ein Versehen lässt sich so zurücknehmen.</p>
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
