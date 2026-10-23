import { useEffect, useRef } from 'react'

/**
 * In-app back stack for Android's gesture/hardware back and iOS swipe-back.
 * Each visible layer pushes one history entry. Back closes only the top layer.
 * The root entry is replaced, never duplicated, so back at Routes leaves normally.
 */

type Layer = { key: string; close: () => void }

const stack: Layer[] = []
const queued = new Set<string>()
const fromPop = new Set<string>()
let swallow = 0
let flushScheduled = false
let installed = false

function keys(): string[] {
  return stack.map((layer) => layer.key)
}

function histKeys(): string[] {
  const value = history.state?.sl
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function same(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index])
}

function publish() {
  document.documentElement.dataset.history = keys().join(' ')
}

function scheduleFlush() {
  if (flushScheduled) return
  flushScheduled = true
  queueMicrotask(() => {
    flushScheduled = false
    const hist = histKeys()
    const now = keys()
    queued.clear()
    if (same(hist, now)) return
    if (hist.length > now.length && now.every((key, index) => hist[index] === key)) {
      swallow = hist.length - now.length
      history.go(-swallow)
      return
    }
    history.replaceState({ ...(history.state ?? {}), sl: now }, '')
  })
}

function onPop() {
  if (swallow > 0) {
    swallow = 0
    publish()
    return
  }
  const hist = histKeys()
  while (stack.length > hist.length) {
    const top = stack.pop()
    if (!top) break
    fromPop.add(top.key)
    top.close()
  }
  publish()
}

export function installHistory() {
  if (installed || typeof window === 'undefined') return
  installed = true
  if (!Array.isArray(history.state?.sl)) {
    history.replaceState({ ...(history.state ?? {}), sl: [] }, '')
  }
  window.addEventListener('popstate', onPop)
  publish()
}

/** Push a layer, or refresh its close handler if that layer is already open. */
export function upsertLayer(key: string, close: () => void) {
  queued.delete(key)
  const found = stack.find((layer) => layer.key === key)
  if (found) {
    found.close = close
    publish()
    return
  }
  stack.push({ key, close })
  if (!same(histKeys(), keys())) {
    history.pushState({ ...(history.state ?? {}), sl: keys() }, '')
  }
  publish()
}

/** Drop a layer that the UI closed. A top layer also steps history back. */
export function releaseLayer(key: string) {
  if (fromPop.delete(key)) return
  const index = stack.findIndex((layer) => layer.key === key)
  if (index < 0) return
  const top = index === stack.length - 1
  stack.splice(index, 1)
  publish()
  if (!top) {
    history.replaceState({ ...(history.state ?? {}), sl: keys() }, '')
    return
  }
  queued.add(key)
  scheduleFlush()
}

export function useHistoryLayer(active: boolean, key: string, close: () => void) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!active) return
    upsertLayer(key, () => closeRef.current())
    return () => releaseLayer(key)
  }, [active, key])
}
