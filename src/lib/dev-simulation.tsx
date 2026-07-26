import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { type DevSimState, DEFAULT_DEV_SIM, type DevSimulationContextValue, computeActiveKeys } from './dev-simulation-types'

const DevSimulationContext = createContext<DevSimulationContextValue>({
  state: DEFAULT_DEV_SIM,
  update: () => {},
  reset: () => {},
  activeKeys: [],
})

export function useDevSimulation() {
  return useContext(DevSimulationContext)
}

export function DevSimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DevSimState>(DEFAULT_DEV_SIM)

  const update = useCallback((patch: Partial<DevSimState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_DEV_SIM)
  }, [])

  const value = useMemo<DevSimulationContextValue>(() => ({
    state,
    update,
    reset,
    activeKeys: computeActiveKeys(state),
  }), [state, update, reset])

  return (
    <DevSimulationContext.Provider value={value}>
      {children}
    </DevSimulationContext.Provider>
  )
}
