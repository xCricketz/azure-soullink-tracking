export type MarkKind = 'anime' | 'event' | 'gift'

export interface RouteMark {
  kind: MarkKind
  label: string
  detail: string
}

const MARKS: Record<string, RouteMark[]> = {
  'Route 201': [{ kind: 'event', label: 'Event', detail: 'Rivale, Cap 6 auf 7. Starter auf Lv. 5.' }],
  'See der Wahrheit': [{ kind: 'anime', label: 'Anime', detail: 'Paul mit 3× Staralili Lv. 6. Danach schaltet sich die Schwierigkeit im Porta-PC frei.' }],
  'Route 203': [{ kind: 'event', label: 'Event', detail: 'Rivale, Cap steigt auf 16.' }],
  Windkraftwerk: [{ kind: 'event', label: 'Event', detail: 'Kommandantin Mars, Cap 20. Danach Driftlon Lv. 18 auf der Karte.' }],
  Ewigwald: [{ kind: 'event', label: 'Event', detail: 'Cheryl, Cap 24, danach als Partnerin.' }],
  'Bizarre Höhle': [{ kind: 'anime', label: 'Anime', detail: 'Mira, Cap 36, danach als Partnerin.' }],
  'Route 207': [{ kind: 'event', label: 'Event', detail: 'Auf dem Rückweg ein Kampf gegen Lucia oder Lucius.' }],
  'Tag-Turnier': [{ kind: 'anime', label: 'Anime', detail: 'Neues Tag-Turnier. Partner ist Paul. Cap 40.' }],
  'Route 209': [
    { kind: 'gift', label: 'Geschenk', detail: 'Starter mit Typnachteil auf Lv. 35. Kryppuk Lv. 40, wenn der Geisterstein dabei ist.' },
    { kind: 'anime', label: 'Anime', detail: 'Pauls Pokémon kann hier einen Spitznamen bekommen.' },
  ],
  'Trostu-Ruinen': [{ kind: 'anime', label: 'Anime', detail: 'Jäger J. Fünf Runden Trickraum.' }],
  'Route 212': [{ kind: 'anime', label: 'Anime', detail: 'Nando auf der Herzhofen-Seite.' }],
  Kühnheitsufer: [{ kind: 'anime', label: 'Anime', detail: 'Kampf gegen Paul.' }],
  'See der Kühnheit': [{ kind: 'event', label: 'Event', detail: 'Später Kommandant Saturn am See.' }],
  Eiseninsel: [{ kind: 'gift', label: 'Geschenk', detail: 'Riley, danach als Partner. Riolu-Ei von Riley.' }],
  'Blizzach-Tempel': [{ kind: 'anime', label: 'Anime', detail: 'Bosskampf gegen Jäger J.' }],
  Stärkenufer: [{ kind: 'anime', label: 'Anime', detail: 'Kampf gegen Paul.' }],
  Speersäule: [{ kind: 'event', label: 'Event', detail: 'Zyrus im Doppelkampf. Im Postgame Arceus.' }],
  Zerrwelt: [{ kind: 'event', label: 'Event', detail: 'Zyrus. Danach Giratina Lv. 85 und das Seetrio auf Lv. 80.' }],
  Siegesstraße: [{ kind: 'anime', label: 'Anime', detail: 'Reggie, Cap 94. Marley, Cap 99, danach als Partnerin.' }],
  'Route 224': [{ kind: 'event', label: 'Event', detail: 'Prof. Eibe mit sechs Pokémon auf Lv. 99.' }],
  Lilienbecken: [{ kind: 'anime', label: 'Anime', detail: 'Neue Insel. Liga-Turnier vor der Siegesstraße, mit Dawn, Nando, Mira, Conway und Paul.' }],
  'Pokémon-Liga': [{ kind: 'event', label: 'Event', detail: 'Top Vier und Cynthia. Cap 100. Aaron mit Regen, Terra mit Sandsturm, Ignaz mit Sonne.' }],
  'Operation AZURE': [{ kind: 'event', label: 'Event', detail: 'Postgame wie die Delta-Episode. 16 Tafeln, Azurflöte, Arceus Lv. 100.' }],
  'Mt. Victory': [{ kind: 'event', label: 'Event', detail: 'Nach Arceus. Oben wartet Trainer Diamond mit Cynthia, alles Lv. 100.' }],
}

export function marksFor(name: string): RouteMark[] {
  return MARKS[name] ?? []
}
