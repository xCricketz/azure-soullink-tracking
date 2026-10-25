import { monById } from './dex'
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

export function relativeWhen(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (minutes < 10) return 'active just now'
  if (minutes < 60) return `last seen ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `last seen ${hours} hr ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'last seen 1 day ago' : `last seen ${days} days ago`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function baseSpecies(catchRow: Pick<Catch, 'dex_id' | 'pokemon' | 'form'>): string {
  const base = monById(catchRow.dex_id)?.en || catchRow.pokemon || 'Unknown'
  return catchRow.form ? `${base} (${catchRow.form})` : base
}

export function monName(catchRow?: Catch | null): string {
  if (!catchRow) return 'Nobody'
  if (catchRow.nickname) return catchRow.nickname
  return baseSpecies(catchRow)
}

export function speciesName(catchRow?: Catch | null): string {
  if (!catchRow) return 'Pokémon'
  const name = baseSpecies(catchRow)
  return name === 'Unknown' ? 'Pokémon' : name
}

export function statusLabel(status: Status, inTeam = false): string {
  if (status === 'alive' && inTeam) return 'In the team'
  if (status === 'alive') return 'Alive'
  if (status === 'boxed') return 'Boxed'
  if (status === 'dead') return 'Fainted'
  return 'Missed'
}

export function shortStatus(status: Status): string {
  if (status === 'alive') return 'Alive'
  if (status === 'boxed') return 'Box'
  if (status === 'dead') return 'Fainted'
  return 'Missed'
}

export function authError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('invalid login') || text.includes('invalid credentials')) return 'Wrong secret code.'
  if (text.includes('email not confirmed')) return 'This account isn’t confirmed yet.'
  if (text.includes('fetch') || text.includes('network') || text.includes('failed')) {
    return 'No connection. Try again.'
  }
  return 'Sign-in failed. Try again.'
}

export function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}
