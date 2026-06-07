import { getFunctionsBasePath, getSupabaseClient } from '../config'
import { completeGameSession, type UnlockedBadge } from './game-badges'

export interface GameScore {
  name: string
  score: number
  date: string
}

export interface GameLeaderboardEntry {
  rank: number
  name: string
  score: number
  date: string
  contradaSlug: string | null
  contradaName: string | null
  isCurrentPlayer: boolean
  badges: string[]
}

export interface ContradaLeaderboardGroup {
  contradaSlug: string
  contradaName: string
  totalPlayers: number
  entries: GameLeaderboardEntry[]
  currentPlayerEntry: GameLeaderboardEntry | null
}

export interface CurrentGamePlayerStanding {
  name: string
  email: string
  contradaSlug: string | null
  contradaName: string | null
  globalRank: number | null
  contradaRank: number | null
  score: number | null
  totalPlayers: number
  contradaPlayers: number
  badges: string[]
}

export interface TotalGameBreakdown {
  gameId: GameId
  rank: number
  score: number
  palioPoints: number
  totalPlayers: number
}

export interface TotalLeaderboardEntry {
  rank: number
  name: string
  totalPoints: number
  gamesPlayed: number
  contradaSlug: string | null
  contradaName: string | null
  isCurrentPlayer: boolean
  games: TotalGameBreakdown[]
}

export interface TotalContradaLeaderboardEntry {
  rank: number
  contradaSlug: string
  contradaName: string
  totalPoints: number
  totalPlayers: number
  currentPlayerEntry: TotalLeaderboardEntry | null
}

export interface TotalLeaderboard {
  global: TotalLeaderboardEntry[]
  contrade: TotalContradaLeaderboardEntry[]
}

export interface GameLeaderboard {
  global: GameLeaderboardEntry[]
  contrade: ContradaLeaderboardGroup[]
  currentPlayer: CurrentGamePlayerStanding | null
  total: TotalLeaderboard
}

export type GameId = 'melocotogno' | 'carriola' | 'cerchio' | 'torre'

const EMPTY_TOTAL_LEADERBOARD: TotalLeaderboard = {
  global: [],
  contrade: [],
}

const LS_KEY = (id: GameId) => `palio-game-${id}-scores`
const MAX_SCORES = 10

function saveLocalScore(id: GameId, entry: GameScore): void {
  try {
    const current: GameScore[] = JSON.parse(localStorage.getItem(LS_KEY(id)) ?? '[]')
    const updated = [...current, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES)
    localStorage.setItem(LS_KEY(id), JSON.stringify(updated))
  } catch {
    // localStorage non disponibile
  }
}

function getLocalScores(id: GameId): GameScore[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(id)) ?? '[]')
  } catch {
    return []
  }
}

export function clearScores(id: GameId): void {
  localStorage.removeItem(LS_KEY(id))
}

export async function getScores(id: GameId): Promise<GameScore[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('game_scores')
      .select('player_name, score, created_at')
      .eq('game_id', id)
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(MAX_SCORES)

    if (error) throw error

    return (data ?? []).map((row) => ({
      name: row.player_name as string,
      score: row.score as number,
      date: new Date(row.created_at as string).toLocaleDateString('it-IT'),
    }))
  } catch {
    return getLocalScores(id)
  }
}

interface GetGameLeaderboardResponse {
  success: boolean
  leaderboard?: GameLeaderboard
  message?: string
}

export async function getGameLeaderboard(id: GameId, playerEmail?: string): Promise<GameLeaderboard> {
  const params = new URLSearchParams({ gameId: id })
  if (playerEmail) {
    params.set('playerEmail', playerEmail)
  }

  try {
    const response = await fetch(`${getFunctionsBasePath()}/get-game-leaderboard?${params.toString()}`)

    let body: GetGameLeaderboardResponse | null = null
    try {
      body = (await response.json()) as GetGameLeaderboardResponse
    } catch {
      body = null
    }

    if (!response.ok || !body?.success || !body.leaderboard) {
      throw new Error(body?.message || 'Errore durante il caricamento della classifica.')
    }

    return {
      ...body.leaderboard,
      total: body.leaderboard.total ?? EMPTY_TOTAL_LEADERBOARD,
    }
  } catch {
    const fallbackScores = await getScores(id)
    return {
      global: fallbackScores.map((entry, index) => ({
        rank: index + 1,
        name: entry.name,
        score: entry.score,
        date: entry.date,
        contradaSlug: null,
        contradaName: null,
        isCurrentPlayer: false,
        badges: [],
      })),
      contrade: [],
      currentPlayer: null,
      total: EMPTY_TOTAL_LEADERBOARD,
    }
  }
}

export async function saveScore(
  id: GameId,
  entry: GameScore,
  options?: { playerEmail?: string },
): Promise<UnlockedBadge[]> {
  saveLocalScore(id, entry)

  if (options?.playerEmail) {
    const trackedResult = await completeGameSession({
      email: options.playerEmail,
      gameId: id,
      score: entry.score,
      playerName: entry.name,
    })

    return trackedResult.unlockedBadges
  }

  const { error } = await getSupabaseClient()
    .from('game_scores')
    .insert({
      game_id: id,
      player_name: entry.name,
      score: entry.score,
    })

  if (error) {
    console.error('[game-scores] Errore Supabase:', error.message)
  }

  return []
}
