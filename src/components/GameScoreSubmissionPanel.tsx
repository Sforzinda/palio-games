import { useMemo, useState } from 'react'
import GameBadgeMedallion from './GameBadgeMedallion'
import { loginGamePlayerWithContrada, type UnlockedBadge } from '../lib/game-badges'
import { getGamePlayerSession, saveGamePlayerSession } from '../lib/game-player-session'
import { registerGamePlayer } from '../lib/game-player-registration'
import { getContrade } from '../lib/contrade'
import { saveScore, type GameId } from '../lib/game-scores'

interface GameScoreSubmissionPanelProps {
  gameId: GameId
  score: number
  onPlayAgain: () => void
  onViewLeaderboard: () => void
}

interface RegistrationFormState {
  name: string
  email: string
  city: string
  age: string
  contradaSlug: string
}

interface LoginFormState {
  email: string
  password: string
  contradaSlug: string
}

interface ContradaOption {
  id: string
  name: string
  slug: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const toTitleCaseCity = (value: string) =>
  value
    .toLocaleLowerCase('it-IT')
    .replace(/\b([\p{L}])/gu, (match) => match.toLocaleUpperCase('it-IT'))

const toDigitsOnly = (value: string) => value.replace(/\D+/g, '')

export default function GameScoreSubmissionPanel({
  gameId,
  score,
  onPlayAgain,
  onViewLeaderboard,
}: GameScoreSubmissionPanelProps) {
  const [trackedSession, setTrackedSession] = useState(() => getGamePlayerSession())
  const [playerName, setPlayerName] = useState(() => getGamePlayerSession()?.name ?? '')
  const [savingScore, setSavingScore] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [registrationDone, setRegistrationDone] = useState(false)
  const [completionTitle, setCompletionTitle] = useState('Registrazione completata!')
  const [errorMessage, setErrorMessage] = useState('')
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<UnlockedBadge[]>([])
  const [redirectToLeaderboardAfterBadges, setRedirectToLeaderboardAfterBadges] = useState(false)
  const [form, setForm] = useState<RegistrationFormState>({
    name: '',
    email: '',
    city: '',
    age: '',
    contradaSlug: '',
  })
  const [contrade, setContrade] = useState<ContradaOption[]>([])
  const [loginForm, setLoginForm] = useState<LoginFormState>(() => ({
    email: trackedSession?.email ?? '',
    password: '',
    contradaSlug: trackedSession?.contradaSlug ?? '',
  }))

  const isNameValid = useMemo(() => playerName.trim().length > 0, [playerName])
  const isTrackedPlayer = Boolean(trackedSession?.email)
  const hasLoadedContrade = contrade.length > 0

  const loadContrade = () => {
    if (contrade.length > 0) return

    getContrade()
      .then(({ data }) => {
        setContrade(data ?? [])
      })
      .catch(() => {
        setContrade([])
      })
  }

  const ensureScoreSaved = async (nameToSave?: string, emailToTrack?: string) => {
    if (scoreSaved) return []

    const scoreName = String(nameToSave ?? playerName).trim().slice(0, 20)
    const trackedEmail = emailToTrack ?? trackedSession?.email

    let unlockedBadges: UnlockedBadge[] = []

    try {
      unlockedBadges = await saveScore(gameId, {
        name: scoreName,
        score,
        date: new Date().toLocaleDateString('it-IT'),
      }, trackedEmail ? { playerEmail: trackedEmail } : undefined)
    } catch (error) {
      if (trackedEmail) {
        unlockedBadges = await saveScore(gameId, {
          name: scoreName,
          score,
          date: new Date().toLocaleDateString('it-IT'),
        })
      } else {
        throw error
      }
    }

    if (unlockedBadges.length > 0) {
      setNewlyUnlockedBadges((current) => [...current, ...unlockedBadges])
    }

    setScoreSaved(true)
    return unlockedBadges
  }

  const handleSaveScore = async () => {
    if (!isNameValid || savingScore) return

    setSavingScore(true)
    setErrorMessage('')

    try {
      const unlockedBadges = await ensureScoreSaved()
      if (unlockedBadges.length > 0) {
        setRedirectToLeaderboardAfterBadges(true)
        return
      }
      onViewLeaderboard()
    } finally {
      setSavingScore(false)
    }
  }

  const handleOpenRegistration = () => {
    if (!isNameValid || savingScore || registering || loggingIn) return

    setErrorMessage('')
    setShowLoginForm(false)
    setShowRegistrationForm(true)
    setForm((current) => ({
      ...current,
      name: playerName.trim(),
    }))
    loadContrade()
  }

  const handleOpenLogin = () => {
    if (savingScore || registering || loggingIn) return

    setErrorMessage('')
    setShowRegistrationForm(false)
    setShowLoginForm(true)
    setLoginForm((current) => ({
      email: trackedSession?.email ?? current.email,
      password: '',
      contradaSlug: trackedSession?.contradaSlug ?? current.contradaSlug,
    }))
    loadContrade()
  }

  const handleRegistrationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (registering) return

    const trimmedName = form.name.trim()
    const trimmedEmail = form.email.trim().toLowerCase()
    const trimmedCity = form.city.trim()
    const trimmedContradaSlug = form.contradaSlug.trim()
    const ageValue = Number(form.age)

    if (!trimmedName) {
      setErrorMessage('Inserisci il nome.')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Inserisci una email valida.')
      return
    }

    if (!trimmedCity) {
      setErrorMessage('Inserisci la citta di residenza.')
      return
    }

    if (!Number.isInteger(ageValue) || ageValue < 1 || ageValue > 120) {
      setErrorMessage('Inserisci un\'eta valida.')
      return
    }

    if (!trimmedContradaSlug) {
      setErrorMessage('Seleziona una contrada.')
      return
    }

    setRegistering(true)
    setErrorMessage('')

    try {
      const registeredPlayer = await registerGamePlayer({
        gameId,
        score,
        name: trimmedName,
        email: trimmedEmail,
        city: trimmedCity,
        age: ageValue,
        contradaSlug: trimmedContradaSlug,
      })

      saveGamePlayerSession({
        name: registeredPlayer.name,
        email: registeredPlayer.email,
        city: registeredPlayer.cityOfResidence,
        contradaSlug: registeredPlayer.contradaSlug ?? undefined,
        contradaName: registeredPlayer.contradaName ?? undefined,
      })
      setTrackedSession({
        name: registeredPlayer.name,
        email: registeredPlayer.email,
        city: registeredPlayer.cityOfResidence,
        contradaSlug: registeredPlayer.contradaSlug ?? undefined,
        contradaName: registeredPlayer.contradaName ?? undefined,
      })

      setPlayerName(trimmedName)
      await ensureScoreSaved(trimmedName, trimmedEmail)
      setCompletionTitle('Registrazione completata!')
      setRegistrationDone(true)
    } catch (error) {
      if (error instanceof Error && (error as Error & { code?: string }).code === 'EMAIL_ALREADY_REGISTERED') {
        setErrorMessage('Questa email e gia registrata.')
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Errore durante la registrazione.')
      }
    } finally {
      setRegistering(false)
    }
  }

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loggingIn) return

    const trimmedEmail = loginForm.email.trim().toLowerCase()
    const password = loginForm.password
    const trimmedContradaSlug = loginForm.contradaSlug.trim()

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Inserisci una email valida.')
      return
    }

    if (!password) {
      setErrorMessage('Inserisci la password.')
      return
    }

    if (!trimmedContradaSlug) {
      setErrorMessage('Seleziona una contrada.')
      return
    }

    setLoggingIn(true)
    setErrorMessage('')

    try {
      const result = await loginGamePlayerWithContrada(trimmedEmail, password, trimmedContradaSlug)

      saveGamePlayerSession({
        name: result.profile.name,
        email: result.profile.email,
        city: result.profile.city,
        contradaSlug: result.profile.contradaSlug ?? undefined,
        contradaName: result.profile.contradaName ?? undefined,
      })
      setTrackedSession({
        name: result.profile.name,
        email: result.profile.email,
        city: result.profile.city,
        contradaSlug: result.profile.contradaSlug ?? undefined,
        contradaName: result.profile.contradaName ?? undefined,
      })
      setPlayerName(result.profile.name)
      await ensureScoreSaved(result.profile.name, result.profile.email)
      setCompletionTitle('Accesso completato!')
      setRegistrationDone(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Email, password o contrada non corretti.')
    } finally {
      setLoggingIn(false)
    }
  }

  const badgePopup = newlyUnlockedBadges[0] ? (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="badge-unlock-popup w-full max-w-sm rounded-2xl border-4 border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 p-5 text-center shadow-2xl">
        <p className="font-medieval text-2xl text-palio-800">Nuovo badge sbloccato!</p>
        <div className="mt-4 flex justify-center">
          <GameBadgeMedallion badge={newlyUnlockedBadges[0]} size="lg" />
        </div>
        <p className="mt-2 font-medieval text-xl text-palio-900">{newlyUnlockedBadges[0].name}</p>
        <button
          className="btn-game mt-5 w-full"
          onClick={() => {
            setNewlyUnlockedBadges((current) => {
              const remainingBadges = current.slice(1)
              if (remainingBadges.length === 0 && redirectToLeaderboardAfterBadges) {
                setRedirectToLeaderboardAfterBadges(false)
                onViewLeaderboard()
              }
              return remainingBadges
            })
          }}
        >
          Continua
        </button>
      </div>
    </div>
  ) : null

  if (registrationDone) {
    return (
      <>
        <div className="w-full max-w-md rounded-xl border-2 border-palio-300 bg-[#fff8e9] p-5 text-center text-palio-900 shadow-xl">
          <p className="font-medieval text-2xl text-palio-700">{completionTitle}</p>
          <div className="mt-4 flex flex-col gap-3">
            <button onClick={onPlayAgain} className="btn-game">Rigioca</button>
            <button onClick={onViewLeaderboard} className="btn-game">Vedi classifica</button>
          </div>
        </div>
        {badgePopup}
      </>
    )
  }

  if (showRegistrationForm) {
    return (
      <>
        <form
          onSubmit={handleRegistrationSubmit}
          className="w-full max-w-md rounded-xl border-2 border-palio-300 bg-[#fff8e9] p-5 text-left text-palio-900 shadow-xl"
        >
          <div className="grid gap-3">
            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Nome</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                maxLength={40}
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value.toLocaleLowerCase('it-IT') }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Citta di residenza</span>
              <input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: toTitleCaseCity(event.target.value) }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                maxLength={80}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Eta</span>
              <input
                type="text"
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: toDigitsOnly(event.target.value).slice(0, 3) }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={3}
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Contrada</span>
              <select
                value={form.contradaSlug}
                onChange={(event) => setForm((current) => ({ ...current, contradaSlug: event.target.value }))}
                className="input-field w-full text-palio-900"
                required
              >
                <option value="">Seleziona una contrada</option>
                {contrade.map((contrada) => (
                  <option key={contrada.id} value={contrada.slug}>
                    {contrada.name}
                  </option>
                ))}
              </select>
              {!hasLoadedContrade && (
                <span className="mt-1 block text-xs text-amber-900/70">Caricamento contrade...</span>
              )}
            </label>
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm text-red-700">{errorMessage}</p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <button type="submit" disabled={registering} className="btn-game disabled:opacity-50 disabled:cursor-not-allowed">
              {registering ? 'Registrazione...' : 'Conferma registrazione'}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900"
              onClick={() => {
                setShowRegistrationForm(false)
                setErrorMessage('')
              }}
            >
              Torna indietro
            </button>
          </div>
        </form>
        {badgePopup}
      </>
    )
  }

  if (showLoginForm) {
    return (
      <>
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-md rounded-xl border-2 border-palio-300 bg-[#fff8e9] p-5 text-left text-palio-900 shadow-xl"
        >
          <div className="grid gap-3">
            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value.toLocaleLowerCase('it-IT') }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                className="input-field w-full text-palio-900 placeholder:text-palio-300"
                autoComplete="current-password"
                required
              />
            </label>

            <label className="text-sm text-palio-900">
              <span className="mb-1 block font-semibold text-palio-700">Contrada</span>
              <select
                value={loginForm.contradaSlug}
                onChange={(event) => setLoginForm((current) => ({ ...current, contradaSlug: event.target.value }))}
                className="input-field w-full text-palio-900"
                required
              >
                <option value="">Seleziona una contrada</option>
                {contrade.map((contrada) => (
                  <option key={contrada.id} value={contrada.slug}>
                    {contrada.name}
                  </option>
                ))}
              </select>
              {!hasLoadedContrade && (
                <span className="mt-1 block text-xs text-amber-900/70">Caricamento contrade...</span>
              )}
            </label>
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm text-red-700">{errorMessage}</p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <button type="submit" disabled={loggingIn} className="btn-game disabled:opacity-50 disabled:cursor-not-allowed">
              {loggingIn ? 'Accesso...' : 'Accedi e abbina il punteggio'}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900"
              onClick={() => {
                setShowLoginForm(false)
                setErrorMessage('')
              }}
            >
              Torna indietro
            </button>
          </div>
        </form>
        {badgePopup}
      </>
    )
  }

  return (
    <>
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        <input
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Il tuo nome"
          className="input-field w-full max-w-xs text-center"
          maxLength={20}
          onKeyDown={(event) => event.key === 'Enter' && handleSaveScore()}
          readOnly={isTrackedPlayer}
        />
        {isTrackedPlayer && (
          <p className="text-center text-sm text-palio-700">
            Il punteggio verra salvato automaticamente sul tuo profilo.
          </p>
        )}
        <button
          onClick={handleSaveScore}
          disabled={!isNameValid || savingScore}
          className="btn-game disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingScore ? 'Salvataggio...' : 'Salva punteggio'}
        </button>
        {!isTrackedPlayer && (
          <>
            <button
              onClick={handleOpenRegistration}
              disabled={!isNameValid || savingScore || registering || loggingIn}
              className="btn-game disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Registrati e salva i progressi
            </button>
            <button
              onClick={handleOpenLogin}
              disabled={savingScore || registering || loggingIn}
              className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ho gia un account, accedi
            </button>
          </>
        )}
        {errorMessage && (
          <p className="text-sm text-red-700">{errorMessage}</p>
        )}
        <button onClick={onPlayAgain} className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900">
          Rigioca
        </button>
      </div>
      {badgePopup}
    </>
  )
}
