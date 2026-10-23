import type { Catch, Status } from './types'

export function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/[♀♂]/g, '')
    .trim()
}

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function monName(catchRow?: Catch | null): string {
  if (!catchRow) return 'Niemand'
  return catchRow.nickname || catchRow.pokemon || 'Unbekannt'
}

export function speciesName(catchRow?: Catch | null): string {
  return catchRow?.pokemon || 'Pokémon'
}

export function statusLabel(status: Status, inTeam = false): string {
  if (status === 'alive' && inTeam) return 'Im Team'
  if (status === 'alive') return 'Lebt'
  if (status === 'boxed') return 'In der Box'
  if (status === 'dead') return 'Gefallen'
  return 'Verpasst'
}

export function shortStatus(status: Status): string {
  if (status === 'alive') return 'Lebt'
  if (status === 'boxed') return 'Box'
  if (status === 'dead') return 'Gefallen'
  return 'Verpasst'
}

export function authError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login') || text.includes('invalid credentials')) return 'Geheimcode stimmt nicht.'
  if (text.includes('email not confirmed')) return 'Das Konto ist noch nicht bestätigt.'
  if (text.includes('fetch') || text.includes('network') || text.includes('failed')) {
    return 'Keine Verbindung. Versuch es nochmal.'
  }
  return 'Anmeldung fehlgeschlagen. Versuch es nochmal.'
}

export function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}
