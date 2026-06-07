import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePalioGamesLayout } from '../PalioGamesProvider'

interface GamePlayShellProps {
  children: ReactNode
  hero: ReactNode
  isPlaying: boolean
  minHeight?: number
}

export default function GamePlayShell({
  children,
  hero,
  isPlaying,
  minHeight = 420,
}: GamePlayShellProps) {
  const navigate = useNavigate()
  const { Header, Footer } = usePalioGamesLayout()

  function handleBack() {
    if (window.history.state?.idx > 0) {
      navigate(-1)
      return
    }

    navigate('/giochi')
  }

  return (
    <div className={isPlaying ? 'fixed inset-0 z-50 flex flex-col bg-palio-950' : 'min-h-screen flex flex-col bg-amber-50'}>
      {!isPlaying && <Header />}

      <main className="flex-1 flex flex-col">
        {!isPlaying && hero}

        {isPlaying && (
          <div className="game-play-topbar">
            <button type="button" onClick={handleBack} className="game-exit-button" aria-label="Torna indietro">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Torna indietro</span>
            </button>
          </div>
        )}

        <div
          className={isPlaying ? 'game-play-stage game-play-stage-active' : 'game-play-stage'}
          style={{ minHeight: isPlaying ? undefined : minHeight }}
        >
          <div
            className={isPlaying ? 'game-play-frame game-play-frame-active' : 'game-play-frame'}
            style={{ height: isPlaying ? undefined : minHeight, minHeight: isPlaying ? undefined : minHeight }}
          >
            {children}
          </div>
        </div>
      </main>

      {!isPlaying && <Footer />}
    </div>
  )
}
