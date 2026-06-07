import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import GameBadgeMedallion from '../../components/GameBadgeMedallion'
import { usePalioGamesLayout } from '../../PalioGamesProvider'
import { getGamePlayerProfile, loginGamePlayerWithContrada, updateGamePlayerProfile, type GamePlayerProfile, type UnlockedBadge } from '../../lib/game-badges'
import { clearGamePlayerSession, getGamePlayerSession, saveGamePlayerSession } from '../../lib/game-player-session'
import { getContrade } from '../../lib/contrade'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ContradaOption {
  id: string
  name: string
  slug: string
}

export default function ProfiloPage() {
  const { Header, Footer } = usePalioGamesLayout()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<GamePlayerProfile | null>(null)
  const [badges, setBadges] = useState<UnlockedBadge[]>([])
  const [contrade, setContrade] = useState<ContradaOption[]>([])
  const [contradeLoading, setContradeLoading] = useState(true)

  // login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginContradaSlug, setLoginContradaSlug] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editContradaSlug, setEditContradaSlug] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const loadProfile = (email: string) => {
    setLoading(true)
    setError('')
    getGamePlayerProfile(email)
      .then((result) => {
        setProfile(result.profile)
        setBadges(result.badges)
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Errore nel caricamento profilo.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const syncEditForm = (nextProfile: GamePlayerProfile | null) => {
    setEditName(nextProfile?.name ?? '')
    setEditCity(nextProfile?.city ?? '')
    setEditContradaSlug(nextProfile?.contradaSlug ?? '')
  }

  useEffect(() => {
    getContrade()
      .then(({ data, error: contradeError }) => {
        if (contradeError) {
          throw contradeError
        }

        setContrade(data ?? [])
      })
      .catch(() => {
        setLoginError('Errore nel caricamento delle contrade.')
      })
      .finally(() => {
        setContradeLoading(false)
      })

    const session = getGamePlayerSession()

    if (!session?.email) {
      setLoading(false)
      setLoginContradaSlug(session?.contradaSlug ?? '')
      return
    }

    setLoginContradaSlug(session.contradaSlug ?? '')
    loadProfile(session.email)
  }, [])

  useEffect(() => {
    syncEditForm(profile)
  }, [profile])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    const password = loginPassword
    const contradaSlug = loginContradaSlug.trim()

    if (!EMAIL_REGEX.test(email)) {
      setLoginError('Inserisci un\'email valida.')
      return
    }

    if (!password) {
      setLoginError('Inserisci la password.')
      return
    }

    if (!contradaSlug) {
      setLoginError('Seleziona la contrada.')
      return
    }

    setLoginLoading(true)
    setLoginError('')

    try {
      const result = await loginGamePlayerWithContrada(email, password, contradaSlug)
      saveGamePlayerSession({
        name: result.profile.name,
        email: result.profile.email,
        city: result.profile.city,
        contradaSlug: result.profile.contradaSlug ?? undefined,
        contradaName: result.profile.contradaName ?? undefined,
      })
      setProfile({ ...result.profile, gameStats: result.profile.gameStats })
      setBadges(result.badges)
      setEditMode(false)
      setSaveError('')
      setSaveSuccess('')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Email, password o contrada non corretti.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!profile) return

    const trimmedName = editName.trim()
    const trimmedCity = editCity.trim()
    const trimmedContradaSlug = editContradaSlug.trim()

    if (!trimmedName) {
      setSaveError('Inserisci il nome.')
      return
    }

    if (!trimmedCity) {
      setSaveError('Inserisci la citta.')
      return
    }

    if (!trimmedContradaSlug) {
      setSaveError('Seleziona la contrada.')
      return
    }

    if (!editPassword) {
      setSaveError('Inserisci la password attuale per salvare le modifiche.')
      return
    }

    setSavingProfile(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const updatedProfile = await updateGamePlayerProfile({
        email: profile.email,
        password: editPassword,
        name: trimmedName,
        city: trimmedCity,
        contradaSlug: trimmedContradaSlug,
      })

      setProfile(updatedProfile)
      saveGamePlayerSession({
        name: updatedProfile.name,
        email: updatedProfile.email,
        city: updatedProfile.city,
        contradaSlug: updatedProfile.contradaSlug ?? undefined,
        contradaName: updatedProfile.contradaName ?? undefined,
      })
      setEditMode(false)
      setEditPassword('')
      setSaveSuccess('Profilo aggiornato con successo.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio del profilo.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogout = () => {
    clearGamePlayerSession()
    setProfile(null)
    setBadges([])
    setError('')
    setLoginEmail('')
    setLoginPassword('')
    setLoginError('')
    setLoginContradaSlug('')
    setEditMode(false)
    setSaveError('')
    setSaveSuccess('')
    setEditPassword('')
    setTimeout(() => emailInputRef.current?.focus(), 50)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f7ecd3] to-[#efe2c2] text-palio-950 dark:from-palio-950 dark:to-palio-900 dark:text-amber-50">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border-4 border-amber-700 bg-[radial-gradient(circle_at_top,#fff8ea_0%,#f1dfbf_100%)] p-6 shadow-2xl dark:border-amber-700/70 dark:bg-[radial-gradient(circle_at_top,#3d100f_0%,#160605_100%)]">
            <div className="flex justify-between mb-1">
              <Link to="/giochi" className="inline-flex items-center gap-1 text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:text-amber-100 dark:hover:text-amber-50 dark:focus-visible:outline-amber-300">
                ← Torna ai giochi
              </Link>
              <Link to="/giochi/classifica" className="inline-flex items-center gap-1 text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:text-amber-100 dark:hover:text-amber-50 dark:focus-visible:outline-amber-300">
                Classifica →
              </Link>
            </div>
            <p className="text-center text-lg text-amber-800 dark:text-amber-200">⚜ 🛡 ⚜</p>
            <h1 className="mt-2 text-center font-medieval text-4xl text-palio-900 dark:text-amber-50">Profilo del Giocatore</h1>
            <p className="mt-2 text-center text-amber-900/80 dark:text-amber-100/80">Le tue onorificenze nei Giochi del Palio</p>

            {loading && (
              <div className="py-14 text-center">
                <div className="inline-block h-9 w-9 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                <p className="mt-3 text-amber-900 dark:text-amber-100">Caricamento profilo...</p>
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-xl border-2 border-amber-700 bg-amber-50 p-5 text-center text-amber-900 dark:border-amber-700/70 dark:bg-palio-900 dark:text-amber-100">
                <p>{error}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link to="/giochi" className="btn-game inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:focus-visible:outline-amber-300">Vai ai giochi</Link>
                  <button
                    onClick={handleLogout}
                    className="btn-game focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:focus-visible:outline-amber-300"
                  >
                    Cambia account
                  </button>
                </div>
              </div>
            )}

            {!loading && !profile && !error && (
              <div className="mt-6 rounded-xl border-2 border-amber-700 bg-[#fff8e9] p-6 dark:border-amber-700/70 dark:bg-palio-900">
                <h2 className="text-center font-medieval text-xl text-palio-900 dark:text-amber-100">Accedi al tuo profilo</h2>
                <p className="mt-1 text-center text-sm text-amber-900/70 dark:text-amber-100/75">
                  Inserisci email e password ricevuta via email al momento della registrazione.
                </p>
                <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-3 max-w-sm mx-auto">
                  <label className="text-sm text-amber-900 dark:text-amber-100">
                    <span className="mb-1 block font-semibold">Email</span>
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="input-field w-full text-palio-900 placeholder:text-palio-300 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50 dark:placeholder:text-amber-100/45"
                      placeholder="la-tua@email.it"
                      required
                      autoFocus
                    />
                  </label>
                  <label className="text-sm text-amber-900 dark:text-amber-100">
                    <span className="mb-1 block font-semibold">Password</span>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-field w-full text-palio-900 placeholder:text-palio-300 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50 dark:placeholder:text-amber-100/45"
                      placeholder="La password ricevuta via email"
                      required
                    />
                  </label>
                  <label className="text-sm text-amber-900 dark:text-amber-100">
                    <span className="mb-1 block font-semibold">Contrada</span>
                    <select
                      value={loginContradaSlug}
                      onChange={(e) => setLoginContradaSlug(e.target.value)}
                      className="input-field w-full text-palio-900 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50"
                      required
                      disabled={contradeLoading}
                    >
                      <option value="">Seleziona una contrada</option>
                      {contrade.map((contrada) => (
                        <option key={contrada.id} value={contrada.slug}>
                          {contrada.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {loginError && (
                    <p className="text-sm text-red-700 dark:text-red-300">{loginError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="btn-game disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:focus-visible:outline-amber-300"
                  >
                    {loginLoading ? 'Caricamento...' : 'Accedi'}
                  </button>
                </form>
                <p className="mt-4 text-center text-sm text-amber-900/60 dark:text-amber-100/70">
                  Non hai un account?{' '}
                  <Link to="/giochi" className="font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:text-amber-100 dark:hover:text-amber-50 dark:focus-visible:outline-amber-300">
                    Gioca e registrati
                  </Link>
                </p>
              </div>
            )}

            {!loading && !error && profile && (
              <>
                <div className="mt-4 flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setEditMode((current) => !current)
                      setSaveError('')
                      setSaveSuccess('')
                      setEditPassword('')
                      syncEditForm(profile)
                    }}
                    className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:text-amber-100 dark:hover:text-amber-50 dark:focus-visible:outline-amber-300"
                  >
                    {editMode ? 'Annulla modifica' : 'Modifica dati'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-semibold text-palio-700 underline underline-offset-2 hover:text-palio-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:text-amber-100 dark:hover:text-amber-50 dark:focus-visible:outline-amber-300"
                  >
                    Cambia account
                  </button>
                </div>
                {saveSuccess && (
                  <div className="mt-4 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100">
                    {saveSuccess}
                  </div>
                )}
                <div className="mt-3 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-4 text-center dark:bg-palio-900">
                    <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">Giocatore</p>
                    <p className="mt-2 text-lg font-semibold text-palio-900 dark:text-amber-50">{profile.name}</p>
                  </div>
                  <div className="rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-4 text-center dark:bg-palio-900">
                    <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">Citta</p>
                    <p className="mt-2 text-lg font-semibold text-palio-900 dark:text-amber-50">{profile.city}</p>
                  </div>
                  <div className="rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-4 text-center dark:bg-palio-900">
                    <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">Contrada</p>
                    <p className="mt-2 text-base font-semibold text-palio-900 dark:text-amber-50">{profile.contradaName || 'Non impostata'}</p>
                  </div>
                  <div className="rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-4 text-center dark:bg-palio-900">
                    <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">Partite giocate</p>
                    <p className="mt-2 text-2xl font-bold text-palio-900 dark:text-amber-50">{profile.totalGamesPlayed}</p>
                  </div>
                </div>

                {editMode && (
                  <form
                    onSubmit={handleProfileSave}
                    className="mt-6 rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-5 dark:bg-palio-900"
                  >
                    <h2 className="font-medieval text-2xl text-palio-900 dark:text-amber-100">Modifica profilo</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-amber-900 dark:text-amber-100">
                        <span className="mb-1 block font-semibold">Nome</span>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="input-field w-full text-palio-900 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50"
                          maxLength={40}
                          required
                        />
                      </label>
                      <label className="text-sm text-amber-900 dark:text-amber-100">
                        <span className="mb-1 block font-semibold">Citta</span>
                        <input
                          value={editCity}
                          onChange={(event) => setEditCity(event.target.value)}
                          className="input-field w-full text-palio-900 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50"
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="text-sm text-amber-900 dark:text-amber-100">
                        <span className="mb-1 block font-semibold">Contrada</span>
                        <select
                          value={editContradaSlug}
                          onChange={(event) => setEditContradaSlug(event.target.value)}
                          className="input-field w-full text-palio-900 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50"
                          required
                        >
                          <option value="">Seleziona una contrada</option>
                          {contrade.map((contrada) => (
                            <option key={contrada.id} value={contrada.slug}>
                              {contrada.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-amber-900 dark:text-amber-100">
                        <span className="mb-1 block font-semibold">Password attuale</span>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(event) => setEditPassword(event.target.value)}
                          className="input-field w-full text-palio-900 placeholder:text-palio-300 dark:border-amber-700 dark:bg-palio-950 dark:text-amber-50 dark:placeholder:text-amber-100/45"
                          placeholder="Necessaria per salvare"
                          required
                        />
                      </label>
                    </div>
                    {saveError && (
                      <p className="mt-3 text-sm text-red-700 dark:text-red-300">{saveError}</p>
                    )}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="btn-game disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:focus-visible:outline-amber-300"
                      >
                        {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
                      </button>
                    </div>
                  </form>
                )}

                {profile.gameStats.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-medieval text-2xl text-palio-900 dark:text-amber-100">Statistiche per gioco</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {profile.gameStats.map((stat) => (
                        <div
                          key={stat.gameId}
                          className="rounded-xl border-2 border-amber-700/60 bg-[#fff8e9] p-4 dark:bg-palio-900"
                        >
                          <p className="font-medieval text-base capitalize text-palio-900 dark:text-amber-100">{stat.gameId}</p>
                          <div className="mt-2 flex gap-6 text-sm text-amber-900 dark:text-amber-100/80">
                            <span><span className="font-semibold">{stat.timesPlayed}</span> partite</span>
                            <span>Miglior punteggio: <span className="font-semibold">{stat.bestScore}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h2 className="font-medieval text-2xl text-palio-900 dark:text-amber-100">Badge conquistati</h2>
                  {badges.length === 0 ? (
                    <div className="mt-4 rounded-xl border-2 border-amber-700/40 bg-[#fff8e9] p-6 text-amber-900 dark:bg-palio-900 dark:text-amber-100">
                      Nessun badge ancora ottenuto. Gioca e torna qui per vedere i tuoi progressi.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {badges.map((badge) => (
                        <article
                          key={`${badge.slug}-${badge.earnedAt}`}
                          className="rounded-xl border-2 border-amber-700 bg-[#fff6e0] p-4 shadow-lg dark:bg-palio-900"
                          style={{ boxShadow: 'inset 0 0 0 1px #f0d07a, 0 8px 24px rgba(92, 45, 6, 0.18)' }}
                        >
                          <div className="flex items-center gap-3">
                            <GameBadgeMedallion badge={badge} />
                            <div>
                              <h3 className="font-medieval text-lg text-palio-900 dark:text-amber-100">{badge.name}</h3>
                              <p className="text-xs text-amber-900/70 dark:text-amber-100/70">🛡 Emblema del Ducato</p>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-amber-950 dark:text-amber-50">{badge.description}</p>
                          <p className="mt-3 text-xs text-amber-900/70 dark:text-amber-100/70">
                            Ottenuto il {new Date(badge.earnedAt).toLocaleDateString('it-IT')}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
