export interface RouteDef {
  name: string
  en: string
  order: number
  group: string
}

/** Encounter locations in Azure Platinum story order. German name is the pair key. */
export const ROUTES: RouteDef[] = [
  { order: 10, name: 'Starter', en: 'Starter', group: 'Prolog' },
  { order: 20, name: 'Route 201', en: 'Route 201', group: 'Prolog' },
  { order: 30, name: 'Wahrheitsufer', en: 'Verity Lakefront', group: 'Prolog' },
  { order: 40, name: 'See der Wahrheit', en: 'Lake Verity', group: 'Prolog' },
  { order: 50, name: 'Route 202', en: 'Route 202', group: 'Prolog' },
  { order: 60, name: 'Route 204', en: 'Route 204', group: 'Jubelstadt' },
  { order: 70, name: 'Route 203', en: 'Route 203', group: 'Jubelstadt' },
  { order: 80, name: 'Erzelingen-Tor', en: 'Oreburgh Gate', group: 'Erzelingen' },
  { order: 90, name: 'Erzelingen-Mine', en: 'Oreburgh Mine', group: 'Erzelingen' },
  { order: 100, name: 'Fossil', en: 'Fossil', group: 'Erzelingen' },
  { order: 110, name: 'Verwüsteter Pfad', en: 'Ravaged Path', group: 'Erzelingen' },
  { order: 120, name: 'Auen von Flori', en: 'Floaroma Meadow', group: 'Ewigenau' },
  { order: 130, name: 'Windkraftwerk', en: 'Valley Windworks', group: 'Ewigenau' },
  { order: 140, name: 'Route 205', en: 'Route 205', group: 'Ewigenau' },
  { order: 150, name: 'Ewigwald', en: 'Eterna Forest', group: 'Ewigenau' },
  { order: 160, name: 'Alte Villa', en: 'Old Chateau', group: 'Ewigenau' },
  { order: 170, name: 'Feurio-Hütte', en: 'Fuego Ironworks', group: 'Ewigenau' },
  { order: 180, name: 'Route 211', en: 'Route 211', group: 'Ewigenau' },
  { order: 190, name: 'Route 206', en: 'Route 206', group: 'Kraterberg' },
  { order: 200, name: 'Route 207', en: 'Route 207', group: 'Kraterberg' },
  { order: 210, name: 'Bizarre Höhle', en: 'Wayward Cave', group: 'Kraterberg' },
  { order: 220, name: 'Bizarre Höhle (Versteckt)', en: 'Wayward Cave (hidden)', group: 'Kraterberg' },
  { order: 230, name: 'Kraterberg (Süd)', en: 'Mt. Coronet (south)', group: 'Kraterberg' },
  { order: 240, name: 'Route 208', en: 'Route 208', group: 'Herzhofen' },
  { order: 250, name: 'Tag-Turnier', en: 'Hearthome Tag Battle', group: 'Herzhofen' },
  { order: 260, name: 'Route 209', en: 'Route 209', group: 'Herzhofen' },
  { order: 270, name: 'Turm der Ruhenden', en: 'Lost Tower', group: 'Herzhofen' },
  { order: 280, name: 'Trostu-Ruinen', en: 'Solaceon Ruins', group: 'Herzhofen' },
  { order: 290, name: 'Route 210 (Süd)', en: 'Route 210 (south)', group: 'Herzhofen' },
  { order: 300, name: 'Route 215', en: 'Route 215', group: 'Schleiede' },
  { order: 310, name: 'Route 214', en: 'Route 214', group: 'Schleiede' },
  { order: 320, name: 'Maniac-Höhle', en: 'Maniac Tunnel', group: 'Schleiede' },
  { order: 330, name: 'Route 213', en: 'Route 213', group: 'Weideburg' },
  { order: 340, name: 'Kühnheitsufer', en: 'Valor Lakefront', group: 'Weideburg' },
  { order: 350, name: 'See der Kühnheit', en: 'Lake Valor', group: 'Weideburg' },
  { order: 360, name: 'Route 212', en: 'Route 212', group: 'Weideburg' },
  { order: 370, name: 'Großmoor', en: 'Great Marsh', group: 'Weideburg' },
  { order: 380, name: 'Route 210 (Nord)', en: 'Route 210 (north)', group: 'Weideburg' },
  { order: 390, name: 'Kraterberg (Mitte)', en: 'Mt. Coronet (mid)', group: 'Kraterberg' },
  { order: 400, name: 'Route 218', en: 'Route 218', group: 'Fleetburg' },
  { order: 410, name: 'Route 219', en: 'Route 219', group: 'Fleetburg' },
  { order: 420, name: 'Route 220', en: 'Route 220', group: 'Fleetburg' },
  { order: 430, name: 'Eiseninsel', en: 'Iron Island', group: 'Fleetburg' },
  { order: 440, name: 'Route 221', en: 'Route 221', group: 'Fleetburg' },
  { order: 450, name: 'Route 216', en: 'Route 216', group: 'Blizzach' },
  { order: 460, name: 'Kraterberg (Schnee)', en: 'Mt. Coronet (snow)', group: 'Blizzach' },
  { order: 470, name: 'Route 217', en: 'Route 217', group: 'Blizzach' },
  { order: 480, name: 'Stärkenufer', en: 'Acuity Lakefront', group: 'Blizzach' },
  { order: 490, name: 'See der Stärke', en: 'Lake Acuity', group: 'Blizzach' },
  { order: 500, name: 'Blizzach-Tempel', en: 'Snowpoint Temple', group: 'Blizzach' },
  { order: 510, name: 'Kraterberg (Gipfel)', en: 'Mt. Coronet (summit)', group: 'Speersäule' },
  { order: 520, name: 'Speersäule', en: 'Spear Pillar', group: 'Speersäule' },
  { order: 530, name: 'Zerrwelt', en: 'Distortion World', group: 'Speersäule' },
  { order: 540, name: 'Scheidequelle', en: 'Sendoff Spring', group: 'Speersäule' },
  { order: 550, name: 'Höhle der Umkehr', en: 'Turnback Cave', group: 'Speersäule' },
  { order: 560, name: 'Route 222', en: 'Route 222', group: 'Sonnewik' },
  { order: 570, name: 'Trophäengarten', en: 'Trophy Garden', group: 'Sonnewik' },
  { order: 580, name: 'Route 223', en: 'Route 223', group: 'Liga' },
  { order: 590, name: 'Lilienbecken', en: 'Lily of the Valley', group: 'Liga' },
  { order: 600, name: 'Siegesstraße', en: 'Victory Road', group: 'Liga' },
  { order: 610, name: 'Route 224', en: 'Route 224', group: 'Liga' },
  { order: 620, name: 'Pokémon-Liga', en: 'Pokémon League', group: 'Liga' },
  { order: 630, name: 'Honigbäume', en: 'Honey trees', group: 'Besonderes' },
  { order: 640, name: 'Vollmondinsel', en: 'Fullmoon Island', group: 'Besonderes' },
  { order: 650, name: 'Neumondinsel', en: 'Newmoon Island', group: 'Besonderes' },
  { order: 660, name: 'Blumenparadies', en: 'Flower Paradise', group: 'Besonderes' },
  { order: 670, name: 'Frühlingspfad', en: 'Spring Path', group: 'Besonderes' },
  { order: 680, name: 'Buhnenpfad', en: 'Seabreak Path', group: 'Besonderes' },
  { order: 690, name: 'Kampfareal', en: 'Fight Area', group: 'Kampfzone' },
  { order: 700, name: 'Route 225', en: 'Route 225', group: 'Kampfzone' },
  { order: 710, name: 'Route 226', en: 'Route 226', group: 'Kampfzone' },
  { order: 720, name: 'Route 227', en: 'Route 227', group: 'Kampfzone' },
  { order: 730, name: 'Kahlberg', en: 'Stark Mountain', group: 'Kampfzone' },
  { order: 740, name: 'Route 228', en: 'Route 228', group: 'Kampfzone' },
  { order: 750, name: 'Route 229', en: 'Route 229', group: 'Kampfzone' },
  { order: 760, name: 'Route 230', en: 'Route 230', group: 'Kampfzone' },
  { order: 770, name: 'Überlebensareal', en: 'Survival Area', group: 'Kampfzone' },
  { order: 780, name: 'Erholungsareal', en: 'Resort Area', group: 'Kampfzone' },
  { order: 790, name: 'Operation AZURE', en: 'Operation AZURE', group: 'Postgame' },
  { order: 800, name: 'Mt. Victory', en: 'Mt. Victory', group: 'Postgame' },
]

export const CUSTOM_ORDER_START = 10000

const GROUP_EN: Record<string, string> = {
  Prolog: 'Prologue',
  Jubelstadt: 'Jubilife',
  Erzelingen: 'Oreburgh',
  Ewigenau: 'Eterna',
  Kraterberg: 'Mt. Coronet',
  Herzhofen: 'Hearthome',
  Schleiede: 'Veilstone',
  Weideburg: 'Pastoria',
  Fleetburg: 'Canalave',
  Blizzach: 'Snowpoint',
  Speersäule: 'Spear Pillar',
  Sonnewik: 'Sunyshore',
  Liga: 'League',
  Besonderes: 'Special',
  Kampfzone: 'Battle Zone',
  Postgame: 'Postgame',
  Custom: 'Custom',
}

/** English label. `name` stays the stored pair key. */
export function routeTitle(route: { name: string; en: string }): string {
  return route.en || route.name
}

export function routeTitleByKey(name: string): string {
  return ROUTES.find((route) => route.name === name)?.en || name
}

export function groupTitle(group: string): string {
  return GROUP_EN[group] ?? group
}
