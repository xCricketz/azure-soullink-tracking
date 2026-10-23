import { ChevronDown, Search, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GUIDE_CARDS, GUIDE_FILTERS, GUIDE_NOTE, type GuideSection } from '../data/guide'
import { norm } from '../lib/text'
import { cx } from '../components/ui'

export function Guide() {
  const [filter, setFilter] = useState<GuideSection | 'all'>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState<Set<string>>(() => new Set(['nuz-off']))

  const visible = useMemo(() => {
    const needle = norm(query)
    return GUIDE_CARDS.filter((card) => {
      if (filter !== 'all' && card.section !== filter) return false
      if (!needle) return true
      const hay = [card.title, card.summary, card.body, card.kicker, ...(card.bullets ?? [])].join(' ')
      return norm(hay).includes(needle)
    })
  }, [filter, query])

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="screen guide">
      <aside className="nbanner">
        <TriangleAlert size={18} aria-hidden="true" />
        <div>
          <strong>Nuzlocke-Modus geht nach einer Niederlage aus</strong>
          <p>Das Team wird geheilt und der Schalter fällt auf aus. Pokémon im PC werden trotzdem wiederbelebt. Die Soul-Link-Regeln haltet ihr selbst.</p>
        </div>
      </aside>
      <div className="chips" role="toolbar" aria-label="Guide filtern">
        {GUIDE_FILTERS.map((chip) => (
          <button
            key={chip.id}
            className={cx('chip', filter === chip.id && 'on')}
            type="button"
            aria-pressed={filter === chip.id}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
        <button
          className={cx('chip', searching && 'on')}
          type="button"
          aria-label={searching ? 'Suche schließen' : 'Im Guide suchen'}
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
          placeholder="Figur, Arena, Item, Ort"
          aria-label="Guide durchsuchen"
          autoFocus
        />
      )}
      <div className="gcards">
        {visible.map((card) => {
          const expanded = open.has(card.id) || norm(query).length > 0
          return (
            <article key={card.id} className={cx('gcard', card.warn && 'warn')}>
              <button type="button" aria-expanded={expanded} onClick={() => toggle(card.id)}>
                <span>
                  <small>{card.kicker}</small>
                  <strong>{card.title}</strong>
                  {!expanded && <em>{card.summary}</em>}
                </span>
                <ChevronDown className={cx('chev', expanded && 'flip')} size={18} aria-hidden="true" />
              </button>
              {expanded && (
                <div className="gcard-body">
                  <p>{card.summary}</p>
                  {card.body && <p>{card.body}</p>}
                  {card.bullets && (
                    <ul>
                      {card.bullets.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </article>
          )
        })}
        {!visible.length && <p className="hint center">Nichts passt auf die Suche.</p>}
      </div>
      <p className="gnote">{GUIDE_NOTE}</p>
    </div>
  )
}
