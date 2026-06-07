import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GamePlayShell from '../../components/GamePlayShell'
import GameScoreSubmissionPanel from '../../components/GameScoreSubmissionPanel'

type GamePhase = 'idle' | 'playing' | 'gameover'

interface GameState {
  phase: GamePhase
  velocity: number      // pixel/s
  distance: number      // totale pixel percorsi
  meters: number        // distanza in metri (distance / METER_SCALE)
  bgOffset: number
  wheelAngle: number
  bounceY: number
  bouncePhase: number
  timeLeft: number
  tapFeedbackTime: number
}

const GAME_DURATION = 30
const METER_SCALE = 120    // pixel per metro
const MAX_VELOCITY = 800
const FRICTION = 0.93       // decadimento per frame
const TAP_IMPULSE = 90

const FLAG_COLORS = [
  '#e63946', '#1d3557', '#2a9d8f', '#e9c46a', '#6a4c93', '#f4a261',
]

function makeInitialState(): GameState {
  return {
    phase: 'idle',
    velocity: 0,
    distance: 0,
    meters: 0,
    bgOffset: 0,
    wheelAngle: 0,
    bounceY: 0,
    bouncePhase: 0,
    timeLeft: GAME_DURATION,
    tapFeedbackTime: 0,
  }
}

export default function CarriolaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(makeInitialState())
  const rafRef = useRef(0)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [finalScore, setFinalScore] = useState(0)
  const navigate = useNavigate()

  function syncCanvasLayout(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const nextWidth = Math.max(1, Math.round(rect.width))
    const nextHeight = Math.max(1, Math.round(rect.height))

    if (canvas.width !== nextWidth) {
      canvas.width = nextWidth
    }
    if (canvas.height !== nextHeight) {
      canvas.height = nextHeight
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const resize = () => syncCanvasLayout(canvas)
    const resizeObserver = new ResizeObserver(resize)

    window.addEventListener('resize', resize)
    resizeObserver.observe(canvas)
    resize()

    // --- DRAW HELPERS ---

    function drawBackground(c: CanvasRenderingContext2D, w: number, h: number, bgOffset: number) {
      const sky = c.createLinearGradient(0, 0, 0, h * 0.45)
      sky.addColorStop(0, '#2a6aad')
      sky.addColorStop(0.45, '#5b9bd5')
      sky.addColorStop(1, '#c8e8f8')
      c.fillStyle = sky
      c.fillRect(0, 0, w, h * 0.45)

      function drawCloud(cx: number, cy: number, r: number) {
        c.globalAlpha = 0.8; c.fillStyle = '#fff'
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx + r * 1.2, cy + r * 0.1, r * 0.72, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx - r * 0.85, cy + r * 0.08, r * 0.62, 0, Math.PI * 2); c.fill()
        c.globalAlpha = 1
      }
      drawCloud(w * 0.08, h * 0.08, h * 0.03)
      drawCloud(w * 0.7, h * 0.06, h * 0.024)
      drawCloud(w * 0.42, h * 0.04, h * 0.018)

      // Castello sfondo (statico)
      c.fillStyle = '#c8b090'
      c.fillRect(w * 0.1, h * 0.05, w * 0.8, h * 0.35)
      c.fillStyle = '#b09070'
      for (let i = 0; i < 12; i++) {
        if (i % 2 === 0) c.fillRect(w * 0.1 + i * (w * 0.8 / 12), h * 0.03, w * 0.8 / 14, h * 0.04)
      }
      c.fillStyle = '#4a3020'
      for (let i = 0; i < 5; i++) {
        const wx = w * 0.15 + i * w * 0.15
        c.beginPath()
        c.arc(wx, h * 0.2, w * 0.025, Math.PI, 0)
        c.fillRect(wx - w * 0.025, h * 0.2, w * 0.05, h * 0.1)
        c.fill()
      }

      // Terreno scorrevole
      const grd = c.createLinearGradient(0, h * 0.45, 0, h)
      grd.addColorStop(0, '#c8a86b')
      grd.addColorStop(1, '#a07848')
      c.fillStyle = grd
      c.fillRect(0, h * 0.45, w, h * 0.55)

      // Pavimento lastricato scorrevole
      c.strokeStyle = '#8B6914'
      c.lineWidth = 1
      c.globalAlpha = 0.25
      const tileW = 80
      const tileH = 35
      for (let row = 0; row < 8; row++) {
        const y = h * 0.45 + row * tileH
        const off = (bgOffset + (row % 2) * (tileW / 2)) % tileW
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke()
        for (let col = -1; col < Math.ceil(w / tileW) + 1; col++) {
          const x = col * tileW - off
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + tileH); c.stroke()
        }
      }
      c.globalAlpha = 1

      // Bandiere contrade sui lati (scorrevoli)
      FLAG_COLORS.forEach((color, i) => {
        const xBase = (i * 180 - bgOffset * 0.3) % (w + 200) - 100
        const flagY = h * 0.05 + (i % 2) * h * 0.1
        c.strokeStyle = '#5a3a1a'
        c.lineWidth = 3
        c.beginPath(); c.moveTo(xBase, flagY); c.lineTo(xBase, flagY + h * 0.25); c.stroke()
        c.fillStyle = color
        c.beginPath()
        c.moveTo(xBase, flagY)
        c.lineTo(xBase + 35, flagY + 12)
        c.lineTo(xBase, flagY + 24)
        c.closePath()
        c.fill()
        c.strokeStyle = 'rgba(255,255,255,0.7)'
        c.lineWidth = 2
        c.beginPath(); c.moveTo(xBase + 8, flagY + 4); c.lineTo(xBase + 8, flagY + 20); c.stroke()
        c.beginPath(); c.moveTo(xBase + 1, flagY + 12); c.lineTo(xBase + 28, flagY + 12); c.stroke()
      })
    }

    function drawWheeledbarrow(
      c: CanvasRenderingContext2D,
      w: number,
      h: number,
      wheelAngle: number,
      bounceY: number,
      velocity: number
    ) {
      const x = w * 0.22
      // Corsia fissa al centro
      const y = h * 0.60 + bounceY
      const scale = Math.min(h * 0.00135, w * 0.00185)

      c.save()
      c.translate(x, y)
      c.scale(-scale, scale)

      // Ruota
      const wheelX = -40
      const wheelY = 30
      c.save()
      c.translate(wheelX, wheelY)
      c.rotate(wheelAngle)
      c.beginPath(); c.arc(0, 0, 28, 0, Math.PI * 2)
      c.strokeStyle = '#3d1a09'
      c.lineWidth = 5
      c.fillStyle = '#6b3a1a'
      c.fill(); c.stroke()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        c.beginPath()
        c.moveTo(0, 0); c.lineTo(Math.cos(a) * 25, Math.sin(a) * 25)
        c.strokeStyle = '#3d1a09'; c.lineWidth = 3; c.stroke()
      }
      c.restore()

      // Vasca
      c.fillStyle = '#8B5E3C'
      c.beginPath()
      c.moveTo(-50, -10); c.lineTo(30, -30); c.lineTo(40, 10); c.lineTo(-45, 20)
      c.closePath(); c.fill()
      c.strokeStyle = '#3d1a09'; c.lineWidth = 3; c.stroke()

      // Manici
      c.strokeStyle = '#3d1a09'; c.lineWidth = 6; c.lineCap = 'round'
      c.beginPath(); c.moveTo(30, -25); c.lineTo(90, -35); c.stroke()
      c.beginPath(); c.moveTo(40, 10); c.lineTo(90, 5); c.stroke()

      // Personaggio
      const runPhase = Date.now() * 0.008
      const legOffset = Math.sin(runPhase) * (velocity > 50 ? 18 : 5)
      c.fillStyle = '#c8a060'
      c.beginPath(); c.roundRect(65, -70, 22, 35, 5); c.fill()
      c.fillStyle = '#f4c488'
      c.beginPath(); c.arc(76, -80, 16, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#c8a060'; c.lineWidth = 8; c.lineCap = 'round'
      c.beginPath(); c.moveTo(76, -60); c.lineTo(90, -38); c.stroke()
      c.beginPath(); c.moveTo(76, -60); c.lineTo(90, -32); c.stroke()
      c.strokeStyle = '#6b3a1a'
      c.beginPath(); c.moveTo(72, -35); c.lineTo(62 + legOffset, -5); c.stroke()
      c.beginPath(); c.moveTo(80, -35); c.lineTo(90 - legOffset, -5); c.stroke()

      c.restore()
    }

    function drawHUD(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const pad = 12

      // Metri
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(pad, pad, 160, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(pad, pad, 160, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'left'
      c.fillText('Metri percorsi', pad + 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(`${Math.floor(s.meters)} m`, pad + 10, pad + 48)

      // Timer
      const urgent = s.timeLeft <= 5
      c.fillStyle = urgent ? 'rgba(180,30,20,0.95)' : 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(w - 115 - pad, pad, 115, 52, 10); c.fill()
      c.strokeStyle = urgent ? '#ff9090' : '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(w - 115 - pad, pad, 115, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'right'
      c.fillText('Tempo', w - pad - 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(`${Math.ceil(s.timeLeft)}s`, w - pad - 10, pad + 48)

      // Barra velocità
      const velRatio = Math.min(s.velocity / MAX_VELOCITY, 1)
      const barW = w * 0.34
      const barH = 14
      const barX = w / 2 - barW / 2
      const barY = pad + 19
      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.beginPath(); c.roundRect(barX, barY, barW, barH, barH / 2); c.fill()
      if (velRatio > 0) {
        const velGrad = c.createLinearGradient(barX, 0, barX + barW, 0)
        velGrad.addColorStop(0, '#2a9d8f')
        velGrad.addColorStop(0.6, '#e9c46a')
        velGrad.addColorStop(1, '#e63946')
        c.fillStyle = velGrad
        c.beginPath(); c.roundRect(barX, barY, barW * velRatio, barH, barH / 2); c.fill()
      }
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.02}px Cinzel, serif`
      c.textAlign = 'center'
      c.fillText('⚡ Velocità', w / 2, barY - 3)

      // Suggerimento iniziale
      if (s.timeLeft > 25) {
        c.fillStyle = 'rgba(0,0,0,0.35)'
        c.beginPath(); c.roundRect(w / 2 - 145, h - 58, 290, 50, 8); c.fill()
        c.font = `bold ${h * 0.022}px Inter, sans-serif`
        c.fillStyle = '#ffdd88'; c.textAlign = 'center'
        c.fillText('👆 TAPPA più volte e con più dita!', w / 2, h - 36)
        c.fillStyle = '#aaddff'
        c.fillText('Più tap = più velocità', w / 2, h - 16)
      }
    }

    // --- UPDATE ---
    function update(dt: number) {
      const s = stateRef.current
      if (s.phase !== 'playing') return

      s.timeLeft -= dt
      if (s.timeLeft <= 0) {
        s.timeLeft = 0
        s.phase = 'gameover'
        setFinalScore(Math.floor(s.meters))
        setPhase('gameover')
        return
      }

      // Attrito
      s.velocity *= Math.pow(FRICTION, dt * 60)
      if (s.velocity < 0) s.velocity = 0

      // Distanza
      const moved = s.velocity * dt
      s.distance += moved
      s.meters = s.distance / METER_SCALE
      s.bgOffset += moved * 0.6

      // Wheel rotation
      s.wheelAngle += (s.velocity / 80) * dt

      // Bounce
      s.bouncePhase += s.velocity * 0.004 * dt * 60
      s.bounceY = Math.sin(s.bouncePhase) * (s.velocity / MAX_VELOCITY) * 6

      // Tap feedback
      if (s.tapFeedbackTime > 0) s.tapFeedbackTime -= dt
    }

    // --- DRAW ---
    function draw() {
      const s = stateRef.current
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawBackground(ctx, w, h, s.bgOffset)
      drawWheeledbarrow(ctx, w, h, s.wheelAngle, s.bounceY, s.velocity)
      if (s.phase === 'playing') drawHUD(ctx, s, w, h)
    }

    let lastTs = 0
    function loop(ts: number) {
      const dt = Math.min((ts - lastTs) / 1000, 0.05)
      lastTs = ts
      update(dt)
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // Ogni tap (ovunque) accelera la carriola; più dita simultanee = più impulso
    function handleTouchStart(e: TouchEvent) {
      e.preventDefault()
      if (stateRef.current.phase !== 'playing') return
      const s = stateRef.current
      for (let i = 0; i < e.changedTouches.length; i++) {
        s.velocity = Math.min(s.velocity + TAP_IMPULSE, MAX_VELOCITY)
      }
      s.tapFeedbackTime = 0.15
    }

    function handleMouseDown(_e: MouseEvent) {
      if (stateRef.current.phase !== 'playing') return
      const s = stateRef.current
      s.velocity = Math.min(s.velocity + TAP_IMPULSE, MAX_VELOCITY)
      s.tapFeedbackTime = 0.15
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('mousedown', handleMouseDown)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      resizeObserver.disconnect()
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  function startGame() {
    const s = stateRef.current
    Object.assign(s, makeInitialState())
    s.phase = 'playing'
    setPhase('playing')
    setFinalScore(0)
  }

  const isPlaying = phase === 'playing'
  const hero = (
    <div className="giochi-hero py-5 px-4 text-center">
      <Link to="/giochi" className="text-amber-300 text-sm hover:text-amber-200">
        ← Tutti i giochi
      </Link>
      <h1 className="font-medieval text-2xl text-amber-100 mt-1">
        Corsa con la Carriola
      </h1>
      <p className="text-amber-300/80 text-xs mt-1">
        Tappa più volte e con più dita • 30 secondi
      </p>
    </div>
  )

  return (
    <GamePlayShell isPlaying={isPlaying} hero={hero} minHeight={420}>
      <canvas ref={canvasRef} className="game-canvas" />

          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-6 p-6">
              <h2 className="font-medieval text-2xl text-amber-300 text-center">
                Pronto a correre?
              </h2>
              <div className="bg-palio-900/80 rounded-xl p-4 max-w-xs text-center text-sm text-amber-100 space-y-1">
                <p>👆 <strong className="text-amber-300">Tocca lo schermo</strong> per spingere la carriola</p>
                <p>🖐 <strong className="text-amber-300">Più dita insieme</strong> = più velocità!</p>
                <p>🏃 Tappa veloce e spesso per andare più lontano</p>
                <p>⏱ Hai <strong className="text-amber-300">30 secondi!</strong></p>
              </div>
              <button onClick={startGame} className="btn-game">Parti!</button>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="absolute inset-0 overflow-y-auto bg-black/65">
              <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
                <p className="font-medieval text-xl text-amber-300">Gara finita!</p>
                <p className="text-white text-3xl font-bold">
                  {finalScore} <span className="text-amber-300 text-lg">metri</span>
                </p>
                <GameScoreSubmissionPanel
                  gameId="carriola"
                  score={finalScore}
                  onPlayAgain={startGame}
                  onViewLeaderboard={() => navigate('/giochi/classifica')}
                />
              </div>
            </div>
          )}
    </GamePlayShell>
  )
}
