export const NICKNAMES = [
  'Mochi', 'Blitz', 'Noodle', 'Fluffy', 'Cookie', 'Pudding', 'Cloud', 'Chili',
  'Sparky', 'Crumbs', 'Flake', 'Turbo', 'Muffin', 'Snuffles', 'Glitter',
  'Mini', 'Spud', 'Peach', 'Bean', 'Pepper', 'Kevin', 'Otto', 'Britt',
  'Skip', 'Lore', 'Honey', 'Tank', 'Bounce', 'Quark', 'Storm', 'Pip',
  'Lulu', 'Momo', 'Sock', 'Captain', 'Button', 'Pixel', 'Jam',
  'Sir Hops', 'Cinnamon', 'Professor', 'Cherry', 'Boo', 'Thunder',
  'Boss', 'Fifi', 'Buddy', 'Kuno', 'Trudy', 'Frieda', 'Linus',
  'Pudge', 'Ziggy', 'Nero', 'Mira', 'Croc', 'Bear', 'Spark', 'Mist',
  'Tofu', 'Gnocchi', 'Bun', 'Pretzel', 'Cocoa', 'Sugar', 'Moonbeam',
]

export function randomNickname(current?: string): string {
  const pool = NICKNAMES.filter((name) => name !== current)
  return pool[Math.floor(Math.random() * pool.length)] ?? 'Mochi'
}
