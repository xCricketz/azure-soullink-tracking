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
  { gameName: 'Roark', name: 'Roark', city: 'Oreburgh', type: 'Rock', field: 'Sandstorm', team: 'Nosepass, Larvitar, Cranidos' },
  { gameName: 'Gardenia', name: 'Gardenia', city: 'Eterna', type: 'Grass', field: 'Rain', team: 'Roserade, Cherrim, Roserade' },
  { gameName: 'Fantina', name: 'Fantina', city: 'Hearthome', type: 'Ghost', field: '', team: 'Misdreavus, Drifblim, Gengar, Mismagius' },
  { gameName: 'Maylene', name: 'Maylene', city: 'Veilstone', type: 'Fighting', field: '', team: 'Lucario with an Expert Belt' },
  { gameName: 'Wake', name: 'Wake', city: 'Pastoria', type: 'Water', field: 'Rain, doubles', team: 'Gyarados, Quagsire, Poliwrath, Floatzel' },
  { gameName: 'Byron', name: 'Byron', city: 'Canalave', type: 'Steel', field: 'Sandstorm, doubles', team: 'Aerodactyl, Bronzong, Kabutops, Steelix, Bastiodon' },
  { gameName: 'Candice', name: 'Candice', city: 'Snowpoint', type: 'Ice', field: 'Hail, doubles', team: 'Abomasnow, Mamoswine, Froslass, Medicham, Glaceon' },
  { gameName: 'Volkner', name: 'Volkner', city: 'Sunyshore', type: 'Electric', field: 'Rain, doubles', team: 'Rotom-Wash, Jolteon, Octillery, Ambipom, Luxray, Electivire' },
]

/** Azure Platinum gym order: Roark, Gardenia, Fantina, Maylene, Wake, Byron, Candice, Volkner. */
export const LEADERS: GymLeader[] = COPY.map((row) => {
  const src = guide.gyms.find((gym) => gym.leader === row.gameName)
  return { ...row, ace: src?.ace_level ?? 0 }
})

export function nextLeader(badges: number): GymLeader | null {
  if (badges < 0 || badges >= LEADERS.length) return null
  return LEADERS[badges] ?? null
}
