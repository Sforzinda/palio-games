export interface GamePlayerSession {
  name: string
  email: string
  city: string
  contradaSlug?: string
  contradaName?: string
}

const SESSION_KEY = 'palio-game-player-session'

export function getGamePlayerSession(): GamePlayerSession | null {
  try {
    const rawValue = localStorage.getItem(SESSION_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue) as Partial<GamePlayerSession>
    if (!parsed.email || !parsed.name || !parsed.city) {
      return null
    }

    return {
      email: String(parsed.email),
      name: String(parsed.name),
      city: String(parsed.city),
      contradaSlug: parsed.contradaSlug ? String(parsed.contradaSlug) : undefined,
      contradaName: parsed.contradaName ? String(parsed.contradaName) : undefined,
    }
  } catch {
    return null
  }
}

export function saveGamePlayerSession(session: GamePlayerSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearGamePlayerSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
