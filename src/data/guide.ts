import { CAPS } from '../lib/caps'
import { LEADERS } from '../lib/gym'

export type GuideSection = 'anime' | 'exclusive' | 'gyms' | 'caps' | 'nuzlocke' | 'comfort'

export interface GuideCard {
  id: string
  section: GuideSection
  kicker: string
  title: string
  summary: string
  body?: string
  bullets?: string[]
  warn?: boolean
}

export const GUIDE_FILTERS: { id: GuideSection | 'all'; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'anime', label: 'Anime' },
  { id: 'exclusive', label: 'Exklusives' },
  { id: 'gyms', label: 'Arenen' },
  { id: 'caps', label: 'Level-Caps' },
  { id: 'nuzlocke', label: 'Nuzlocke' },
  { id: 'comfort', label: 'Komfort' },
]

const CARDS: GuideCard[] = [
  {
    id: 'paul',
    section: 'anime',
    kicker: 'Anime',
    title: 'Paul',
    summary: 'Rivale aus der Serie, mehrfach und als Partner.',
    body: 'Kämpfe am See der Wahrheit (3× Staralili Lv. 6), am Kühnheitsufer, am Stärkenufer und auf Lilienbecken. Im Tag-Turnier von Herzhofen ist er euer Partner. Sein Starter wird in einer Szene freigelassen. Auf Route 209 könnt ihr „Pauls Pokémon“ einen Spitznamen geben.',
  },
  {
    id: 'cast',
    section: 'anime',
    kicker: 'Anime',
    title: 'Conway, Nando, Mira, Reggie',
    summary: 'Vier Figuren aus der Serie, über die Story verteilt.',
    bullets: [
      'Conway: Trainerschule in Jubelstadt, Herzhofen, Weideburg, Lilienbecken.',
      'Nando: Flori, Herzhofen, Route 212, Lilienbecken.',
      'Mira: Bizarre Höhle (Cap 36, danach Partnerin), später Lilienbecken.',
      'Reggie: Doppelkampf in Schleiede, später Siegesstraße (Cap 94). Mit Latias oder Latios im Team gibt es ein Seelen-Tau.',
    ],
  },
  {
    id: 'hunter',
    section: 'anime',
    kicker: 'Anime',
    title: 'Jäger J',
    summary: 'Drei Bosskämpfe.',
    body: 'Zuerst als „Jägerin ???“ im Bergbaumuseum von Erzelingen. Danach in den Trostu-Ruinen, fünf Runden lang mit Trickraum. Zuletzt im Blizzach-Tempel. Der dritte Kampf sitzt auf Cap 75.',
  },
  {
    id: 'guests',
    section: 'anime',
    kicker: 'Anime',
    title: 'Gäste',
    summary: 'Jasmin, Troy, Wassili, Brandon, Prof. Eich und Looker.',
    bullets: [
      'Jasmin: Doppelkampf in Sonnewik, Cap Richtung 90. Danach die Klare Glocke, wenn die Johto-Bestien anstehen.',
      'Troy: Eiseninsel, Rote und Jade-Kugel, Eisentafel.',
      'Wassili: Kühnheitsufer, Blaue Kugel, Wassertafel.',
      'Brandon: Blizzach-Tempel, Erdafel, im Postgame.',
      'Prof. Eich: Ewigenau, Kanto-Vögel und die Gezeitenglocke.',
      'Looker nimmt Charon am Kahlberg fest. Buck wartet danach auf dem Kampffeld.',
    ],
  },
  {
    id: 'rowan',
    section: 'anime',
    kicker: 'Anime',
    title: 'Prof. Eibe',
    summary: 'Route 224, sechs Pokémon auf Lv. 99.',
    body: 'Vor der Liga kämpft Prof. Eibe auf Route 224. Im Team sind alle drei Endentwicklungen der Sinnoh-Starter. Cap 99.',
  },
  {
    id: 'diamond',
    section: 'anime',
    kicker: 'Anime',
    title: 'Trainer Diamond',
    summary: 'Geheimkampf auf Mt. Victory, alles Lv. 100.',
    body: 'Nach Arceus wartet auf dem Gipfel von Mt. Victory ein vertrauter Trainer, zusammen mit Cynthia. Pikachu, Lucario, Chelterrar, Mesprit, Dialga und Arceus, alle Lv. 100.',
  },
  {
    id: 'author',
    section: 'anime',
    kicker: 'Anime',
    title: 'Memory5ty7',
    summary: 'Der Autor, Haus am Kühnheitsufer.',
    body: 'Sobald Operation AZURE läuft, kämpft ihr im Haus am Kühnheitsufer gegen den Autor. Nach Diamond gibt es einen Rückkampf im Doppel, unter anderem mit Ho-Oh und Lugia. Beide Kämpfe geben einen Meisterball (seit v1.1.0). Der Sieg schaltet Celebi frei.',
  },
  {
    id: 'dex',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Alle 493 Pokémon',
    summary: 'Jede Art aus den ersten vier Generationen ist fangbar.',
    body: 'Alles, was fehlt, kommt über Entwicklung oder einen festen Ort. Jedes Legendäre ist fangbar. Was ihr besiegt, könnt ihr nach der Liga erneut stellen.',
  },
  {
    id: 'starters',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Starter und Geschenke',
    summary: 'Drei Starter, dazu Evoli, Porygon, Togepi und Riolu.',
    bullets: [
      'Route 201: Starter Lv. 5.',
      'Ewigenau: eine ältere Frau schenkt den Starter mit Typvorteil, Lv. 5. Nach Jupiter gibt Cynthia ein Togepi-Ei.',
      'Herzhofen: Evoli Lv. 35 von Bebe.',
      'Route 209: Starter mit Typnachteil, Lv. 35.',
      'Schleiede: Porygon Lv. 40 in einem Haus.',
      'Eiseninsel: Riolu-Ei von Riley.',
      'Pokémon-Villa: Manaphy-Ei, Postgame.',
    ],
  },
  {
    id: 'trades',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Geänderte Tausche',
    summary: 'Vier Ingame-Tausche tauschen andere Arten.',
    body: 'Erzelingen: Knacklion gegen Tanhel. Ewigenau: Skorgla gegen Mampfaxo. Blizzach: Mamutel gegen Chaneira. Route 226: Barschwa gegen Karpador mit 6×31 IVs. Getauschte Pokémon gehorchen immer.',
  },
  {
    id: 'areas',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Neue Gebiete',
    summary: 'Lilienbecken, Mt. Victory, Tag-Turnier.',
    bullets: [
      'Tag-Turnier in Herzhofen: neu, mit Paul als Partner. Gegner sind unter anderem Nando, der Rivale und Conway. Cap 40.',
      'Lilienbecken: neue Insel mit einem Liga-Turnier vor der Siegesstraße. Im Postgame Titelverteidigung und das Weltturnier, dazu eigene Musik.',
      'Mt. Victory: auf derselben Insel, erst nach Arceus.',
    ],
  },
  {
    id: 'azure',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Operation AZURE',
    summary: 'Postgame im Stil der Delta-Episode.',
    body: 'Nach der Liga mit Prof. Eibe in Zweiborken sprechen. Das schaltet den Nationaldex und den Ferienort frei. Alle 16 Arceus-Tafeln ergeben die Azurflöte, und Arceus auf Lv. 100 wartet an der Speersäule. Das Kampffeld im Überlebensareal lässt euch Arenaleiter und Partner erneut stellen, sobald Charon festgenommen ist.',
  },
  {
    id: 'legendaries',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Legendäre im Postgame',
    summary: 'Meist Lv. 80–90, oft an Tafeln, Kugeln oder Glocken gebunden.',
    body: 'Kanto-Vögel, Mewtu und Mew, die Johto-Bestien, Lugia und Ho-Oh auf Mt. Victory, die Regis, Latias und Latios, das Hoenn-Wettertrio auf den Routen 226, 227 und 230, Jirachi, Deoxys, Celebi, Dialga und Palkia, Heatran, Regigigas, Cresselia, Darkrai, Manaphy, Shaymin und Arceus.',
  },
  {
    id: 'items',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Items',
    summary: 'Alte Key-Items sind ersetzt. Im Kampf nur noch Bälle.',
    bullets: [
      'Finder wird zum Porta-PC, Beutesack zum Eisstein, Regelbuch zur Prismenschuppe, Siegelbeutel zur Klaren Glocke.',
      'Rote Kette wird zur Gezeitenglocke, Bootsticket zur Roten Kugel, Wettbewerbskarte zur Blauen Kugel, Magmastein zur Jade-Kugel.',
      'Im Kampf wirken keine Items außer Pokébällen. Vitamine tun nichts. Hypertrank heilt 120 KP.',
      'Alle Entwicklungsitems sind kaufbar und wirken ohne Tausch. Sonderbonbon kostet in jedem Laden 1 ₽.',
    ],
  },
  {
    id: 'moves',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Attacken',
    summary: 'Neuere Attacken, überarbeitete K.O.-Treffer.',
    body: 'Dazu gehören unter anderem Pferdestärke, Voltwechsel und Solarklinge. K.O.-Attacken und ein Teil der Statusattacken sind umgebaut. v1.2.0 hat alle Lernlisten neu gemacht und Entwicklungen über Freundschaft entfernt. Die Doku dazu ist noch auf v1.1.1 stehen geblieben.',
  },
  {
    id: 'difficulty',
    section: 'exclusive',
    kicker: 'Exklusiv',
    title: 'Schwierigkeit',
    summary: 'Start auf Schwer. Umschalten im Porta-PC.',
    body: 'Schwer sind die Teams aus v1.0.x und erzwingen den Auswahlmodus. Normal und Schwer lassen sich nach dem zweiten Besuch am See der Wahrheit jederzeit im Porta-PC umschalten. Die Ass-Level in diesem Guide gelten für den Normal-Modus. Die Schwer-Teams sind nicht ausgewertet.',
  },
  {
    id: 'random',
    section: 'exclusive',
    kicker: 'Offen',
    title: 'Randomizer',
    summary: 'Nicht dokumentiert.',
    body: 'Der Autor sagt nichts dazu, ob der Hack durch einen Randomizer laufen kann. Begegnungen und Teams sind fest eingebaut. Ob es geht, ist unbekannt.',
  },
  {
    id: 'nuz-off',
    section: 'nuzlocke',
    kicker: 'Nuzlocke',
    title: 'Der Modus geht nach einer Niederlage aus',
    summary: 'PC-Pokémon werden trotzdem wiederbelebt.',
    warn: true,
    body: 'Der eingebaute Nuzlocke heilt besiegte Pokémon nicht, weder im Center noch bei NPCs. Beleber wirken nicht, auch Sonderbonbons nicht, und die Pension ist zu. Verliert ihr einen Kampf, wird das Team geheilt und der Modus schaltet sich AUS. Pokémon, die im PC liegen, werden trotzdem wiederbelebt. Die Regeln haltet ihr selbst. In v1.0.2 war der Modus kaputt, seit v1.1.0 läuft er wieder. Ihr schaltet ihn im Porta-PC ein.',
  },
  {
    id: 'nuz-enc',
    section: 'nuzlocke',
    kicker: 'Nuzlocke',
    title: 'Begegnungen',
    summary: 'Keine Tageszeit, kein Radar, kein GBA-Slot.',
    body: 'Begegnungen hängen nicht an der Uhr, am Pokéradar oder an einem GBA-Spiel. In frühen Städten liegt neues Gras, in Jubelstadt ist das seit v1.1.0/1.1.1 repariert. Die Fangrate ist deutlich höher, seltene Arten noch einmal doppelt so leicht. Der erste Fang pro Route gilt bei euch trotzdem.',
  },
  {
    id: 'nuz-mandatory',
    section: 'nuzlocke',
    kicker: 'Nuzlocke',
    title: 'Pflichtkämpfe',
    summary: 'Viele Trainer sind Pflicht. Turniere können hängen.',
    body: 'Eine ganze Reihe Trainer lässt sich nicht mehr umgehen. Turniere können das Spiel einfrieren. Der Autor rät, nach jedem Kampf zu speichern.',
  },
  {
    id: 'porta',
    section: 'comfort',
    kicker: 'Komfort',
    title: 'Porta-PC',
    summary: 'PC und Heilung von Zweiborken an, überall.',
    body: 'Später kommen Namensbewerter, Attacken-Verlerner, Attacken-Erinnerer, eine Geheimkraft-Prüfung, Attackenlehrer, die Schwierigkeit und der Tafel-Zähler für Operation AZURE dazu.',
  },
  {
    id: 'qol',
    section: 'comfort',
    kicker: 'Komfort',
    title: 'Tempo und Regeln',
    summary: 'Keine EVs, unbegrenzte TMs, keine Items im Kampf.',
    bullets: [
      'Framerate ohne Deckel, schnellere KP-Balken, kürzere VM-Animationen.',
      'Weniger VMs nötig, VMs sind verlernbar, TMs sind unbegrenzt.',
      'Schutz wirkt nach und fragt nach.',
      'Tausch-Entwicklungen brauchen keinen Partner.',
      'Keine EVs.',
    ],
  },
  {
    id: 'compat',
    section: 'comfort',
    kicker: 'Komfort',
    title: 'Geräte und Spielstände',
    summary: 'Seit v1.1.0 auch auf der Konsole.',
    body: 'Getestet mit TwilightMenu++. Ältere Spielstände lassen sich über die Option zur importierten Speichergröße übernehmen. Aktueller Patch ist v1.2.0 vom 25.12.2025. Die Textdateien, aus denen dieser Guide kommt, tragen noch v1.1.1.',
  },
]

function gymCards(): GuideCard[] {
  return LEADERS.map((gym, index) => ({
    id: `gym-${index + 1}`,
    section: 'gyms' as const,
    kicker: 'Arena',
    title: `${index + 1}. ${gym.name}`,
    summary: `${gym.city} · Ass Lv. ${gym.ace}${gym.field ? ` · ${gym.field}` : ''}`,
    body: `${gym.type}${gym.field ? `, ${gym.field}` : ''}. Im Spiel: ${gym.gameName}. Team im Normal-Modus, alles auf dem Ass-Level: ${gym.team}. Schwer hat andere Teams und ist hier nicht aufgeführt.`,
  }))
}

function capCard(): GuideCard {
  return {
    id: 'caps',
    section: 'caps',
    kicker: 'Level-Cap',
    title: 'Dokumentierte Caps',
    summary: 'Optional, von 6 bis 100. Sonderbonbon kostet 1 ₽ und wirkt nur bis zum Cap.',
    body: 'Der harte Cap ist der höchste Level des nächsten Bosses. Am Cap gibt es keine EP und keine Sonderbonbons. Startwert ist 6. Die Pension bleibt zu, bis der Cap auf 100 steht. Die Liste stammt aus der Cap-Datei des Hacks. Um Mira und das Turnier weichen die Trainer-Notizen leicht ab. Auf der Routen-Kachel übernimmt ein Tipp den nächsten Wert.',
    bullets: CAPS.map((cap) => `${cap.label} · Lv ${cap.level}`),
  }
}

export const GUIDE_CARDS: GuideCard[] = [...CARDS.filter((card) => card.section === 'anime' || card.section === 'exclusive'), ...gymCards(), capCard(), ...CARDS.filter((card) => card.section === 'nuzlocke' || card.section === 'comfort')]

export const GUIDE_NOTE = 'Quellen sind die offiziellen Textdateien des Hacks, Stand Doku v1.1.1, Spiel v1.2.0. Ass-Level gelten für den Normal-Modus. Was hier fehlt, ist nicht geprüft. Der Discord des Autors ist nicht ausgewertet.'
