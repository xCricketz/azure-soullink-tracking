import { useEffect, useState } from 'react'

export interface ToastItem {
  id: string
  text: string
  actionLabel?: string
  onAction?: () => void
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
const timers = new Map<string, number>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function dismissToast(id: string) {
  items = items.filter((item) => item.id !== id)
  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
  emit()
}

export function pushToast(text: string, action?: { label: string; onClick: () => void }, key?: string) {
  const id = key ?? crypto.randomUUID()
  if (key) dismissToast(key)
  const item: ToastItem = {
    id,
    text,
    actionLabel: action?.label,
    onAction: action
      ? () => {
          dismissToast(id)
          action.onClick()
        }
      : undefined,
  }
  items = [...items.filter((entry) => entry.id !== id), item].slice(-3)
  emit()
  const timer = window.setTimeout(() => dismissToast(id), 5000)
  timers.set(id, timer)
}

export function useToasts(): ToastItem[] {
  const [state, setState] = useState(items)
  useEffect(() => {
    const listener = () => setState([...items])
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return state
}
