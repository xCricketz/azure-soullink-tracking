import { playerFromEmail } from './types'

/**
 * Why a return visit asked for the shared code:
 * The session supabase-js writes is only in localStorage. iOS Safari can drop
 * that store (storage pressure, the 7-day script-storage cap, or the separate
 * bucket used by a home-screen icon) while a first-party cookie is still there.
 * On top of that, the app kept an in-memory "entered" flag that starts false
 * and was cleared again after 30 minutes in the background, so the login
 * screen came back even when the session had survived. The code field opens
 * only when that session is missing.
 *
 * A signed-in Fisi or Seri goes straight in. The shared code is never written
 * here; only the session supabase already persists.
 */
export function entryChoice(email: string | null | undefined): 'app' | 'login' {
  return playerFromEmail(email) ? 'app' : 'login'
}

const CHUNK = 3000
const MAX_CHUNKS = 8
const MAX_AGE = 60 * 60 * 24 * 400

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface CookieJar {
  read(name: string): string | null
  write(name: string, value: string): void
  remove(name: string): void
}

function prefix(key: string): string {
  let hash = 0
  for (const char of key) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0
  return `sl${hash.toString(36)}`
}

export function readCookieValue(jar: CookieJar, key: string): string | null {
  const name = prefix(key)
  const count = Number(jar.read(`${name}n`))
  if (!Number.isInteger(count) || count <= 0 || count > MAX_CHUNKS) return null
  let encoded = ''
  for (let index = 0; index < count; index += 1) {
    const part = jar.read(`${name}${index}`)
    if (part == null) return null
    encoded += part
  }
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

export function writeCookieValue(jar: CookieJar, key: string, value: string): void {
  const name = prefix(key)
  for (let index = 0; index < MAX_CHUNKS; index += 1) jar.remove(`${name}${index}`)
  jar.remove(`${name}n`)
  const encoded = encodeURIComponent(value)
  if (encoded.length > CHUNK * MAX_CHUNKS) return
  const count = Math.max(1, Math.ceil(encoded.length / CHUNK))
  for (let index = 0; index < count; index += 1) {
    jar.write(`${name}${index}`, encoded.slice(index * CHUNK, (index + 1) * CHUNK))
  }
  jar.write(`${name}n`, String(count))
}

export function clearCookieValue(jar: CookieJar, key: string): void {
  const name = prefix(key)
  for (let index = 0; index < MAX_CHUNKS; index += 1) jar.remove(`${name}${index}`)
  jar.remove(`${name}n`)
}

/** localStorage first, cookie when Safari has dropped localStorage. */
export function durableAuthStorage(local: KeyValueStore, jar: CookieJar): KeyValueStore {
  return {
    getItem(key) {
      try {
        const saved = local.getItem(key)
        if (saved) return saved
      } catch {
        /* storage disabled */
      }
      const baked = readCookieValue(jar, key)
      if (!baked) return null
      try {
        local.setItem(key, baked)
      } catch {
        /* cookie remains the copy */
      }
      return baked
    },
    setItem(key, value) {
      try {
        local.setItem(key, value)
      } catch {
        /* cookie still records the session */
      }
      writeCookieValue(jar, key, value)
    },
    removeItem(key) {
      try {
        local.removeItem(key)
      } catch {
        /* ignore */
      }
      clearCookieValue(jar, key)
    },
  }
}

export function browserCookieJar(): CookieJar {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  return {
    read(name) {
      const parts = document.cookie ? document.cookie.split('; ') : []
      const needle = `${name}=`
      const found = parts.find((part) => part.startsWith(needle))
      if (!found) return null
      try {
        return decodeURIComponent(found.slice(needle.length))
      } catch {
        return null
      }
    },
    write(name, value) {
      document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
    },
    remove(name) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    },
  }
}

export function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
  }
}

export function memoryCookieJar(): CookieJar {
  const data = new Map<string, string>()
  return {
    read: (name) => data.get(name) ?? null,
    write: (name, value) => { data.set(name, value) },
    remove: (name) => { data.delete(name) },
  }
}
