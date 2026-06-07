export { PalioGamesProvider, usePalioGamesLayout } from './PalioGamesProvider'
export { initPalioGames, getSupabaseClient, getFunctionsBasePath } from './config'
export { getContrade } from './lib/contrade'
export { getGamePlayerSession, saveGamePlayerSession, clearGamePlayerSession } from './lib/game-player-session'
export {
  completeGameSession,
  getGamePlayerProfile,
  loginGamePlayerWithContrada,
  updateGamePlayerProfile,
} from './lib/game-badges'
export type { UnlockedBadge, GameStat, GamePlayerProfile } from './lib/game-badges'
export { registerGamePlayer } from './lib/game-player-registration'
export type { RegisterGamePlayerPayload } from './lib/game-player-registration'
export {
  getScores,
  getGameLeaderboard,
  saveScore,
  clearScores,
} from './lib/game-scores'
export type {
  GameId,
  GameScore,
  GameLeaderboard,
  GameLeaderboardEntry,
  ContradaLeaderboardGroup,
  CurrentGamePlayerStanding,
  TotalLeaderboard,
  TotalLeaderboardEntry,
  TotalContradaLeaderboardEntry,
  TotalGameBreakdown,
} from './lib/game-scores'

export { default as GiochiPage } from './pages/GiochiPage'
export { default as ClassificaPage } from './pages/giochi/ClassificaPage'
export { default as ProfiloPage } from './pages/giochi/ProfiloPage'
export { default as MelocotognoGame } from './pages/giochi/MelocotognoGame'
export { default as CarriolaGame } from './pages/giochi/CarriolaGame'
export { default as CerchioGame } from './pages/giochi/CerchioGame'
export { default as TorreGame } from './pages/giochi/TorreGame'

export { default as GameBadgeMedallion } from './components/GameBadgeMedallion'
export { default as GameLeaderboardBadge } from './components/GameLeaderboardBadge'
export { default as GamePlayShell } from './components/GamePlayShell'
export { default as GameScoreSubmissionPanel } from './components/GameScoreSubmissionPanel'
