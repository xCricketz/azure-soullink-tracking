export type MarkKind = 'anime' | 'event' | 'gift'

export interface RouteMark {
  kind: MarkKind
  label: string
  detail: string
}

/** Optional route notes. Keys are routes.json keys. Empty until Unbound notes are added. */
const MARKS: Record<string, RouteMark[]> = {}

export function marksFor(name: string): RouteMark[] {
  return MARKS[name] ?? []
}
