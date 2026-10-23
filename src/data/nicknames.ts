export const NICKNAMES = [
  'Mochi', 'Blitzi', 'Knödel', 'Flauschi', 'Keks', 'Pudding', 'Wolke', 'Chili',
  'Nudel', 'Funki', 'Krümel', 'Flocke', 'Turbo', 'Muffin', 'Schnuffel', 'Glitzer',
  'Mini', 'Kartoffel', 'Pfirsich', 'Günther', 'Hildegard', 'Kevin', 'Uwe', 'Brigitte',
  'Horst', 'Lore', 'Schatzi', 'Panzer', 'Flummi', 'Quark', 'Honig', 'Sturm',
  'Peppi', 'Lulu', 'Momo', 'Socke', 'Kapitän', 'Button', 'Pixel', 'Marmelade',
  'Sir Hopps', 'Zimtschnecke', 'Professor', 'Kirschkern', 'Bubu', 'Donnerschreck',
  'Boss', 'Fiffi', 'Waldi', 'Kuno', 'Trude', 'Otto', 'Frieda', 'Linus',
  'Pummel', 'Ziggy', 'Nero', 'Mira', 'Kroki', 'Bärchen', 'Funke', 'Nebel',
  'Tofu', 'Gnocchi', 'Semmel', 'Brezel', 'Kakao', 'Zuckerstück', 'Mondschein',
]

export function randomNickname(current?: string): string {
  const pool = NICKNAMES.filter((name) => name !== current)
  return pool[Math.floor(Math.random() * pool.length)] ?? 'Mochi'
}
