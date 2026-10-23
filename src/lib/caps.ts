import guide from '../data/azure-platinum-guide.json'

const LABELS: Record<string, string> = {
  'J 3': 'Hunter J',
  Rowan: 'Professor Rowan',
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
