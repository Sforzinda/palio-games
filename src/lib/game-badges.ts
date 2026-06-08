import { getFunctionsBasePath } from '../config'
import type { GameId } from './game-scores'

export interface UnlockedBadge {
  slug: string
  name: string
  description: string
  icon: string
  earnedAt: string
}

export interface GameStat {
  gameId: string
  bestScore: number
  timesPlayed: number
}

export interface GamePlayerProfile {
  name: string
  email: string
  city: string
  contradaSlug: string | null
  contradaName: string | null
  totalGamesPlayed: number
  gameStats: GameStat[]
}

interface CompleteGameSessionPayload {
  email: string
  gameId: GameId
  score: number
  playerName: string
}

interface CompleteGameSessionResponse {
  success: boolean
  totalGamesPlayed?: number
  unlockedBadges?: UnlockedBadge[]
  message?: string
}

interface GameProfileResponse {
  success: boolean
  profile?: GamePlayerProfile
  badges?: UnlockedBadge[]
  message?: string
}

/**
 * Errore sollevato durante il caricamento del profilo giocatore.
 * `notFound` distingue una sessione non valida (profilo inesistente, va richiesto
 * un nuovo login) da un errore transitorio (rete/server, la sessione resta valida).
 */
export class GamePlayerProfileError extends Error {
  readonly notFound: boolean

  constructor(message: string, notFound: boolean) {
    super(message)
    this.name = 'GamePlayerProfileError'
    this.notFound = notFound
  }
}

export async function completeGameSession(payload: CompleteGameSessionPayload): Promise<{
  totalGamesPlayed: number | null
  unlockedBadges: UnlockedBadge[]
}> {
  const response = await fetch(`${getFunctionsBasePath()}/complete-game-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let body: CompleteGameSessionResponse | null = null
  try {
    body = (await response.json()) as CompleteGameSessionResponse
  } catch {
    body = null
  }

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'Errore durante il completamento partita.')
  }

  return {
    totalGamesPlayed: typeof body.totalGamesPlayed === 'number' ? body.totalGamesPlayed : null,
    unlockedBadges: body.unlockedBadges ?? [],
  }
}

export async function getGamePlayerProfile(email: string): Promise<{
  profile: GamePlayerProfile
  badges: UnlockedBadge[]
}> {
  const response = await fetch(`${getFunctionsBasePath()}/get-game-player-profile?email=${encodeURIComponent(email)}`)

  let body: GameProfileResponse | null = null
  try {
    body = (await response.json()) as GameProfileResponse
  } catch {
    body = null
  }

  if (!response.ok || !body?.success || !body.profile) {
    throw new GamePlayerProfileError(
      body?.message || 'Errore durante il caricamento del profilo.',
      response.status === 404,
    )
  }

  return {
    profile: {
      ...body.profile,
      gameStats: body.profile.gameStats ?? [],
    },
    badges: body.badges ?? [],
  }
}

export async function loginGamePlayerWithContrada(email: string, password: string, contradaSlug: string): Promise<{
  profile: GamePlayerProfile
  badges: UnlockedBadge[]
}> {
  const response = await fetch(`${getFunctionsBasePath()}/login-game-player`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, contradaSlug }),
  })

  let body: GameProfileResponse | null = null
  try {
    body = (await response.json()) as GameProfileResponse
  } catch {
    body = null
  }

  if (!response.ok || !body?.success || !body.profile) {
    throw new Error(body?.message || 'Email, password o contrada non corretti.')
  }

  return {
    profile: {
      ...body.profile,
      gameStats: body.profile.gameStats ?? [],
    },
    badges: body.badges ?? [],
  }
}

interface UpdateGamePlayerProfilePayload {
  email: string
  name: string
  city: string
  contradaSlug: string
}

export async function updateGamePlayerProfile(payload: UpdateGamePlayerProfilePayload): Promise<GamePlayerProfile> {
  const response = await fetch(`${getFunctionsBasePath()}/update-game-player-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let body: GameProfileResponse | null = null
  try {
    body = (await response.json()) as GameProfileResponse
  } catch {
    body = null
  }

  if (!response.ok || !body?.success || !body.profile) {
    throw new Error(body?.message || 'Errore durante l\'aggiornamento del profilo.')
  }

  return {
    ...body.profile,
    gameStats: body.profile.gameStats ?? [],
  }
}
