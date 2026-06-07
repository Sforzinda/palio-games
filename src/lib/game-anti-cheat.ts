export interface GameIntegrityOptions {
  maxAcceptedInputsPerSecond: number
  maxIdenticalPositionStreak: number
  maxScore: number
  minDurationMs: number
  minTrustedInputs: number
}

export interface GameIntegrityResult {
  isValid: boolean
  message?: string
}

interface GameIntegrityStats {
  acceptedInputs: number
  endedAt: number
  identicalPositionStreak: number
  lastInputAt: number
  lastPosition: { x: number; y: number } | null
  maxIdenticalPositionStreak: number
  rejectedInputs: number
  startedAt: number
}

const DEFAULT_OPTIONS: GameIntegrityOptions = {
  maxAcceptedInputsPerSecond: 16,
  maxIdenticalPositionStreak: 10,
  maxScore: Number.MAX_SAFE_INTEGER,
  minDurationMs: 750,
  minTrustedInputs: 1,
}

function getInitialStats(): GameIntegrityStats {
  return {
    acceptedInputs: 0,
    endedAt: 0,
    identicalPositionStreak: 0,
    lastInputAt: 0,
    lastPosition: null,
    maxIdenticalPositionStreak: 0,
    rejectedInputs: 0,
    startedAt: 0,
  }
}

function isPrimaryHumanInput(event: Event): boolean {
  if (!event.isTrusted) return false

  if (event instanceof MouseEvent) {
    return event.button === 0
  }

  if (event instanceof TouchEvent) {
    return event.changedTouches.length > 0
  }

  return false
}

export function createGameIntegrityTracker(options: Partial<GameIntegrityOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let stats = getInitialStats()

  function start(now = performance.now()): void {
    stats = getInitialStats()
    stats.startedAt = now
  }

  function end(now = performance.now()): void {
    stats.endedAt = now
  }

  function recordInput(event: Event, position: { x: number; y: number }): boolean {
    if (!isPrimaryHumanInput(event)) {
      stats.rejectedInputs++
      return false
    }

    const now = performance.now()
    const durationMs = Math.max(now - stats.startedAt, 1)
    const nextInputsPerSecond = ((stats.acceptedInputs + 1) / durationMs) * 1000

    if (durationMs >= 1000 && nextInputsPerSecond > config.maxAcceptedInputsPerSecond) {
      stats.rejectedInputs++
      return false
    }

    const normalizedPosition = {
      x: Math.round(position.x),
      y: Math.round(position.y),
    }

    if (
      stats.lastPosition &&
      stats.lastPosition.x === normalizedPosition.x &&
      stats.lastPosition.y === normalizedPosition.y
    ) {
      stats.identicalPositionStreak++
    } else {
      stats.identicalPositionStreak = 0
    }

    stats.maxIdenticalPositionStreak = Math.max(
      stats.maxIdenticalPositionStreak,
      stats.identicalPositionStreak,
    )
    stats.lastInputAt = now
    stats.lastPosition = normalizedPosition
    stats.acceptedInputs++

    if (stats.identicalPositionStreak > config.maxIdenticalPositionStreak) {
      stats.rejectedInputs++
      return false
    }

    return true
  }

  function validate(score: number): GameIntegrityResult {
    const endedAt = stats.endedAt || performance.now()
    const durationMs = endedAt - stats.startedAt

    if (!Number.isFinite(score) || score < 0 || score > config.maxScore) {
      return {
        isValid: false,
        message: 'Punteggio non valido. Rigioca la partita.',
      }
    }

    if (durationMs < config.minDurationMs) {
      return {
        isValid: false,
        message: 'Partita troppo breve per salvare il punteggio. Rigioca senza automatismi.',
      }
    }

    if (stats.acceptedInputs < config.minTrustedInputs) {
      return {
        isValid: false,
        message: 'Non sono stati rilevati input reali sufficienti. Rigioca toccando lo schermo normalmente.',
      }
    }

    if (stats.maxIdenticalPositionStreak > config.maxIdenticalPositionStreak) {
      return {
        isValid: false,
        message: 'Sono stati rilevati tocchi troppo ripetitivi. Rigioca senza autoclicker.',
      }
    }

    return { isValid: true }
  }

  return {
    end,
    recordInput,
    start,
    validate,
  }
}
