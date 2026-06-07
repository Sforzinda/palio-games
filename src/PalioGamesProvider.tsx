import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

interface PalioGamesLayoutContextValue {
  Header: ComponentType
  Footer: ComponentType
}

const PalioGamesLayoutContext = createContext<PalioGamesLayoutContextValue | null>(null)

interface PalioGamesProviderProps {
  Header: ComponentType
  Footer: ComponentType
  children: ReactNode
}

export function PalioGamesProvider({ Header, Footer, children }: PalioGamesProviderProps) {
  return (
    <PalioGamesLayoutContext.Provider value={{ Header, Footer }}>
      {children}
    </PalioGamesLayoutContext.Provider>
  )
}

export function usePalioGamesLayout(): PalioGamesLayoutContextValue {
  const ctx = useContext(PalioGamesLayoutContext)
  if (!ctx) {
    throw new Error('usePalioGamesLayout must be used within PalioGamesProvider')
  }
  return ctx
}
