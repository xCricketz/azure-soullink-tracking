import type { Settings } from './types'

const KEY = 'sl-settings'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  dupeClause: false,
  typeClause: false,
  badges: 0,
  installDismissed: false,
  milestones: [],
  notify: false,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
  localStorage.setItem('sl-theme', settings.theme)
  document.documentElement.dataset.theme = settings.theme
}

const CUSTOM_KEY = 'sl-custom-routes'

export function loadCustomRoutes(): { name: string; order: number }[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { name: string; order: number }[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomRoutes(routes: { name: string; order: number }[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(routes))
}
