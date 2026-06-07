import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GameLeaderboardBadge from '../../components/GameLeaderboardBadge'
import { usePalioGamesLayout } from '../../PalioGamesProvider'
import { getGamePlayerSession } from '../../lib/game-player-session'
import {
  type ContradaLeaderboardGroup,
  type GameId,
  type GameLeaderboard,
  type GameLeaderboardEntry,
  type TotalContradaLeaderboardEntry,
  type TotalLeaderboardEntry,
  getGameLeaderboard,
} from '../../lib/game-scores'

type ActiveTabId = GameId | 'totale'

interface GameTab {
  id: GameId
  label: string
  icon: string
  unit: string
}

interface NavigationTab {
  id: ActiveTabId
  label: string
  icon: string
}

const GAME_TABS: GameTab[] = [
  { id: 'melocotogno', label: 'Melocotogno', icon: '🌿', unit: 'pt' },
  { id: 'carriola', label: 'Carriola', icon: '🛻', unit: 'm' },
  { id: 'cerchio', label: 'Cerchio', icon: '⭕', unit: 'm' },
  { id: 'torre', label: 'Torre', icon: '🏰', unit: 'liv' },
]

const NAVIGATION_TABS: NavigationTab[] = [
  ...GAME_TABS,
  { id: 'totale', label: 'Totale', icon: '🏆' },
]

const MEDAL = ['🥇', '🥈', '🥉']

const EMPTY_LEADERBOARD: GameLeaderboard = {
  global: [],
  contrade: [],
  currentPlayer: null,
  total: {
    global: [],
    contrade: [],
  },
}

function renderRank(rank: number) {
  return rank <= 3 ? MEDAL[rank - 1] : <span className="text-sm">{rank}</span>
}

function EntryBadges({ entry }: { entry: Pick<GameLeaderboardEntry, 'badges'> }) {
  if (entry.badges.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entry.badges.map((badgeCode) => (
        <GameLeaderboardBadge key={badgeCode} code={badgeCode} />
      ))}
    </div>
  )
}

function ContradaCard({
  group,
  activeTab,
  isCurrentPlayerContrada,
}: {
  group: ContradaLeaderboardGroup
  activeTab: GameTab
  isCurrentPlayerContrada: boolean
}) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-md ${
        isCurrentPlayerContrada
          ? 'border-palio-500 bg-palio-50/80 shadow-palio-200'
          : 'border-amber-200 bg-white/90'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medieval text-xl text-palio-900">{group.contradaName}</h3>
          <p className="text-sm text-palio-700">{group.totalPlayers} giocatori classificati</p>
        </div>
        {isCurrentPlayerContrada && (
          <span className="rounded-full border border-palio-400 bg-palio-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-palio-800">
            La tua contrada
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {group.entries.map((entry) => (
          <div
            key={`${group.contradaSlug}-${entry.rank}-${entry.name}`}
            className={`rounded-xl border px-3 py-3 ${
              entry.isCurrentPlayer
                ? 'border-palio-500 bg-palio-100/70'
                : 'border-amber-100 bg-[#fdf8f0]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xl">{renderRank(entry.rank)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-palio-900">{entry.name}</p>
                  <p className="text-xs text-gray-500">{entry.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-palio-800">
                  {entry.score}
                  <span className="ml-1 text-xs text-gray-500">{activeTab.unit}</span>
                </p>
              </div>
            </div>
            <EntryBadges entry={entry} />
          </div>
        ))}
      </div>
    </article>
  )
}

function TotalPointsSummary({ entry }: { entry: TotalLeaderboardEntry }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entry.games.map((game) => {
        const tab = GAME_TABS.find((item) => item.id === game.gameId)

        return (
          <span
            key={game.gameId}
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-palio-800"
            title={`#${game.rank} su ${game.totalPlayers} giocatori`}
          >
            {tab?.label ?? game.gameId}: {game.palioPoints}
          </span>
        )
      })}
    </div>
  )
}

function TotalContradaTable({ contrade }: { contrade: TotalContradaLeaderboardEntry[] }) {
  if (contrade.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-6 text-center text-sm text-palio-800">
        Nessuna contrada ha ancora giocatori registrati nelle classifiche.
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border-2 border-amber-300 shadow-lg">
      <table className="w-full">
        <thead style={{ background: 'linear-gradient(to right, #581210, #7a2e0a)' }}>
          <tr>
            <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">#</th>
            <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">Contrada</th>
            <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm">Giocatori</th>
            <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm">Punti</th>
          </tr>
        </thead>
        <tbody>
          {contrade.map((entry, index) => (
            <tr
              key={entry.contradaSlug}
              className="border-b border-amber-200"
              style={{ backgroundColor: index % 2 === 0 ? '#fdf8f0' : '#f5ead8' }}
            >
              <td className="py-3 px-3 font-bold text-palio-700 text-lg w-8">{renderRank(entry.rank)}</td>
              <td className="py-3 px-3 font-medium text-palio-900">{entry.contradaName}</td>
              <td className="py-3 px-3 text-right text-sm text-palio-800">{entry.totalPlayers}</td>
              <td className="py-3 px-3 text-right font-bold text-palio-800">{entry.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ClassificaPage() {
  const { Header, Footer } = usePalioGamesLayout()
  const [active, setActive] = useState<ActiveTabId>('melocotogno')
  const [leaderboard, setLeaderboard] = useState<GameLeaderboard>(EMPTY_LEADERBOARD)
  const [loading, setLoading] = useState(true)
  const trackedSession = useMemo(() => getGamePlayerSession(), [])
  const isTotalTab = active === 'totale'
  const activeGameId: GameId = isTotalTab ? 'melocotogno' : active

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getGameLeaderboard(activeGameId, trackedSession?.email)
      .then((data) => {
        if (!cancelled) {
          setLeaderboard(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeaderboard(EMPTY_LEADERBOARD)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeGameId, trackedSession?.email])

  const activeTab = GAME_TABS.find((tab) => tab.id === activeGameId)!
  const scores = leaderboard.global
  const totalScores = leaderboard.total.global
  const totalContrade = leaderboard.total.contrade
  const currentPlayer = leaderboard.currentPlayer
  const hasRegisteredSession = Boolean(trackedSession?.email)
  const currentPlayerContradaSlug = currentPlayer?.contradaSlug ?? trackedSession?.contradaSlug ?? null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#fdf8f0' }}>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-6">
          <p className="ornament mb-1">⚜ ⚔ ⚜</p>
          <h1 className="font-medieval text-3xl text-palio-800">Classifica</h1>
          <p className="text-gray-500 text-sm mt-1">Generale, per contrada e posizione personale in ogni gioco</p>
        </div>

        <div className="grid grid-cols-2 gap-1 mb-6 rounded-xl p-1 sm:grid-cols-5" style={{ backgroundColor: '#f0d890' }}>
          {NAVIGATION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`rounded-lg py-2 px-1 text-xs font-bold transition-all duration-200 leading-tight ${
                active === tab.id
                  ? 'bg-palio-700 text-white shadow-md'
                  : 'text-palio-700 hover:bg-amber-200'
              }`}
            >
              <div className="text-base mb-0.5">{tab.icon}</div>
              <div>{tab.label}</div>
            </button>
          ))}
        </div>

        {!loading && !hasRegisteredSession && (
          <section className="mb-6 rounded-2xl border border-palio-300 bg-gradient-to-r from-palio-50 to-amber-50 p-5 shadow-sm">
            <p className="font-medieval text-xl text-palio-900">Vuoi vedere come stai nella tua contrada?</p>
            <p className="mt-2 text-sm text-palio-800">
              Registrati al profilo giochi per confrontarti anche con i giocatori della tua contrada e sbloccare i badge classifica.
            </p>
            <Link to="/giochi/profilo" className="btn-game inline-block mt-4">
              Registrati o accedi
            </Link>
          </section>
        )}

        {!loading && !isTotalTab && hasRegisteredSession && currentPlayer && (
          <section className="mb-6 rounded-2xl border border-palio-400 bg-gradient-to-br from-[#fff4d9] to-[#f7ead1] p-5 shadow-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-palio-700 font-bold">La tua posizione</p>
                <h2 className="font-medieval text-2xl text-palio-900 mt-1">{currentPlayer.name}</h2>
                <p className="text-sm text-palio-800 mt-1">
                  {currentPlayer.contradaName
                    ? `Contrada ${currentPlayer.contradaName}`
                    : 'Contrada non impostata'}
                </p>
              </div>
              <EntryBadges entry={{ badges: currentPlayer.badges }} />
            </div>

            {currentPlayer.score === null ? (
              <p className="mt-4 text-sm text-palio-800">
                Sei registrato ma non hai ancora un punteggio in questo gioco. Gioca una partita per comparire sia nella classifica generale sia in quella della tua contrada.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/75 p-4 border border-amber-200">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Punteggio</p>
                  <p className="mt-1 font-medieval text-2xl text-palio-900">
                    {currentPlayer.score} <span className="text-sm">{activeTab.unit}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/75 p-4 border border-amber-200">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Classifica generale</p>
                  <p className="mt-1 font-medieval text-2xl text-palio-900">
                    {currentPlayer.globalRank ? `#${currentPlayer.globalRank}` : 'N/D'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">su {currentPlayer.totalPlayers} giocatori</p>
                </div>
                <div className="rounded-xl bg-white/75 p-4 border border-amber-200">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 font-bold">Nella tua contrada</p>
                  <p className="mt-1 font-medieval text-2xl text-palio-900">
                    {currentPlayer.contradaRank ? `#${currentPlayer.contradaRank}` : 'N/D'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">su {currentPlayer.contradaPlayers} giocatori</p>
                </div>
              </div>
            )}
          </section>
        )}

        {!loading && hasRegisteredSession && !currentPlayer && (
          <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <p className="font-medieval text-xl text-palio-900">Profilo giochi non trovato</p>
            <p className="mt-2 text-sm text-palio-800">
              La sessione salvata non risulta piu valida. Rientra dal profilo per vedere anche la tua posizione nella classifica di contrada.
            </p>
            <Link to="/giochi/profilo" className="btn-game inline-block mt-4">
              Vai al profilo
            </Link>
          </section>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Caricamento classifica...</p>
          </div>
        )}

        {!loading && (isTotalTab ? totalScores.length === 0 : scores.length === 0) && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-medieval text-palio-800 text-lg mb-1">Nessun punteggio</p>
            <p className="text-gray-500 text-sm">Sii il primo a giocare!</p>
            {!isTotalTab && (
              <Link to={`/giochi/${activeGameId}`} className="btn-game inline-block mt-6">
                Gioca ora
              </Link>
            )}
          </div>
        )}

        {!loading && (isTotalTab ? totalScores.length > 0 : scores.length > 0) && (
          <>
            {isTotalTab && (
              <>
                <section className="mb-8">
                  <div className="mb-4">
                    <h2 className="font-medieval text-2xl text-palio-900">Classifica totale del Palio</h2>
                    <p className="text-sm text-gray-500">
                      In ogni gioco il primo prende tanti punti quanti sono i giocatori classificati, l'ultimo prende 1 punto.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden border-2 border-amber-300 shadow-lg">
                    <table className="w-full">
                      <thead style={{ background: 'linear-gradient(to right, #581210, #7a2e0a)' }}>
                        <tr>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">#</th>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">Nome</th>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm hidden md:table-cell">Contrada</th>
                          <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm hidden sm:table-cell">Giochi</th>
                          <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm">Punti</th>
                        </tr>
                      </thead>
                      <tbody>
                        {totalScores.map((entry, index) => (
                          <tr
                            key={`${entry.rank}-${entry.name}-${entry.totalPoints}`}
                            className="border-b border-amber-200"
                            style={{
                              backgroundColor: entry.isCurrentPlayer
                                ? '#f8e7b0'
                                : index % 2 === 0
                                  ? '#fdf8f0'
                                  : '#f5ead8',
                            }}
                          >
                            <td className="py-3 px-3 font-bold text-palio-700 text-lg w-8">
                              {renderRank(entry.rank)}
                            </td>
                            <td className="py-3 px-3 text-palio-900">
                              <div className="font-medium">{entry.name}</div>
                              <TotalPointsSummary entry={entry} />
                            </td>
                            <td className="py-3 px-3 text-sm text-palio-800 hidden md:table-cell">
                              {entry.contradaName ?? 'Ospite'}
                            </td>
                            <td className="py-3 px-3 text-right text-sm text-palio-800 hidden sm:table-cell">
                              {entry.gamesPlayed}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-palio-800">
                              {entry.totalPoints}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mb-8">
                  <div className="mb-4">
                    <h2 className="font-medieval text-2xl text-palio-900">Classifica totale contrade</h2>
                    <p className="text-sm text-gray-500">Somma dei punti dei giocatori associati a ogni contrada.</p>
                  </div>
                  <TotalContradaTable contrade={totalContrade} />
                </section>
              </>
            )}

            {!isTotalTab && (
              <>
                <section className="mb-8">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-medieval text-2xl text-palio-900">Classifica generale</h2>
                      <p className="text-sm text-gray-500">Miglior punteggio personale per ogni giocatore</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-center gap-3 mb-6">
                    {scores[1] && (
                      <div className="flex flex-col items-center">
                        <div className="text-2xl mb-1">🥈</div>
                        <div
                          className="rounded-t-lg flex items-end justify-center pb-2"
                          style={{ width: 72, height: 64, background: 'linear-gradient(to bottom, #b0b0b0, #808080)' }}
                        >
                          <span className="text-white font-bold text-xs text-center px-1 leading-tight">
                            {scores[1].name}
                          </span>
                        </div>
                        <div className="bg-gray-400 text-white text-xs font-bold px-2 py-0.5 rounded-b w-full text-center">
                          {scores[1].score} {activeTab.unit}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-1">🥇</div>
                      <div
                        className="rounded-t-lg flex items-end justify-center pb-2"
                        style={{ width: 80, height: 80, background: 'linear-gradient(to bottom, #d4a800, #a07800)' }}
                      >
                        <span className="text-white font-bold text-xs text-center px-1 leading-tight">
                          {scores[0].name}
                        </span>
                      </div>
                      <div
                        className="text-white text-xs font-bold px-2 py-0.5 rounded-b w-full text-center"
                        style={{ backgroundColor: '#a07800' }}
                      >
                        {scores[0].score} {activeTab.unit}
                      </div>
                    </div>
                    {scores[2] && (
                      <div className="flex flex-col items-center">
                        <div className="text-2xl mb-1">🥉</div>
                        <div
                          className="rounded-t-lg flex items-end justify-center pb-2"
                          style={{ width: 72, height: 52, background: 'linear-gradient(to bottom, #cd7f32, #8B4513)' }}
                        >
                          <span className="text-white font-bold text-xs text-center px-1 leading-tight">
                            {scores[2].name}
                          </span>
                        </div>
                        <div className="bg-amber-700 text-white text-xs font-bold px-2 py-0.5 rounded-b w-full text-center">
                          {scores[2].score} {activeTab.unit}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl overflow-hidden border-2 border-amber-300 shadow-lg">
                    <table className="w-full">
                      <thead style={{ background: 'linear-gradient(to right, #581210, #7a2e0a)' }}>
                        <tr>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">#</th>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm">Nome</th>
                          <th className="py-3 px-3 text-left text-amber-300 font-medieval text-sm hidden md:table-cell">Contrada</th>
                          <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm">Punteggio</th>
                          <th className="py-3 px-3 text-right text-amber-300 font-medieval text-sm hidden sm:table-cell">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((entry, index) => (
                          <tr
                            key={`${entry.rank}-${entry.name}-${entry.score}`}
                            className="border-b border-amber-200"
                            style={{
                              backgroundColor: entry.isCurrentPlayer
                                ? '#f8e7b0'
                                : index % 2 === 0
                                  ? '#fdf8f0'
                                  : '#f5ead8',
                            }}
                          >
                            <td className="py-3 px-3 font-bold text-palio-700 text-lg w-8">
                              {renderRank(entry.rank)}
                            </td>
                            <td className="py-3 px-3 text-palio-900">
                              <div className="font-medium">{entry.name}</div>
                              <EntryBadges entry={entry} />
                            </td>
                            <td className="py-3 px-3 text-sm text-palio-800 hidden md:table-cell">
                              {entry.contradaName ?? 'Ospite'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-palio-800">
                              {entry.score}
                              <span className="text-xs text-gray-500 ml-1">{activeTab.unit}</span>
                            </td>
                            <td className="py-3 px-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                              {entry.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mb-8">
                  <div className="mb-4">
                    <h2 className="font-medieval text-2xl text-palio-900">Sottoclassifica per contrada</h2>
                    <p className="text-sm text-gray-500">Ogni contrada mostra i suoi migliori giocatori nel gioco selezionato</p>
                  </div>

                  {leaderboard.contrade.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-6 text-center text-sm text-palio-800">
                      Nessun giocatore registrato con contrada ha ancora salvato un punteggio in questo gioco.
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {leaderboard.contrade.map((group) => (
                        <ContradaCard
                          key={group.contradaSlug}
                          group={group}
                          activeTab={activeTab}
                          isCurrentPlayerContrada={group.contradaSlug === currentPlayerContradaSlug}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        <div className="flex flex-col gap-3 mt-8">
          {!isTotalTab && (
            <Link to={`/giochi/${activeGameId}`} className="btn-game text-center block">
              ▶ Gioca {activeTab.label}
            </Link>
          )}
          <Link
            to="/giochi/profilo"
            className="text-center text-palio-700 font-semibold py-3 px-6 rounded-xl border-2 border-palio-300 hover:bg-palio-50 transition-colors"
          >
            🛡 Vai al profilo
          </Link>
          <Link
            to="/giochi"
            className="text-center text-palio-700 font-semibold py-3 px-6 rounded-xl border-2 border-palio-300 hover:bg-palio-50 transition-colors"
          >
            ← Tutti i giochi
          </Link>
        </div>

        <p className="text-center text-amber-800/50 text-xs mt-8 font-medieval tracking-wide">
          ⚜ Classifica generale e di contrada aggiornata sui migliori punteggi personali ⚜
        </p>
      </main>
      <Footer />
    </div>
  )
}
