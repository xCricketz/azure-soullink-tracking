import guide from '../data/azure-platinum-guide.json'

export interface GymLeader {
  name: string
  gameName: string
  ace: number
  city: string
  type: string
  field: string
  team: string
}

const COPY: Omit<GymLeader, 'ace'>[] = [
  { gameName: 'Roark', name: 'Veit', city: 'Erzelingen', type: 'Gestein', field: 'Sandsturm', team: 'Nasgnet, Larvitar, Koknodon' },
  { gameName: 'Gardenia', name: 'Silvana', city: 'Ewigenau', type: 'Pflanze', field: 'Regen', team: 'Chelcarain, Papungha, Roserade' },
  { gameName: 'Fantina', name: 'Lotte', city: 'Herzhofen', type: 'Geist', field: '', team: 'Kryppuk, Drifzepeli, Gengar, Traunmagil' },
  { gameName: 'Maylene', name: 'Hilda', city: 'Schleiede', type: 'Kampf', field: '', team: 'Lucario mit Expertengurt' },
  { gameName: 'Wake', name: 'Marinus', city: 'Weideburg', type: 'Wasser', field: 'Regen, Doppelkampf', team: 'Garados, Morlord, Quappo, Bojelin' },
  { gameName: 'Byron', name: 'Adam', city: 'Fleetburg', type: 'Stahl', field: 'Sandsturm, Doppelkampf', team: 'Aerodactyl, Bronzong, Kabutops, Stolloss, Bollterus' },
  { gameName: 'Candice', name: 'Frida', city: 'Blizzach', type: 'Eis', field: 'Hagel, Doppelkampf', team: 'Rexblisar, Mamutel, Snibunna, Meditalis, Frosdedje' },
  { gameName: 'Volkner', name: 'Volkner', city: 'Sonnewik', type: 'Elektro', field: 'Regen, Doppelkampf', team: 'Rotom-Wash, Blitza, Octillery, Ambidiffel, Luxtra, Elevoltek' },
]

/** Azure Platinum gym order. Fantina is third, Maylene fourth, Wake fifth. */
export const LEADERS: GymLeader[] = COPY.map((row) => {
  const src = guide.gyms.find((gym) => gym.leader === row.gameName)
  return { ...row, ace: src?.ace_level ?? 0 }
})

export function nextLeader(badges: number): GymLeader | null {
  if (badges < 0 || badges >= LEADERS.length) return null
  return LEADERS[badges] ?? null
}
