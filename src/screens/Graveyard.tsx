import { useMemo, useState } from 'react'
import { Dialog, Sprite } from '../components/ui'
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
      <header className="grave-hero">
        <Candle />
        <h2 className="pixel">FRIEDHOF</h2>
        <p>{souls} {souls === 1 ? 'Seele verloren' : 'Seelen verloren'}</p>
      </header>
      {!tombs.length && <p className="empty-copy">Noch ist niemand gefallen. So soll es bleiben.</p>}
      <div className="tombs">
        {tombs.map((row) => {
          const names = [row.fisi, row.seri].filter((item) => item?.status === 'dead').map((item) => monName(item))
          const pairNames = `${monName(row.fisi)} & ${monName(row.seri)}`
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
              <div className="tomb-sprites">
                <Sprite id={row.fisi?.dex_id} alt={row.fisi?.pokemon ?? 'Fisi'} dim />
                <Sprite id={row.seri?.dex_id} alt={row.seri?.pokemon ?? 'Seri'} dim />
              </div>
              <h3>{names.length === 2 ? pairNames : names.join(' & ')}</h3>
              <p>{[row.fisi?.pokemon, row.seri?.pokemon].filter(Boolean).join(' · ')}</p>
              <p>{row.route.name}</p>
              {when && <p>gefallen am {formatDate(when)}</p>}
              {cause && <p className="cause">{cause}</p>}
              <p className="epitaph">„{epitaphText || 'Ruhe in Frieden, tapferer Freund.'}“</p>
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

function Candle() {
  return (
    <svg className="candle" viewBox="0 0 64 48" aria-hidden="true">
      <path d="M18 46h28l-4-16H22z" fill="#2E3A5E" />
      <rect x="28" y="20" width="8" height="12" rx="1" fill="#F4F6FB" />
      <path d="M32 8c4 5 6 8 0 12c-6-4-4-7 0-12z" fill="#B98CFF" />
    </svg>
  )
}
