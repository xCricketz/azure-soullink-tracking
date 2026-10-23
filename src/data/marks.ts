export type MarkKind = 'anime' | 'event' | 'gift'

export interface RouteMark {
  kind: MarkKind
  label: string
  detail: string
}

const MARKS: Record<string, RouteMark[]> = {
  'Route 201': [{ kind: 'event', label: 'Event', detail: 'Rival, cap 6 to 7. Starter at Lv. 5.' }],
  'See der Wahrheit': [{ kind: 'anime', label: 'Anime', detail: 'Paul with 3× Starly at Lv. 6. Difficulty unlocks in the Pokétch PC afterwards.' }],
  'Route 203': [{ kind: 'event', label: 'Event', detail: 'Rival. The cap rises to 16.' }],
  Windkraftwerk: [{ kind: 'event', label: 'Event', detail: 'Commander Mars, cap 20. Then a Lv. 18 Drifloon on the map.' }],
  Ewigwald: [{ kind: 'event', label: 'Event', detail: 'Cheryl, cap 24, then she joins you.' }],
  'Bizarre Höhle': [{ kind: 'anime', label: 'Anime', detail: 'Mira, cap 36, then she joins you.' }],
  'Route 207': [{ kind: 'event', label: 'Event', detail: 'On the way back, a battle with Dawn or Lucas.' }],
  'Tag-Turnier': [{ kind: 'anime', label: 'Anime', detail: 'New tag battle. Your partner is Paul. Cap 40.' }],
  'Route 209': [
    { kind: 'gift', label: 'Gift', detail: 'A starter weak to yours at Lv. 35. Misdreavus at Lv. 40 if you have the Odd Keystone.' },
    { kind: 'anime', label: 'Anime', detail: 'You can nickname Paul’s Pokémon here.' },
  ],
  'Trostu-Ruinen': [{ kind: 'anime', label: 'Anime', detail: 'Hunter J. Five turns of Trick Room.' }],
  'Route 212': [{ kind: 'anime', label: 'Anime', detail: 'Nando on the Hearthome side.' }],
  Kühnheitsufer: [{ kind: 'anime', label: 'Anime', detail: 'Battle with Paul.' }],
  'See der Kühnheit': [{ kind: 'event', label: 'Event', detail: 'Commander Saturn at the lake later.' }],
  Eiseninsel: [{ kind: 'gift', label: 'Gift', detail: 'Riley, then he joins you. A Riolu Egg from Riley.' }],
  'Blizzach-Tempel': [{ kind: 'anime', label: 'Anime', detail: 'Boss battle with Hunter J.' }],
  Stärkenufer: [{ kind: 'anime', label: 'Anime', detail: 'Battle with Paul.' }],
  Speersäule: [{ kind: 'event', label: 'Event', detail: 'Cyrus in a double battle. Arceus in the postgame.' }],
  Zerrwelt: [{ kind: 'event', label: 'Event', detail: 'Cyrus. Then Giratina at Lv. 85 and the lake trio at Lv. 80.' }],
  Siegesstraße: [{ kind: 'anime', label: 'Anime', detail: 'Reggie, cap 94. Marley, cap 99, then she joins you.' }],
  'Route 224': [{ kind: 'event', label: 'Event', detail: 'Professor Rowan with six Pokémon at Lv. 99.' }],
  Lilienbecken: [{ kind: 'anime', label: 'Anime', detail: 'New island. A league tournament before Victory Road, with Dawn, Nando, Mira, Conway, and Paul.' }],
  'Pokémon-Liga': [{ kind: 'event', label: 'Event', detail: 'Elite Four and Cynthia. Cap 100. Aaron with rain, Bertha with sandstorm, Flint with sun.' }],
  'Operation AZURE': [{ kind: 'event', label: 'Event', detail: 'Postgame in the style of the Delta Episode. 16 plates, the Azure Flute, Arceus at Lv. 100.' }],
  'Mt. Victory': [{ kind: 'event', label: 'Event', detail: 'After Arceus. Trainer Diamond waits at the top with Cynthia, everything at Lv. 100.' }],
}

export function marksFor(name: string): RouteMark[] {
  return MARKS[name] ?? []
}
