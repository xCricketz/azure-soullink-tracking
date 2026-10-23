import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CUSTOM_ORDER_START, ROUTES } from '../data/routes'
import { asAlive, asDead, buildRow, partnerNeedsDeath, placeRow, reorderTeam, upsertLocal, withStatus } from '../lib/edits'
import { countPairs, findRoute, pairRows } from '../lib/pairs'
import { loadCustomRoutes, loadSettings, saveCustomRoutes, saveSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { pushToast } from '../lib/toast'
import { clip, monName } from '../lib/text'
import {
  DEFAULT_RULES,
  PLAYERS,
  otherPlayer,
  type Catch,
  type CatchDraft,
  type CustomRoute,
  type DeathPrompt,
  type PlayerId,
  type Run,
  type Settings,
  type Status,
  type SyncState,
} from '../lib/types'

interface OutOp {
  kind: 'upsert' | 'delete' | 'rpc'
  row?: Catch
  id?: string
  args?: { p_run: string; p_route: string; p_status: string; p_cause: string | null }
}

export interface AppContextValue {
  me: PlayerId
  run: Run | null
  catches: Catch[]
  sync: SyncState
  settings: Settings
  customRoutes: CustomRoute[]
  glow: { route: string; player: PlayerId } | null
  death: DeathPrompt | null
  updateSettings: (patch: Partial<Settings>) => void
  signOut: () => Promise<void>
  saveCatch: (draft: CatchDraft) => Promise<'saved' | 'death' | 'invalid'>
  setStatus: (id: string, status: Status) => Promise<void>
  deleteCatch: (id: string) => Promise<void>
  place: (id: string, where: 'team' | 'box') => Promise<void>
  moveTeam: (id: string, dir: -1 | 1) => Promise<void>
  saveEpitaph: (id: string, epitaph: string) => Promise<void>
  saveRules: (rules: string) => Promise<void>
  resetRun: () => Promise<'ok' | 'missing-rpc' | 'error'>
  deleteMyCatches: () => Promise<void>
  newRun: () => Promise<void>
  resolveDeath: (choice: 'both' | 'mine' | 'cancel', cause: string) => Promise<void>
  addCustomRoute: (name: string) => CustomRoute | null
  revivePair: (route: string) => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('AppContext fehlt')
  return value
}

const OUTBOX_KEY = 'sl-outbox'

function readOutbox(): OutOp[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') as OutOp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isNetwork(error: { message?: string } | null): boolean {
  if (!navigator.onLine) return true
  const message = error?.message ?? ''
  return /failed to fetch|network|load failed|offline|timeout/i.test(message)
}

function explain(error: { message?: string; code?: string }): string {
  const message = error.message ?? ''
  if (error.code === '23505' || /duplicate|unique/i.test(message)) return 'Diese Route ist schon belegt.'
  if (error.code === '42501' || /row-level security/i.test(message)) return 'Das darf nur der eigene Fang.'
  if (error.code === 'PGRST202' || /reset_run/i.test(message)) return 'missing-rpc'
  return 'Speichern fehlgeschlagen.'
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* Android only */
  }
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body })
  } catch {
    /* ignore */
  }
}

function isCatch(value: unknown): value is Catch {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Catch>
  return typeof row.id === 'string' && (row.player === 'fisi' || row.player === 'seri') && typeof row.route === 'string'
}

export function AppProvider({ me, children }: { me: PlayerId; children: ReactNode }) {
  const [run, setRun] = useState<Run | null>(null)
  const [catches, setCatches] = useState<Catch[]>([])
  const [sync, setSync] = useState<SyncState>('syncing')
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [customRoutes, setCustomRoutes] = useState<CustomRoute[]>(() => loadCustomRoutes())
  const [glow, setGlow] = useState<{ route: string; player: PlayerId } | null>(null)
  const [death, setDeath] = useState<DeathPrompt | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const catchesRef = useRef(catches)
  const runRef = useRef(run)
  const settingsRef = useRef(settings)
  const customRef = useRef(customRoutes)
  const outboxRef = useRef<OutOp[]>(readOutbox())
  const silentIds = useRef(new Set<string>())
  const seenBoot = useRef(false)
  const channelOk = useRef(false)
  const bucket = useRef(new Map<string, { old?: Catch; next?: Catch }>())
  const flushTimer = useRef(false)
  const toastAt = useRef(new Map<string, number>())

  catchesRef.current = catches
  runRef.current = run
  settingsRef.current = settings
  customRef.current = customRoutes

  const writeCatches = useCallback((next: Catch[]) => {
    catchesRef.current = next
    setCatches(next)
  }, [])

  const publishSync = useCallback(() => {
    if (!navigator.onLine) {
      setSync('offline')
      return
    }
    if (outboxRef.current.length || !channelOk.current) setSync('syncing')
    else setSync('live')
  }, [])

  const storeOutbox = useCallback((ops: OutOp[]) => {
    outboxRef.current = ops
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops))
    publishSync()
  }, [publishSync])

  const enqueue = useCallback((op: OutOp) => {
    let queue = outboxRef.current
    if (op.kind === 'upsert' && op.row) {
      queue = queue.filter((item) => !(item.kind === 'upsert' && item.row?.id === op.row?.id))
    }
    if (op.kind === 'delete' && op.id) {
      const pendingCreate = queue.some((item) => item.kind === 'upsert' && item.row?.id === op.id)
      queue = queue.filter((item) => !(item.kind === 'upsert' && item.row?.id === op.id) && !(item.kind === 'delete' && item.id === op.id))
      if (pendingCreate) {
        storeOutbox(queue)
        return
      }
    }
    storeOutbox([...queue, op])
  }, [storeOutbox])

  const hush = useCallback((id: string) => {
    silentIds.current.add(id)
    window.setTimeout(() => silentIds.current.delete(id), 4000)
  }, [])

  const sendUpsert = useCallback(async (row: Catch): Promise<'ok' | 'offline' | 'error'> => {
    if (!navigator.onLine) {
      enqueue({ kind: 'upsert', row })
      return 'offline'
    }
    setSync('syncing')
    const { error } = await supabase.from('catches').upsert(row)
    if (!error) {
      publishSync()
      return 'ok'
    }
    if (isNetwork(error)) {
      enqueue({ kind: 'upsert', row })
      return 'offline'
    }
    pushToast(explain(error))
    publishSync()
    return 'error'
  }, [enqueue, publishSync])

  const sendDelete = useCallback(async (id: string): Promise<'ok' | 'offline' | 'error'> => {
    if (!navigator.onLine) {
      enqueue({ kind: 'delete', id })
      return 'offline'
    }
    setSync('syncing')
    const { error } = await supabase.from('catches').delete().eq('id', id)
    if (!error) {
      publishSync()
      return 'ok'
    }
    if (isNetwork(error)) {
      enqueue({ kind: 'delete', id })
      return 'offline'
    }
    pushToast(explain(error))
    publishSync()
    return 'error'
  }, [enqueue, publishSync])

  const sendRpc = useCallback(async (
    runId: string,
    route: string,
    status: string,
    cause: string | null,
  ): Promise<'ok' | 'offline' | 'error'> => {
    const args = { p_run: runId, p_route: route, p_status: status, p_cause: cause }
    if (!navigator.onLine) {
      enqueue({ kind: 'rpc', args })
      return 'offline'
    }
    setSync('syncing')
    const { error } = await supabase.rpc('set_pair_status', args)
    if (!error) {
      publishSync()
      return 'ok'
    }
    if (isNetwork(error)) {
      enqueue({ kind: 'rpc', args })
      return 'offline'
    }
    pushToast(explain(error))
    publishSync()
    return 'error'
  }, [enqueue, publishSync])

  const flush = useCallback(async () => {
    if (!navigator.onLine || !outboxRef.current.length) {
      publishSync()
      return
    }
    setSync('syncing')
    const pending = [...outboxRef.current]
    const rest: OutOp[] = []
    for (let index = 0; index < pending.length; index += 1) {
      const op = pending[index]
      if (!op) continue
      let failed: 'network' | 'hard' | null = null
      if (op.kind === 'upsert' && op.row) {
        const { error } = await supabase.from('catches').upsert(op.row)
        if (error) failed = isNetwork(error) ? 'network' : 'hard'
      } else if (op.kind === 'delete' && op.id) {
        const { error } = await supabase.from('catches').delete().eq('id', op.id)
        if (error) failed = isNetwork(error) ? 'network' : 'hard'
      } else if (op.kind === 'rpc' && op.args) {
        const { error } = await supabase.rpc('set_pair_status', op.args)
        if (error) failed = isNetwork(error) ? 'network' : 'hard'
      }
      if (failed === 'network') {
        rest.push(...pending.slice(index))
        break
      }
      if (failed === 'hard') pushToast('Eine gespeicherte Änderung konnte nicht synchronisiert werden.')
    }
    storeOutbox(rest)
  }, [publishSync, storeOutbox])

  const commit = useCallback(async (next: Catch, previous: Catch | null, toastText: string) => {
    const before = catchesRef.current
    hush(next.id)
    writeCatches(upsertLocal(before, next))
    pushToast(toastText, {
      label: 'Rückgängig',
      onClick: () => {
        if (previous) void commit(previous, next, 'Wiederhergestellt')
        else {
          hush(next.id)
          writeCatches(catchesRef.current.filter((row) => row.id !== next.id))
          void sendDelete(next.id)
          pushToast('Fang entfernt')
        }
      },
    })
    const result = await sendUpsert(next)
    if (result === 'error') writeCatches(previous ? upsertLocal(catchesRef.current, previous) : catchesRef.current.filter((row) => row.id !== next.id))
  }, [hush, sendDelete, sendUpsert, writeCatches])

  const toastRoute = useCallback((route: string, text: string) => {
    const now = Date.now()
    if (now - (toastAt.current.get(route) ?? 0) < 1200) return
    toastAt.current.set(route, now)
    pushToast(text)
  }, [])

  const flushAnnouncements = useCallback(() => {
    const changes = [...bucket.current.values()]
    bucket.current.clear()
    const byRoute = new Map<string, { old?: Catch; next?: Catch }[]>()
    for (const change of changes) {
      const route = change.next?.route || change.old?.route
      if (!route) continue
      const list = byRoute.get(route) ?? []
      list.push(change)
      byRoute.set(route, list)
    }
    for (const [route, list] of byRoute) {
      const meaningful = list.filter((item) => {
        const id = item.next?.id || item.old?.id
        return Boolean(id && !silentIds.current.has(id))
      })
      if (!meaningful.length) continue
      const dying = meaningful.find((item) => item.next && item.next.status === 'dead' && item.old?.status !== 'dead')
      if (dying?.next) {
        const other = catchesRef.current.find((row) => row.route === route && row.id !== dying.next?.id)
        const text = `💀 ${monName(dying.next)} ist gefallen – ${monName(other)} ist auch tot.`
        toastRoute(route, text)
        vibrate(200)
        if (settingsRef.current.notify) notify('Soul-Link', text)
        setGlow({ route, player: dying.next.player === me ? otherPlayer(me) : dying.next.player })
        continue
      }
      const created = meaningful.find((item) => item.next && !item.old && item.next.player !== me)
      if (created?.next) {
        const who = PLAYERS[created.next.player].name
        const text = created.next.status === 'missed'
          ? `${who} hat ${route} verpasst.`
          : `${who} hat ${created.next.pokemon ?? 'ein Pokémon'} auf ${route} gefangen.`
        toastRoute(route, text)
        setGlow({ route, player: created.next.player })
        continue
      }
      const updated = meaningful.find((item) => item.next && item.old && item.next.player !== me && item.next.status !== item.old.status)
      if (!updated?.next || !updated.old) continue
      const who = PLAYERS[updated.next.player].name
      let text = `${who} hat ${monName(updated.next)} geändert.`
      if (updated.next.status === 'boxed') text = `${who} hat ${monName(updated.next)} in die Box gelegt.`
      if (updated.next.status === 'missed') text = `${who} hat ${route} verpasst.`
      if (updated.next.status === 'alive' && updated.old.status === 'dead') text = `${who} hat ${monName(updated.next)} wiederbelebt.`
      else if (updated.next.status === 'alive') text = `${who} hat ${monName(updated.next)} als lebend markiert.`
      toastRoute(route, text)
      setGlow({ route, player: updated.next.player })
    }
  }, [me, toastRoute])

  const queueAnnounce = useCallback((oldRow: Catch | undefined, nextRow: Catch | undefined) => {
    const id = nextRow?.id || oldRow?.id
    if (!id) return
    bucket.current.set(id, { old: oldRow, next: nextRow })
    if (flushTimer.current) return
    flushTimer.current = true
    queueMicrotask(() => {
      flushTimer.current = false
      flushAnnouncements()
    })
  }, [flushAnnouncements])

  useEffect(() => {
    if (!glow) return
    const timer = window.setTimeout(() => setGlow(null), 700)
    return () => window.clearTimeout(timer)
  }, [glow])

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoadError(null)
      const { data: players, error: playerError } = await supabase.from('players').select('id')
      if (cancel) return
      if (playerError) {
        setLoadError(isNetwork(playerError) ? 'Keine Verbindung. Sobald das Netz da ist, versuchen wir es nochmal.' : 'Die Spielerdaten konnten nicht geladen werden.')
        setLoaded(true)
        setSync('offline')
        return
      }
      if (!players?.length) {
        setLoadError('Dein Konto ist noch nicht mit Fisi oder Seri verknüpft.')
        setLoaded(true)
        return
      }
      const { data: runs, error: runError } = await supabase
        .from('runs')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (cancel) return
      if (runError) {
        setLoadError('Der Run konnte nicht geladen werden.')
        setLoaded(true)
        return
      }
      const active = (runs?.[0] as Run | undefined) ?? null
      if (runs && runs.length > 1) {
        const extras = runs.slice(1).map((item) => item.id as string)
        await supabase.from('runs').update({ active: false }).in('id', extras)
      }
      setRun(active)
      runRef.current = active
      if (active) {
        const { data: rows, error: catchError } = await supabase.from('catches').select('*').eq('run_id', active.id)
        if (cancel) return
        if (catchError) {
          setLoadError('Die Fänge konnten nicht geladen werden.')
          setLoaded(true)
          return
        }
        writeCatches((rows ?? []) as Catch[])
      }
      setLoaded(true)
      await flush()
    }
    void load()
    return () => {
      cancel = true
    }
  }, [flush, writeCatches])

  useEffect(() => {
    const runId = run?.id
    if (!runId) return
    const channel = supabase
      .channel(`soullink-${runId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catches', filter: `run_id=eq.${runId}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id?: string } | null)?.id
          if (!oldId) return
          const oldRow = catchesRef.current.find((row) => row.id === oldId)
          writeCatches(catchesRef.current.filter((row) => row.id !== oldId))
          queueAnnounce(oldRow, undefined)
          return
        }
        if (!isCatch(payload.new)) return
        const oldRow = catchesRef.current.find((row) => row.id === payload.new.id)
        writeCatches(upsertLocal(catchesRef.current, payload.new))
        queueAnnounce(oldRow, payload.new)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new && (payload.new as Run).active) {
          setRun(payload.new as Run)
          return
        }
        if (payload.eventType === 'UPDATE' && payload.new) {
          const next = payload.new as Run
          if (next.id === runRef.current?.id) {
            if (!next.active) {
              void supabase
                .from('runs')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .then(({ data }) => {
                  const fresh = (data?.[0] as Run | undefined) ?? null
                  setRun(fresh)
                  if (fresh) {
                    void supabase.from('catches').select('*').eq('run_id', fresh.id).then(({ data: rows }) => {
                      writeCatches((rows ?? []) as Catch[])
                    })
                  } else writeCatches([])
                })
            } else {
              setRun(next)
            }
          }
        }
      })
      .subscribe((status) => {
        channelOk.current = status === 'SUBSCRIBED'
        publishSync()
      })
    return () => {
      channelOk.current = false
      void supabase.removeChannel(channel)
    }
  }, [publishSync, queueAnnounce, run?.id, writeCatches])

  useEffect(() => {
    const onOnline = () => { void flush() }
    const onOffline = () => setSync('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flush])

  useEffect(() => {
    if (!loaded) return
    const rows = pairRows(catches, customRoutes)
    const linked = countPairs(rows)
    const living = rows.filter((row) => row.fisi?.status === 'alive' && row.seri?.status === 'alive').length
    const hits = [
      { key: 'first-pair', text: 'Erstes Paar! Die Kette hält.', ok: linked >= 1 },
      { key: 'ten-alive', text: '10 Paare überlebt. Sinnoh ist stolz.', ok: living >= 10 },
    ]
    setSettings((current) => {
      let milestones = current.milestones
      let changed = false
      for (const hit of hits) {
        if (!hit.ok || milestones.includes(hit.key)) continue
        milestones = [...milestones, hit.key]
        changed = true
        if (seenBoot.current) pushToast(hit.text)
      }
      if (!changed) return current
      const next = { ...current, milestones }
      saveSettings(next)
      return next
    })
    seenBoot.current = true
  }, [catches, customRoutes, loaded])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      if ((patch.badges ?? current.badges) >= 8 && current.badges < 8 && !next.milestones.includes('badges-8')) {
        next.milestones = [...next.milestones, 'badges-8']
        pushToast('Achter Orden! Sinnoh ist stolz auf euch.')
      }
      saveSettings(next)
      return next
    })
  }, [])

  const saveCatch = useCallback(async (draft: CatchDraft): Promise<'saved' | 'death' | 'invalid'> => {
    const active = runRef.current
    if (!active) {
      pushToast('Kein aktiver Run.')
      return 'invalid'
    }
    if (!draft.route) {
      pushToast('Wähl zuerst eine Route.')
      return 'invalid'
    }
    if (draft.status !== 'missed' && (!draft.dexId || !draft.pokemon)) {
      pushToast('Welches Pokémon?')
      return 'invalid'
    }
    const existing = catchesRef.current.find((row) => row.player === me && row.route === draft.route) ?? null
    const next = buildRow(draft, existing, me, active.id, catchesRef.current)
    if (next.status === 'dead') {
      const partner = partnerNeedsDeath(next, catchesRef.current)
      if (partner) {
        setDeath({ next, previous: existing, partner })
        return 'death'
      }
    }
    const text = !existing
      ? draft.status === 'missed' ? 'Route als verpasst gespeichert' : 'Fang gespeichert'
      : 'Fang aktualisiert'
    await commit(next, existing, text)
    vibrate(20)
    return 'saved'
  }, [commit, me])

  const setStatus = useCallback(async (id: string, status: Status) => {
    const row = catchesRef.current.find((item) => item.id === id)
    if (!row || row.player !== me || row.status === status) return
    const next = withStatus(row, status)
    if (status === 'dead') {
      const partner = partnerNeedsDeath(next, catchesRef.current)
      if (partner) {
        setDeath({ next, previous: row, partner })
        return
      }
    }
    await commit(next, row, 'Status geändert')
    if (status === 'dead') vibrate(200)
  }, [commit, me])

  const deleteCatch = useCallback(async (id: string) => {
    const row = catchesRef.current.find((item) => item.id === id)
    if (!row || row.player !== me) return
    hush(id)
    writeCatches(catchesRef.current.filter((item) => item.id !== id))
    pushToast('Fang gelöscht', {
      label: 'Rückgängig',
      onClick: () => { void commit(row, null, 'Wieder da') },
    })
    const result = await sendDelete(id)
    if (result === 'error') writeCatches(upsertLocal(catchesRef.current, row))
  }, [commit, hush, sendDelete, writeCatches])

  const place = useCallback(async (id: string, where: 'team' | 'box') => {
    const row = catchesRef.current.find((item) => item.id === id)
    if (!row || row.player !== me) return
    if (where === 'team' && row.status === 'missed') {
      pushToast('Verpasste Routen kommen nicht ins Team.')
      return
    }
    const next = placeRow(row, where, catchesRef.current)
    if (next === 'full') {
      pushToast('Nur sechs Pokémon im Team.')
      return
    }
    await commit(next, row, where === 'team' ? 'Im Team' : 'In der Box')
  }, [commit, me])

  const moveTeam = useCallback(async (id: string, dir: -1 | 1) => {
    const previous = catchesRef.current
    const next = reorderTeam(previous, me, id, dir)
    if (!next) return
    writeCatches(next)
    const changed = next.filter((row) => {
      const old = previous.find((item) => item.id === row.id)
      return old && row.player === me && old.team_order !== row.team_order
    })
    for (const row of changed) {
      hush(row.id)
      const result = await sendUpsert(row)
      if (result === 'error') {
        writeCatches(previous)
        return
      }
    }
    pushToast('Reihenfolge geändert', {
      label: 'Rückgängig',
      onClick: () => {
        writeCatches(previous)
        for (const row of previous.filter((item) => item.player === me && item.in_team)) {
          hush(row.id)
          void sendUpsert(row)
        }
      },
    })
  }, [hush, me, sendUpsert, writeCatches])

  const saveEpitaph = useCallback(async (id: string, epitaph: string) => {
    const row = catchesRef.current.find((item) => item.id === id)
    if (!row || row.player !== me) return
    const next = { ...row, epitaph: clip(epitaph, 140) || null, updated_at: new Date().toISOString() }
    await commit(next, row, 'Epitaph gespeichert')
  }, [commit, me])

  const saveRules = useCallback(async (rules: string) => {
    const active = runRef.current
    if (!active) return
    const next = { ...active, rules }
    setRun(next)
    const { error } = await supabase.from('runs').update({ rules }).eq('id', active.id)
    if (error) {
      pushToast('Regeln konnten nicht gespeichert werden.')
      setRun(active)
      return
    }
    pushToast('Regeln gespeichert')
  }, [])

  const resetRun = useCallback(async (): Promise<'ok' | 'missing-rpc' | 'error'> => {
    const active = runRef.current
    if (!active) return 'error'
    const { error } = await supabase.rpc('reset_run', { p_run: active.id })
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) return 'missing-rpc'
      if (isNetwork(error)) {
        pushToast('Offline. Der Reset wartet, bis du wieder verbunden bist.')
        return 'error'
      }
      return 'error'
    }
    writeCatches([])
    pushToast('Run zurückgesetzt.')
    return 'ok'
  }, [writeCatches])

  const deleteMyCatches = useCallback(async () => {
    const mine = catchesRef.current.filter((row) => row.player === me)
    writeCatches(catchesRef.current.filter((row) => row.player !== me))
    for (const row of mine) {
      hush(row.id)
      await sendDelete(row.id)
    }
    pushToast('Deine Fänge sind gelöscht.')
  }, [hush, me, sendDelete, writeCatches])

  const newRun = useCallback(async () => {
    const { error: offError } = await supabase.from('runs').update({ active: false }).eq('active', true)
    if (offError && !isNetwork(offError)) {
      pushToast('Neuer Run fehlgeschlagen.')
      return
    }
    const { data, error } = await supabase
      .from('runs')
      .insert({ name: 'Azure Platinum Soul-Link', rules: runRef.current?.rules || DEFAULT_RULES, active: true })
      .select('*')
      .single()
    if (error || !data) {
      pushToast('Neuer Run fehlgeschlagen.')
      return
    }
    setRun(data as Run)
    writeCatches([])
    pushToast('Neuer Run ist bereit.')
  }, [writeCatches])

  const resolveDeath = useCallback(async (choice: 'both' | 'mine' | 'cancel', cause: string) => {
    const prompt = death
    setDeath(null)
    const active = runRef.current
    if (!prompt || choice === 'cancel' || !active) return
    const trimmed = clip(cause, 160)
    const next = asDead({ ...prompt.next, death_cause: trimmed || prompt.next.death_cause }, trimmed)
    if (choice === 'mine') {
      await commit(next, prompt.previous, 'In den Friedhof gelegt')
      vibrate(200)
      return
    }
    const partnerDead = asDead(prompt.partner, trimmed)
    hush(next.id)
    hush(prompt.partner.id)
    writeCatches(upsertLocal(upsertLocal(catchesRef.current, next), partnerDead))
    vibrate(200)
    pushToast('Beide in den Friedhof gelegt', {
      label: 'Rückgängig',
      onClick: () => {
        hush(next.id)
        hush(prompt.partner.id)
        let restored = upsertLocal(catchesRef.current, prompt.partner)
        restored = prompt.previous ? upsertLocal(restored, prompt.previous) : restored.filter((row) => row.id !== next.id)
        writeCatches(restored)
        const back = prompt.partner.status === 'boxed' || prompt.partner.status === 'dead' ? prompt.partner.status : 'alive'
        void sendRpc(active.id, next.route, back, prompt.partner.death_cause).then(() => {
          if (prompt.previous) void sendUpsert(prompt.previous)
          else void sendDelete(next.id)
        })
      },
    })
    const saved = await sendUpsert(next)
    if (saved === 'error') {
      let restored = prompt.previous ? upsertLocal(catchesRef.current, prompt.previous) : catchesRef.current.filter((row) => row.id !== next.id)
      restored = upsertLocal(restored, prompt.partner)
      writeCatches(restored)
      return
    }
    const linked = await sendRpc(active.id, next.route, 'dead', trimmed || null)
    if (linked === 'error') {
      let restored = prompt.previous ? upsertLocal(catchesRef.current, prompt.previous) : catchesRef.current.filter((row) => row.id !== next.id)
      restored = upsertLocal(restored, prompt.partner)
      writeCatches(restored)
      pushToast('Der Partner konnte nicht mitgezogen werden.')
    }
  }, [commit, death, hush, sendDelete, sendRpc, sendUpsert, writeCatches])

  const addCustomRoute = useCallback((name: string): CustomRoute | null => {
    const clean = clip(name, 40)
    if (!clean) return null
    const known = findRoute(clean, customRef.current)
    if (known && (ROUTES.some((route) => route.name === known.name) || customRef.current.some((route) => route.name === known.name))) {
      return { name: known.name, order: known.order }
    }
    const route = { name: clean, order: CUSTOM_ORDER_START + customRef.current.length + 1 }
    const next = [...customRef.current, route]
    customRef.current = next
    setCustomRoutes(next)
    saveCustomRoutes(next)
    return route
  }, [])

  const revivePair = useCallback(async (routeName: string) => {
    const active = runRef.current
    if (!active) return
    const mine = catchesRef.current.find((row) => row.player === me && row.route === routeName) ?? null
    const partner = catchesRef.current.find((row) => row.player !== me && row.route === routeName) ?? null
    if (mine) hush(mine.id)
    if (partner) hush(partner.id)
    writeCatches(catchesRef.current.map((row) => (row.route === routeName && row.status !== 'missed' ? asAlive(row) : row)))
    pushToast('Wiederbelebt', {
      label: 'Rückgängig',
      onClick: () => {
        if (mine) hush(mine.id)
        if (partner) hush(partner.id)
        let restored = catchesRef.current
        if (mine) restored = upsertLocal(restored, mine)
        if (partner) restored = upsertLocal(restored, partner)
        writeCatches(restored)
        const back = partner && partner.status !== 'missed' ? partner : mine
        if (back && back.status !== 'missed') {
          void sendRpc(active.id, routeName, back.status, back.death_cause).then(() => {
            if (mine && partner && mine.status !== partner.status) void sendUpsert(mine)
          })
        }
      },
    })
    const result = await sendRpc(active.id, routeName, 'alive', null)
    if (result === 'error') {
      let restored = catchesRef.current
      if (mine) restored = upsertLocal(restored, mine)
      if (partner) restored = upsertLocal(restored, partner)
      writeCatches(restored)
    }
  }, [hush, me, sendRpc, sendUpsert, writeCatches])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value: AppContextValue = {
    me,
    run,
    catches,
    sync,
    settings,
    customRoutes,
    glow,
    death,
    updateSettings,
    signOut,
    saveCatch,
    setStatus,
    deleteCatch,
    place,
    moveTeam,
    saveEpitaph,
    saveRules,
    resetRun,
    deleteMyCatches,
    newRun,
    resolveDeath,
    addCustomRoute,
    revivePair,
  }

  if (!loaded) {
    return (
      <div className="boot">
        <p className="pixel">SOUL LINK</p>
        <p>Verbinde…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="boot">
        <p className="pixel">SOUL LINK</p>
        <p>{loadError}</p>
        <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
          Nochmal versuchen
        </button>
      </div>
    )
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
