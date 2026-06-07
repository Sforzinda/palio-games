import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GamePlayShell from '../../components/GamePlayShell'
import GameScoreSubmissionPanel from '../../components/GameScoreSubmissionPanel'
import { createGameIntegrityTracker, type GameIntegrityResult } from '../../lib/game-anti-cheat'

type GamePhase = 'idle' | 'playing' | 'gameover'

interface Block {
  x: number   // centro x
  y: number   // top y
  w: number
  h: number
  color: string
}

interface FallingChunk {
  x: number
  y: number
  w: number
  h: number
  vy: number
  color: string
}

interface GameState {
  phase: GamePhase
  blocks: Block[]
  moving: { x: number; dir: number; speed: number; w: number; h: number; color: string }
  cameraY: number         // scroll offset (world Y)
  level: number
  score: number
  chunks: FallingChunk[]  // pezzi che cadono
  perfectFlash: number    // timer per flash verde
  lastPerfect: boolean
  bgStarPhase: number
}

// Palette colori pietre medievali
const BLOCK_COLORS = [
  '#c8b088', '#b89870', '#a88858', '#d4c0a0', '#c0a880',
  '#b8a068', '#d8c8a8', '#a09068', '#bc9c74',
]

const BLOCK_H = 28
const BASE_SPEED = 90
const SPEED_INC = 12   // +px/s per livello
const PERFECT_THRESHOLD = 6  // pixel di tolleranza per "perfetto"

function getBlockColor(level: number): string {
  return BLOCK_COLORS[level % BLOCK_COLORS.length]
}

function playPerfectSound() {
  try {
    const actx = new AudioContext()
    const osc = actx.createOscillator()
    const gain = actx.createGain()
    osc.connect(gain)
    gain.connect(actx.destination)
    osc.frequency.setValueAtTime(523, actx.currentTime)        // Do5
    osc.frequency.setValueAtTime(659, actx.currentTime + 0.12) // Mi5
    osc.frequency.setValueAtTime(784, actx.currentTime + 0.24) // Sol5
    gain.gain.setValueAtTime(0.25, actx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.5)
    osc.start()
    osc.stop(actx.currentTime + 0.5)
  } catch {
    // Web Audio non disponibile
  }
}

function makeInitialState(canvasW: number, canvasH: number): GameState {
  const blockW = canvasW * 0.55
  const baseY = canvasH * 0.82
  const baseBlock: Block = {
    x: canvasW / 2,
    y: baseY,
    w: blockW,
    h: BLOCK_H,
    color: BLOCK_COLORS[0],
  }
  return {
    phase: 'idle',
    blocks: [baseBlock],
    moving: {
      x: canvasW / 2,
      dir: 1,
      speed: BASE_SPEED,
      w: blockW,
      h: BLOCK_H,
      color: getBlockColor(1),
    },
    cameraY: 0,
    level: 1,
    score: 0,
    chunks: [],
    perfectFlash: 0,
    lastPerfect: false,
    bgStarPhase: 0,
  }
}

export default function TorreGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState | null>(null)
  const integrityRef = useRef(createGameIntegrityTracker({
    maxAcceptedInputsPerSecond: 16,
    maxIdenticalPositionStreak: 120,
    maxScore: 400,
    minDurationMs: 300,
    minTrustedInputs: 1,
  }))
  const rafRef = useRef(0)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [finalScore, setFinalScore] = useState(0)
  const [integrityResult, setIntegrityResult] = useState<GameIntegrityResult>({ isValid: true })
  const navigate = useNavigate()

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      if (!stateRef.current || stateRef.current.phase === 'idle') {
        stateRef.current = makeInitialState(canvas.width, canvas.height)
      }
    }
    window.addEventListener('resize', resize)
    resize()

    // ---- DRAW HELPERS ----

    function worldToScreen(worldY: number, cameraY: number, h: number): number {
      // worldY 0 = fondo canvas, aumenta verso l'alto
      // screenY = h - (worldY - cameraY)  => inverte
      return h - (worldY - cameraY)
    }

    function drawBackground(c: CanvasRenderingContext2D, w: number, h: number, s: GameState) {
      // Il cielo si scurisce con l'altezza
      const progress = Math.min(s.level / 40, 1)
      const r = Math.round(135 - progress * 100)
      const g = Math.round(206 - progress * 180)
      const b = Math.round(235 - progress * 100)
      const r2 = Math.round(200 - progress * 150)
      const sky = c.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, `rgb(${r},${g},${b})`)
      sky.addColorStop(1, `rgb(${r2},${r2 - 20},${b - 30})`)
      c.fillStyle = sky
      c.fillRect(0, 0, w, h)

      // Stelle (appaiono con l'altezza)
      if (progress > 0.2) {
        c.globalAlpha = (progress - 0.2) * 1.25
        s.bgStarPhase += 0.001
        for (let i = 0; i < 40; i++) {
          const sx = ((i * 73 + Math.floor(s.bgStarPhase * i * 3)) % w)
          const sy = (i * 47) % (h * 0.7)
          const starR = 0.5 + (i % 3) * 0.5
          const twinkle = 0.5 + 0.5 * Math.sin(s.bgStarPhase * 10 + i)
          c.fillStyle = `rgba(255,255,200,${twinkle})`
          c.beginPath(); c.arc(sx, sy, starR, 0, Math.PI * 2); c.fill()
        }
        c.globalAlpha = 1
      }

      // Torre del Bramante in lontananza
      c.globalAlpha = 0.18
      c.fillStyle = '#8B6914'
      const tw = w * 0.12
      const th = h * 0.45
      const tx = w * 0.75
      const ty = h * 0.52
      c.fillRect(tx, ty, tw, th)
      // Merlature bramante
      for (let i = 0; i < 5; i++) {
        c.fillRect(tx + i * (tw / 5) + 2, ty - 15, tw / 5 - 4, 15)
      }
      c.globalAlpha = 1

      // Terreno / cortile
      const grd = c.createLinearGradient(0, h * 0.82, 0, h)
      grd.addColorStop(0, '#c8a86b')
      grd.addColorStop(1, '#8b6435')
      c.fillStyle = grd
      c.fillRect(0, h * 0.82, w, h * 0.18)
    }

    function drawBlock(c: CanvasRenderingContext2D, block: Block, cameraY: number, h: number, w: number) {
      const sy = worldToScreen(block.y, cameraY, h)
      const sx = w / 2 + (block.x - w / 2) // same as block.x (blocks stored in screen space)
      // Ombra
      c.fillStyle = 'rgba(0,0,0,0.2)'
      c.fillRect(sx - block.w / 2 + 3, sy + 3, block.w, block.h)
      // Blocco
      const bg = c.createLinearGradient(sx - block.w / 2, sy, sx - block.w / 2, sy + block.h)
      bg.addColorStop(0, block.color)
      bg.addColorStop(1, adjustColor(block.color, -30))
      c.fillStyle = bg
      c.fillRect(sx - block.w / 2, sy, block.w, block.h)
      // Bordo
      c.strokeStyle = adjustColor(block.color, -60)
      c.lineWidth = 1.5
      c.strokeRect(sx - block.w / 2, sy, block.w, block.h)
      // Texture pietre (linee verticali)
      c.strokeStyle = `rgba(0,0,0,0.08)`
      c.lineWidth = 1
      const stoneW = Math.max(20, block.w / 4)
      for (let i = 1; i < Math.floor(block.w / stoneW); i++) {
        const lx = sx - block.w / 2 + i * stoneW
        c.beginPath(); c.moveTo(lx, sy); c.lineTo(lx, sy + block.h); c.stroke()
      }
      // Highlight in cima
      c.fillStyle = 'rgba(255,255,255,0.15)'
      c.fillRect(sx - block.w / 2, sy, block.w, 4)
    }

    function adjustColor(hex: string, amount: number): string {
      const num = parseInt(hex.replace('#', ''), 16)
      const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
      const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
      return `rgb(${r},${g},${b})`
    }

    function drawMovingBlock(c: CanvasRenderingContext2D, s: GameState, h: number, _w: number) {
      const m = s.moving
      // Il blocco in movimento è sempre nella stessa posizione Y visiva
      // (sopra l'ultimo blocco)
      const topBlock = s.blocks[s.blocks.length - 1]
      const syTop = worldToScreen(topBlock.y, s.cameraY, h) - m.h - 8

      // Ombra
      c.fillStyle = 'rgba(0,0,0,0.2)'
      c.fillRect(m.x - m.w / 2 + 3, syTop + 3, m.w, m.h)
      // Blocco
      const mg = c.createLinearGradient(m.x - m.w / 2, syTop, m.x - m.w / 2, syTop + m.h)
      mg.addColorStop(0, m.color)
      mg.addColorStop(1, adjustColor(m.color, -30))
      c.fillStyle = mg
      c.fillRect(m.x - m.w / 2, syTop, m.w, m.h)
      c.strokeStyle = adjustColor(m.color, -60)
      c.lineWidth = 2; c.strokeRect(m.x - m.w / 2, syTop, m.w, m.h)
      // Texture
      c.strokeStyle = `rgba(0,0,0,0.08)`; c.lineWidth = 1
      const stoneW = Math.max(20, m.w / 4)
      for (let i = 1; i < Math.floor(m.w / stoneW); i++) {
        const lx = m.x - m.w / 2 + i * stoneW
        c.beginPath(); c.moveTo(lx, syTop); c.lineTo(lx, syTop + m.h); c.stroke()
      }
      c.fillStyle = 'rgba(255,255,255,0.2)'
      c.fillRect(m.x - m.w / 2, syTop, m.w, 4)

      // Freccia direzionale
      const arrowX = m.x + (m.dir > 0 ? m.w / 2 + 10 : -m.w / 2 - 10)
      c.fillStyle = '#fee46e'
      c.font = `bold 18px sans-serif`
      c.textAlign = 'center'
      c.fillText(m.dir > 0 ? '▶' : '◀', arrowX, syTop + m.h / 2 + 6)
    }

    function drawChunks(c: CanvasRenderingContext2D, chunks: FallingChunk[], cameraY: number, h: number) {
      chunks.forEach((ch) => {
        const sy = worldToScreen(ch.y, cameraY, h)
        c.fillStyle = ch.color
        c.globalAlpha = 0.7
        c.fillRect(ch.x, sy, ch.w, ch.h)
        c.globalAlpha = 1
      })
    }

    function drawHUD(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const pad = 12
      // Livello / altezza
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(pad, pad, 120, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(pad, pad, 120, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'left'
      c.fillText('Livello', pad + 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(String(s.level), pad + 10, pad + 48)

      // Altimetro a destra
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(w - 130 - pad, pad, 130, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(w - 130 - pad, pad, 130, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'right'
      c.fillText('Altezza', w - pad - 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      const meters = Math.floor(s.level * 3.5)
      c.fillText(`${meters} m`, w - pad - 10, pad + 48)

      // Perfect popup (non fullscreen, elegante)
      if (s.perfectFlash > 0) {
        const alpha = Math.min(s.perfectFlash * 2, 1)
        const scale = 1 + (1 - s.perfectFlash) * 0.3
        c.save()
        c.globalAlpha = alpha
        c.translate(w / 2, h * 0.42)
        c.scale(scale, scale)
        // Sfondo popup
        c.fillStyle = 'rgba(30, 120, 50, 0.88)'
        c.beginPath(); c.roundRect(-115, -28, 230, 52, 14); c.fill()
        c.strokeStyle = '#90ee90'; c.lineWidth = 2
        c.beginPath(); c.roundRect(-115, -28, 230, 52, 14); c.stroke()
        // Testo
        c.fillStyle = '#ffffff'
        c.font = `bold ${h * 0.055}px Cinzel, serif`
        c.textAlign = 'center'
        c.fillText('✨ PERFETTO! ✨', 0, 14)
        c.restore()
      }
    }

    // ---- UPDATE ----
    function update(dt: number) {
      const s = stateRef.current
      if (!s || s.phase !== 'playing') return

      const w = canvas.width
      const m = s.moving
      // Muovi blocco
      m.x += m.dir * m.speed * dt
      // Rimbalza sulle pareti
      const limit = w * 0.1
      if (m.x + m.w / 2 > w - limit) { m.x = w - limit - m.w / 2; m.dir = -1 }
      if (m.x - m.w / 2 < limit) { m.x = limit + m.w / 2; m.dir = 1 }

      // Camera scroll: la top stack deve restare visibile
      const topBlock = s.blocks[s.blocks.length - 1]
      const targetCamera = Math.max(0, topBlock.y - canvas.height * 0.65)
      s.cameraY += (targetCamera - s.cameraY) * dt * 4

      // Chunks (pezzi che cadono)
      s.chunks.forEach((ch) => {
        ch.vy += 400 * dt
        ch.y -= ch.vy * dt
      })
      s.chunks = s.chunks.filter((ch) => worldToScreen(ch.y, s.cameraY, canvas.height) < canvas.height + 100)

      // Perfect flash decay
      if (s.perfectFlash > 0) s.perfectFlash -= dt * 2.5
    }

    function draw() {
      const s = stateRef.current
      if (!s) return
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawBackground(ctx, w, h, s)
      // Disegna blocchi dal basso all'alto
      s.blocks.forEach((b) => drawBlock(ctx, b, s.cameraY, h, w))
      if (s.phase === 'playing') drawMovingBlock(ctx, s, h, w)
      drawChunks(ctx, s.chunks, s.cameraY, h)
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

    function handleInput(e: Event) {
      e.preventDefault()
      const s = stateRef.current
      if (!s || s.phase !== 'playing') return
      let inputX = 0
      let inputY = 0
      if (e instanceof TouchEvent) {
        const touch = e.changedTouches[0]
        if (!touch) return
        inputX = touch.clientX
        inputY = touch.clientY
      } else {
        const mouseEvent = e as MouseEvent
        inputX = mouseEvent.clientX
        inputY = mouseEvent.clientY
      }
      if (!integrityRef.current.recordInput(e, { x: inputX, y: inputY })) return

      const m = s.moving
      const topBlock = s.blocks[s.blocks.length - 1]

      // Calcola overlap
      const mLeft = m.x - m.w / 2
      const mRight = m.x + m.w / 2
      const tLeft = topBlock.x - topBlock.w / 2
      const tRight = topBlock.x + topBlock.w / 2

      const overlapLeft = Math.max(mLeft, tLeft)
      const overlapRight = Math.min(mRight, tRight)
      const overlap = overlapRight - overlapLeft

      if (overlap <= 0) {
        // Nessun overlap → gameover
        s.phase = 'gameover'
        integrityRef.current.end()
        setFinalScore(s.level)
        setIntegrityResult(integrityRef.current.validate(s.level))
        setPhase('gameover')
        return
      }

      const isPerfect = Math.abs(m.x - topBlock.x) <= PERFECT_THRESHOLD
      if (isPerfect) {
        playPerfectSound()
        s.perfectFlash = 1
        s.lastPerfect = true
      } else {
        s.lastPerfect = false
        // Spawna chunk che cade
        const chunkDir = mLeft < tLeft ? 1 : -1
        const chunkW = chunkDir > 0 ? tLeft - mLeft : mRight - tRight
        if (chunkW > 0) {
          s.chunks.push({
            x: chunkDir > 0 ? mLeft : tRight,
            y: topBlock.y + topBlock.h,
            w: chunkW,
            h: BLOCK_H,
            vy: -20,
            color: m.color,
          })
        }
      }

      const newW = isPerfect ? topBlock.w : overlap
      const newX = (overlapLeft + overlapRight) / 2

      // Nuovo blocco posato
      const newBlock: Block = {
        x: newX,
        y: topBlock.y + topBlock.h,
        w: newW,
        h: BLOCK_H,
        color: m.color,
      }
      s.blocks.push(newBlock)
      s.level++
      s.score = s.level

      // Nuovo blocco in movimento
      const newSpeed = Math.min(BASE_SPEED + s.level * SPEED_INC, 380)
      const startDir = Math.random() < 0.5 ? 1 : -1
      s.moving = {
        x: startDir > 0 ? 0 : canvas.width,
        dir: startDir,
        speed: newSpeed,
        w: isPerfect ? newW : newW * 0.98, // leggermente più stretto se non perfetto
        h: BLOCK_H,
        color: getBlockColor(s.level),
      }
    }

    canvas.addEventListener('touchstart', handleInput, { passive: false })
    canvas.addEventListener('mousedown', handleInput)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('touchstart', handleInput)
      canvas.removeEventListener('mousedown', handleInput)
    }
  }, [])

  function startGame() {
    const canvas = canvasRef.current!
    stateRef.current = makeInitialState(canvas.width, canvas.height)
    stateRef.current.phase = 'playing'
    integrityRef.current.start()
    setPhase('playing')
    setFinalScore(0)
    setIntegrityResult({ isValid: true })
  }

  const isPlaying = phase === 'playing'
  const hero = (
    <div className="giochi-hero py-5 px-4 text-center">
      <Link to="/giochi" className="text-amber-300 text-sm hover:text-amber-200">
        ← Tutti i giochi
      </Link>
      <h1 className="font-medieval text-2xl text-amber-100 mt-1">
        Torre del Bramante
      </h1>
      <p className="text-amber-300/80 text-xs mt-1">
        Tocca per posare il blocco • Costruisci più in alto che puoi!
      </p>
    </div>
  )

  return (
    <GamePlayShell isPlaying={isPlaying} hero={hero} minHeight={480}>
      <canvas ref={canvasRef} className="game-canvas" />

          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-6 p-6">
              <h2 className="font-medieval text-2xl text-amber-300 text-center">
                Costruisci la Torre!
              </h2>
              <div className="bg-palio-900/80 rounded-xl p-4 max-w-xs text-center text-sm text-amber-100 space-y-1">
                <p>👆 Tocca per posare il blocco</p>
                <p>✅ Allinealo perfettamente per un bonus!</p>
                <p>❌ Se cade completamente, è finita</p>
                <p>🏰 Ogni livello il blocco si sposta più veloce</p>
              </div>
              <button onClick={startGame} className="btn-game focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Costruisci!</button>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="absolute inset-0 overflow-y-auto bg-black/65">
              <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
                <p className="font-medieval text-xl text-amber-300">Torre costruita!</p>
                <p className="text-white text-4xl font-bold">
                  {finalScore} <span className="text-amber-300 text-lg">livelli</span>
                </p>
                <p className="text-amber-200 text-sm">
                  ≈ {Math.floor(finalScore * 3.5)} metri di altezza
                </p>
                <GameScoreSubmissionPanel
                  gameId="torre"
                  integrityMessage={integrityResult.message}
                  isScoreValid={integrityResult.isValid}
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
