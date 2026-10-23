import guide from '../data/azure-platinum-guide.json'

const LABELS: Record<string, string> = {
  'Rival 1': 'Rivale 1',
  'Paul 1': 'Paul 1',
  'Rival 2': 'Rivale 2',
  Roark: 'Veit',
  Mars: 'Mars',
  'Cheryl 1': 'Cheryl',
  Gardenia: 'Silvana',
  'Jupiter 1': 'Jupiter',
  'Mira 1': 'Mira',
  Tournament: 'Turnier',
  Fantina: 'Lamina',
  'Rival 3': 'Rivale 3',
  Maylene: 'Hilda',
  'Reggie 1': 'Reggie',
  'Conway 2': 'Conway',
  Wake: 'Wilhelm',
  'Nando 2': 'Nando',
  'Cyrus 1': 'Zyrus',
  'Rival 4': 'Rivale 4',
  'Riley 1': 'Riley',
  Byron: 'Adam',
  'Mars 2': 'Mars 2',
  Candice: 'Frida',
  'J 3': 'Jäger J',
  'Saturn 2': 'Saturn',
  'Cyrus 4': 'Zyrus 4',
  Jasmine: 'Jasmin',
  'Reggie 2': 'Reggie 2',
  Marley: 'Marley',
  Rowan: 'Prof. Eibe',
  'Elite Four': 'Top Vier',
}

export interface CapStep {
  label: string
  level: number
}

export const CAPS: CapStep[] = guide.level_caps.caps.map((entry) => {
  const name = String(entry[0])
  const level = Number(entry[1])
  return { label: LABELS[name] ?? name, level }
})

/** Next documented cap strictly above the saved value. The first cap, when none is set. */
export function suggestedCap(current: number | null | undefined): CapStep | null {
  const floor = current ?? 0
  return CAPS.find((cap) => cap.level > floor) ?? null
}
