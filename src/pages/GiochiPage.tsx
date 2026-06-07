import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { usePalioGamesLayout } from '../PalioGamesProvider'

// SVG Illustrations

function MelocotognoIllustration() {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Albero */}
      <rect x="52" y="75" width="16" height="35" rx="4" fill="#8B4513" />
      {/* Chioma */}
      <ellipse cx="60" cy="55" rx="38" ry="40" fill="#3a7d44" />
      <ellipse cx="60" cy="50" rx="32" ry="34" fill="#4a9e58" />
      {/* Contenitore alto (10 pt) */}
      <rect x="46" y="22" width="28" height="12" rx="3" fill="#c8a015" stroke="#8B4513" strokeWidth="1.5" />
      <text x="60" y="31" textAnchor="middle" fontSize="7" fill="#3d1a09" fontWeight="bold">10</text>
      {/* Contenitore medio (5 pt) */}
      <rect x="40" y="44" width="40" height="12" rx="3" fill="#c8a015" stroke="#8B4513" strokeWidth="1.5" />
      <text x="60" y="53" textAnchor="middle" fontSize="7" fill="#3d1a09" fontWeight="bold">5</text>
      {/* Contenitore basso (2 pt) */}
      <rect x="34" y="66" width="52" height="12" rx="3" fill="#c8a015" stroke="#8B4513" strokeWidth="1.5" />
      <text x="60" y="75" textAnchor="middle" fontSize="7" fill="#3d1a09" fontWeight="bold">2</text>
      {/* Fettucce */}
      <path d="M15 100 Q30 70 46 55" stroke="#e63946" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M100 95 Q85 65 74 50" stroke="#1d3557" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M20 105 Q40 80 50 63" stroke="#f4a261" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function CarriolaIllustration() {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Terreno */}
      <rect x="0" y="95" width="120" height="25" fill="#8B7355" />
      <rect x="0" y="93" width="120" height="4" fill="#A0845C" />
      {/* Ruota */}
      <circle cx="35" cy="85" r="18" fill="none" stroke="#5a3a1a" strokeWidth="4" />
      <circle cx="35" cy="85" r="3" fill="#5a3a1a" />
      <line x1="35" y1="67" x2="35" y2="103" stroke="#5a3a1a" strokeWidth="2" />
      <line x1="17" y1="85" x2="53" y2="85" stroke="#5a3a1a" strokeWidth="2" />
      {/* Vasca carriola */}
      <path d="M35 78 L80 65 L88 80 L38 88 Z" fill="#8B6914" stroke="#5a3a1a" strokeWidth="1.5" />
      {/* Manici */}
      <line x1="80" y1="65" x2="110" y2="70" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="80" x2="115" y2="83" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      {/* Persona */}
      <circle cx="100" cy="52" r="10" fill="#f4a261" stroke="#5a3a1a" strokeWidth="1.5" />
      <line x1="100" y1="62" x2="100" y2="78" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="66" x2="113" y2="72" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="78" x2="93" y2="93" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="78" x2="107" y2="93" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function CerchioIllustration() {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Terreno */}
      <rect x="0" y="95" width="120" height="25" fill="#8B7355" />
      <rect x="0" y="93" width="120" height="4" fill="#A0845C" />
      {/* Cerchio */}
      <circle cx="65" cy="72" r="30" fill="none" stroke="#5a3a1a" strokeWidth="5" />
      <circle cx="65" cy="72" r="25" fill="none" stroke="#8B6914" strokeWidth="2" opacity="0.5" />
      {/* Bastone */}
      <line x1="45" y1="100" x2="72" y2="68" stroke="#5a3a1a" strokeWidth="4" strokeLinecap="round" />
      {/* Persona */}
      <circle cx="30" cy="60" r="10" fill="#f4a261" stroke="#5a3a1a" strokeWidth="1.5" />
      <line x1="30" y1="70" x2="30" y2="86" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="76" x2="18" y2="82" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="76" x2="46" y2="98" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="86" x2="22" y2="95" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="86" x2="38" y2="95" stroke="#5a3a1a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function TorreIllustration() {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Base */}
      <rect x="25" y="95" width="70" height="14" rx="2" fill="#8B7355" stroke="#5a3a1a" strokeWidth="1.5" />
      {/* Blocco 1 */}
      <rect x="28" y="80" width="64" height="16" rx="2" fill="#a08060" stroke="#5a3a1a" strokeWidth="1.5" />
      <line x1="44" y1="80" x2="44" y2="96" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      <line x1="60" y1="80" x2="60" y2="96" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      <line x1="76" y1="80" x2="76" y2="96" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      {/* Blocco 2 */}
      <rect x="30" y="65" width="60" height="16" rx="2" fill="#b89060" stroke="#5a3a1a" strokeWidth="1.5" />
      <line x1="50" y1="65" x2="50" y2="81" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      <line x1="70" y1="65" x2="70" y2="81" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      {/* Blocco 3 */}
      <rect x="33" y="50" width="54" height="16" rx="2" fill="#c8a870" stroke="#5a3a1a" strokeWidth="1.5" />
      <line x1="55" y1="50" x2="55" y2="66" stroke="#5a3a1a" strokeWidth="0.5" opacity="0.4" />
      {/* Blocco 4 */}
      <rect x="36" y="35" width="48" height="16" rx="2" fill="#d4b880" stroke="#5a3a1a" strokeWidth="1.5" />
      {/* Merlature */}
      <rect x="36" y="18" width="10" height="18" rx="1" fill="#d4b880" stroke="#5a3a1a" strokeWidth="1.5" />
      <rect x="50" y="18" width="10" height="18" rx="1" fill="#d4b880" stroke="#5a3a1a" strokeWidth="1.5" />
      <rect x="64" y="18" width="10" height="18" rx="1" fill="#d4b880" stroke="#5a3a1a" strokeWidth="1.5" />
      <rect x="74" y="18" width="10" height="18" rx="1" fill="#d4b880" stroke="#5a3a1a" strokeWidth="1.5" />
      {/* Finestra */}
      <rect x="54" y="54" width="12" height="8" rx="6" fill="#3d1a09" />
      {/* Stella / ornamento in cima */}
      <polygon points="60,8 62,15 69,15 64,19 66,26 60,22 54,26 56,19 51,15 58,15" fill="#fee46e" />
    </svg>
  )
}

const GAMES = [
  {
    id: 'melocotogno',
    title: 'Gioco del Melocotogno',
    desc: 'Lancia le fettucce verso l\'albero! Colpisci i contenitori per fare più punti in 15 secondi.',
    path: '/giochi/melocotogno',
    illustration: <MelocotognoIllustration />,
  },
  {
    id: 'carriola',
    title: 'Corsa con la Carriola',
    desc: 'Spingi la carriola più veloce che puoi! Tocca per accelerare ed evita gli ostacoli.',
    path: '/giochi/carriola',
    illustration: <CarriolaIllustration />,
  },
  {
    id: 'cerchio',
    title: 'Corsa con il Cerchio',
    desc: 'Tieni il cerchio in equilibrio mentre rotola avanti! Tocca a sinistra o destra per raddrizzarlo.',
    path: '/giochi/cerchio',
    illustration: <CerchioIllustration />,
  },
  {
    id: 'torre',
    title: 'Torre del Bramante',
    desc: 'Impila i blocchi con precisione per costruire la torre più alta possibile!',
    path: '/giochi/torre',
    illustration: <TorreIllustration />,
  },
]

export default function GiochiPage() {
  const { Header, Footer } = usePalioGamesLayout()

  return (
    <div className="min-h-screen flex flex-col bg-[#fdf8f0] text-palio-950 dark:bg-palio-950 dark:text-amber-50">
      <Header />
      <main className="flex-1">
        {/* Hero banner medievale */}
        <section className="giochi-hero text-center py-12 px-4">
          <p className="ornament mb-1">⚜ ⚔ ⚜</p>
          <h1 className="font-medieval text-3xl md:text-5xl text-amber-300 mt-2 mb-4 leading-tight">
            Giochi del Palio
          </h1>
          <p className="text-amber-100 text-base md:text-lg max-w-md mx-auto mb-8 leading-relaxed">
            Metti alla prova le tue abilità nei giochi del Palio!<br />
            Sfida i tuoi amici e prova a entrare nella classifica.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/giochi/classifica"
              className="inline-flex items-center gap-2 btn-game animate-glow-pulse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
            >
              <Trophy size={20} />
              Classifica
            </Link>
            <Link
              to="/giochi/profilo"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-palio-800/70 px-5 py-3 font-medieval text-amber-100 transition-colors hover:bg-palio-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 dark:border-amber-200 dark:bg-palio-900 dark:text-amber-50 dark:hover:bg-palio-800"
            >
              🛡 Profilo
            </Link>
          </div>
        </section>

        {/* Divisore ornamentale */}
        <div className="bg-[#fdf8f0] py-3 text-center dark:bg-palio-950">
          <span className="ornament text-2xl">— ✦ ✦ ✦ —</span>
        </div>

        {/* 4 game cards */}
        <section className="bg-[#fdf8f0] px-4 py-8 dark:bg-palio-950">
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
            {GAMES.map((game) => (
              <div key={game.id} className="game-card border border-amber-200 bg-white/90 text-palio-950 shadow-md dark:border-amber-700/50 dark:bg-palio-900/90 dark:text-amber-50">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  {/* Cornice ornamentale per illustrazione */}
                  <div
                    className="flex h-32 w-32 animate-float items-center justify-center rounded-full dark:shadow-amber-950"
                    style={{
                      background: 'radial-gradient(circle, #fff8e8 60%, #f0d890 100%)',
                      border: '3px solid #d4a017',
                      boxShadow: '0 0 0 4px #fdf8f0, 0 0 0 6px #d4a017aa',
                    }}
                  >
                    <div className="w-24 h-24">{game.illustration}</div>
                  </div>

                  <h2 className="font-medieval text-xl leading-tight text-palio-800 dark:text-amber-100">
                    {game.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-palio-700 dark:text-amber-100/80">{game.desc}</p>
                  <Link
                    to={game.path}
                    className="btn-game w-full text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palio-700 dark:focus-visible:outline-amber-300"
                  >
                    ▶ Gioca
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer cards */}
          <p className="mt-8 text-center font-medieval text-xs tracking-wide text-amber-800/70 dark:text-amber-100/70">
            ⚜ Palio di Vigevano ⚜
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
