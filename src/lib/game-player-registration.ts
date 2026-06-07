import { getFunctionsBasePath } from '../config'
import type { GameId } from './game-scores'

export interface RegisterGamePlayerPayload {
  gameId: GameId
  score: number
  name: string
  email: string
  city: string
  age: number
  contradaSlug: string
}

interface RegisterGamePlayerResponse {
  success: boolean
  message?: string
  code?: string
  player?: {
    name: string
    email: string
    cityOfResidence: string
    contradaSlug: string | null
    contradaName: string | null
    totalGamesPlayed: number
  }
}

export const registerGamePlayer = async (payload: RegisterGamePlayerPayload): Promise<{
  name: string
  email: string
  cityOfResidence: string
  contradaSlug: string | null
  contradaName: string | null
  totalGamesPlayed: number
}> => {
  const response = await fetch(`${getFunctionsBasePath()}/register-game-player`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let body: RegisterGamePlayerResponse | null = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const fallbackMessage = 'Registrazione non completata. Riprova tra qualche istante.'
    const error = new Error(body?.message || fallbackMessage)
    ;(error as Error & { code?: string }).code = body?.code
    throw error
  }

  if (!body?.player) {
    throw new Error('Registrazione completata ma risposta incompleta.')
  }

  return body.player
}
