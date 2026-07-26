export type SimGroupState = 'invite-pending' | 'solo-member' | 'stale-member' | null
export type SimFirestoreError = 'permission-denied' | 'not-found' | 'unavailable' | null
export type SimTmdbError = 'rate-limit' | 'not-found' | 'server-error' | null
export type SimNotifType = 'upcoming_episode' | 'show_returning'
export type SimActiveKey =
  | 'empty-state' | 'high-volume'
  | 'latency' | 'intermittent'
  | 'firestore-error' | 'tmdb-error'
  | 'group-state'
  | 'inject-notifs'

export interface InjectedNotif {
  type: SimNotifType
  title: string
  body: string
}

export interface DevSimState {
  simulateEmptyState: boolean
  simulateHighVolume: boolean
  simulateLatencyMs: number
  simulateFailureRate: number
  firestoreError: SimFirestoreError
  tmdbError: SimTmdbError
  groupState: SimGroupState
  injectedNotifications: InjectedNotif[]
}

export const DEFAULT_DEV_SIM: DevSimState = {
  simulateEmptyState: false,
  simulateHighVolume: false,
  simulateLatencyMs: 0,
  simulateFailureRate: 0,
  firestoreError: null,
  tmdbError: null,
  groupState: null,
  injectedNotifications: [],
}

function computeActiveKeys(state: DevSimState): SimActiveKey[] {
  const keys: SimActiveKey[] = []
  if (state.simulateEmptyState) keys.push('empty-state')
  if (state.simulateHighVolume) keys.push('high-volume')
  if (state.simulateLatencyMs > 0) keys.push('latency')
  if (state.simulateFailureRate > 0) keys.push('intermittent')
  if (state.firestoreError) keys.push('firestore-error')
  if (state.tmdbError) keys.push('tmdb-error')
  if (state.groupState) keys.push('group-state')
  if (state.injectedNotifications.length > 0) keys.push('inject-notifs')
  return keys
}

const ACTIVE_LABELS: Record<SimActiveKey, string> = {
  'empty-state': 'Empty State',
  'high-volume': 'High Volume',
  'latency': 'Latency',
  'intermittent': 'Intermittent',
  'firestore-error': 'Firestore Err',
  'tmdb-error': 'TMDB Err',
  'group-state': 'Group State',
  'inject-notifs': 'Notifs',
}

export function getActiveLabels(keys: SimActiveKey[]): string[] {
  return keys.map(k => ACTIVE_LABELS[k])
}

export interface DevSimulationContextValue {
  state: DevSimState
  update: (patch: Partial<DevSimState>) => void
  reset: () => void
  activeKeys: SimActiveKey[]
}

/**
 * Module‑level singleton — usable by services/hooks without React context.
 * DevTools writes here; services that want to support simulation read here.
 */
let _globalDevSim: DevSimState = { ...DEFAULT_DEV_SIM }

export function getDevSimState(): DevSimState {
  return _globalDevSim
}

export function setDevSimState(patch: Partial<DevSimState>) {
  _globalDevSim = { ..._globalDevSim, ...patch }
}

export function resetDevSimState() {
  _globalDevSim = { ...DEFAULT_DEV_SIM }
}

export { computeActiveKeys }
