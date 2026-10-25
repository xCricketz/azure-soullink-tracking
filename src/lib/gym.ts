import { GYMS, type GymInfo } from '../data/routes'

export type GymLeader = GymInfo

export const LEADERS: GymLeader[] = GYMS

export function nextLeader(badges: number): GymLeader | null {
  if (badges < 0 || badges >= LEADERS.length) return null
  return LEADERS.find((gym) => gym.badge === badges + 1) ?? null
}
