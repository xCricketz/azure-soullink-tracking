const LEADERS = ['Veit', 'Silvana', 'Hilda', 'Lamina', 'Lotte', 'Harro', 'Frida', 'Volkner'] as const

/** Next Sinnoh gym leader after the earned badge count. Null once all eight are earned. */
export function nextLeader(badges: number): string | null {
  if (badges < 0 || badges >= LEADERS.length) return null
  return LEADERS[badges] ?? null
}
