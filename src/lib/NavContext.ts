import { createContext, useContext } from 'react'

interface NavState {
  chromeHiddenByScroll: boolean
}

export const NavContext = createContext<NavState>({ chromeHiddenByScroll: false })

export function useNavState() {
  return useContext(NavContext)
}
