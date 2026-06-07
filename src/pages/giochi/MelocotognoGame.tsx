import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GamePlayShell from '../../components/GamePlayShell'
import GameScoreSubmissionPanel from '../../components/GameScoreSubmissionPanel'
import { createGameIntegrityTracker, type GameIntegrityResult } from '../../lib/game-anti-cheat'

type GamePhase = 'idle' | 'playing' | 'gameover'

interface Ribbon {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  active: boolean
  trail: { x: number; y: number }[]
  width: number
  overshot: boolean  // è andata oltre la zona 10pt → niente punteggio
  windStrength: number  // vento fisso per questo lancio
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  angle: number
  spin: number
}

interface ScorePopup {
  x: number
  y: number
  vy: number
  text: string
  life: number
  color: string
}

interface Wind {
  strength: number // vento del prossimo lancio (per HUD)
}

interface GameState {
  phase: GamePhase
  score: number
  timeLeft: number
  ribbons: Ribbon[]
  particles: Particle[]
  popups: ScorePopup[]
  wind: Wind
  treeX: number
  treeY: number
  zones: { y: number; h: number; w: number; points: number; label: string }[]
  lastTapTime: number
}

const RIBBON_COLORS = ['#e63946', '#1d3557', '#f4a261', '#2a9d8f', '#e9c46a', '#6a4c93', '#ff6b6b']
const GAME_DURATION = 20
const TAP_COOLDOWN = 0.40  // era 0.18 — più difficile

function makeInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    timeLeft: GAME_DURATION,
    ribbons: [],
    particles: [],
    popups: [],
    wind: { strength: 0 },
    treeX: 0,
    treeY: 0,
    zones: [],
    lastTapTime: -999,
  }
}

export default function MelocotognoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(makeInitialState())
  const integrityRef = useRef(createGameIntegrityTracker({
    maxAcceptedInputsPerSecond: 6,
    maxIdenticalPositionStreak: 30,
    maxScore: 800,
    minDurationMs: GAME_DURATION * 1000 - 500,
    minTrustedInputs: 1,
  }))
  const rafRef = useRef(0)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [finalScore, setFinalScore] = useState(0)
  const [integrityResult, setIntegrityResult] = useState<GameIntegrityResult>({ isValid: true })
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

    const s = stateRef.current
    s.treeX = canvas.width / 2
    s.treeY = canvas.height * 0.42
    const treeTop = s.treeY - canvas.height * 0.32
    const h = canvas.height
    const w = canvas.width
    const zoneH = h * 0.082
    s.zones = [
      { y: treeTop + zoneH * 0.15, h: zoneH * 0.9, w: w * 0.17, points: 10, label: '10 pt' },
      { y: treeTop + zoneH * 1.25, h: zoneH * 1.15, w: w * 0.22, points: 5, label: '5 pt' },
      { y: treeTop + zoneH * 2.65, h: zoneH * 1.45, w: w * 0.28, points: 2, label: '2 pt' },
    ]
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const resize = () => syncCanvasLayout(canvas)
    const resizeObserver = new ResizeObserver(resize)

    window.addEventListener('resize', resize)
    resizeObserver.observe(canvas)
    resize()

    // ---- DRAW ----

    function drawBackground(c: CanvasRenderingContext2D, w: number, h: number) {
      // Cielo ricco
      const sky = c.createLinearGradient(0, 0, 0, h * 0.55)
      sky.addColorStop(0, '#2c6fa8')
      sky.addColorStop(0.4, '#5b9bd5')
      sky.addColorStop(1, '#c8e8f8')
      c.fillStyle = sky
      c.fillRect(0, 0, w, h * 0.55)

      // Nuvole
      function drawCloud(cx: number, cy: number, r: number, alpha: number) {
        c.globalAlpha = alpha
        c.fillStyle = '#fff'
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx + r * 1.2, cy + r * 0.15, r * 0.75, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx - r * 0.9, cy + r * 0.1, r * 0.65, 0, Math.PI * 2); c.fill()
        c.globalAlpha = 1
      }
      drawCloud(w * 0.12, h * 0.09, h * 0.034, 0.85)
      drawCloud(w * 0.72, h * 0.07, h * 0.026, 0.75)
      drawCloud(w * 0.45, h * 0.04, h * 0.018, 0.6)

      // Mura castello sinistra e destra
      c.fillStyle = '#c09a5a'
      c.fillRect(0, h * 0.08, w * 0.19, h * 0.47)
      c.fillRect(w * 0.81, h * 0.08, w * 0.19, h * 0.47)
      // Texture mattoni
      c.strokeStyle = '#8B6030'
      c.lineWidth = 1
      c.globalAlpha = 0.28
      for (let wall = 0; wall < 2; wall++) {
        const wx = wall === 0 ? 0 : w * 0.81
        const ww = w * 0.19
        for (let row = 0; row < 8; row++) {
          const ry = h * 0.08 + row * h * 0.065
          const off = row % 2 === 0 ? 0 : ww * 0.22
          for (let col = -1; col < 6; col++) {
            c.strokeRect(wx + col * ww * 0.35 + off, ry, ww * 0.34, h * 0.064)
          }
        }
      }
      c.globalAlpha = 1
      // Merlature
      c.fillStyle = '#a07840'
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          c.fillRect(i * w * 0.038 + 2, h * 0.055, w * 0.034, h * 0.04)
          c.fillRect(w * 0.81 + i * w * 0.038 + 2, h * 0.055, w * 0.034, h * 0.04)
        }
      }
      // Bandiere colorate sui muri
      const flagColors = ['#e63946', '#2a9d8f', '#1d3557', '#f4a261']
      ;[w * 0.035, w * 0.13, w * 0.83, w * 0.925].forEach((fx, fi) => {
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 2
        c.beginPath(); c.moveTo(fx, h * 0.09); c.lineTo(fx, h * 0.28); c.stroke()
        c.fillStyle = flagColors[fi]
        c.beginPath()
        c.moveTo(fx, h * 0.11); c.lineTo(fx + 24, h * 0.17); c.lineTo(fx, h * 0.23)
        c.closePath(); c.fill()
        // Croce bianca
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5
        c.beginPath(); c.moveTo(fx + 8, h * 0.12); c.lineTo(fx + 8, h * 0.22); c.stroke()
        c.beginPath(); c.moveTo(fx + 1, h * 0.17); c.lineTo(fx + 22, h * 0.17); c.stroke()
      })

      // Terreno lastricato
      const ground = c.createLinearGradient(0, h * 0.55, 0, h)
      ground.addColorStop(0, '#c8a87a')
      ground.addColorStop(1, '#8B6240')
      c.fillStyle = ground
      c.fillRect(0, h * 0.55, w, h * 0.45)
      // Lastricato
      c.strokeStyle = '#7a5520'
      c.lineWidth = 1
      c.globalAlpha = 0.3
      for (let row = 0; row < 6; row++) {
        const y = h * 0.55 + row * h * 0.08
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke()
        const off = row % 2 === 0 ? 0 : w * 0.12
        for (let col = -1; col < 10; col++) {
          c.beginPath(); c.moveTo(off + col * w * 0.20, y); c.lineTo(off + col * w * 0.20, y + h * 0.08); c.stroke()
        }
      }
      c.globalAlpha = 1
    }

    function drawTree(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const tx = s.treeX
      const treeBaseY = h * 0.78
      const treeTopY = s.treeY - h * 0.32

      // Ombra
      c.fillStyle = 'rgba(0,0,0,0.1)'
      c.beginPath(); c.ellipse(tx + 8, treeBaseY, w * 0.13, h * 0.035, 0, 0, Math.PI * 2); c.fill()

      // Tronco
      const trunkW = w * 0.048
      const trg = c.createLinearGradient(tx - trunkW, 0, tx + trunkW, 0)
      trg.addColorStop(0, '#8B4513')
      trg.addColorStop(0.5, '#6b3a1a')
      trg.addColorStop(1, '#3d1a09')
      c.fillStyle = trg
      c.beginPath()
      c.moveTo(tx - trunkW * 0.5, treeBaseY)
      c.bezierCurveTo(tx - trunkW, treeBaseY - (treeBaseY - treeTopY) * 0.4, tx - trunkW * 1.1, treeTopY + (treeBaseY - treeTopY) * 0.55, tx - trunkW * 1.05, treeTopY + (treeBaseY - treeTopY) * 0.62)
      c.lineTo(tx + trunkW * 1.05, treeTopY + (treeBaseY - treeTopY) * 0.62)
      c.bezierCurveTo(tx + trunkW * 1.1, treeTopY + (treeBaseY - treeTopY) * 0.55, tx + trunkW, treeBaseY - (treeBaseY - treeTopY) * 0.4, tx + trunkW * 0.5, treeBaseY)
      c.closePath(); c.fill()

      // Chioma - 5 layer
      const crownY = treeTopY + (treeBaseY - treeTopY) * 0.3
      const crownRx = w * 0.185
      const crownRy = h * 0.265
      c.fillStyle = '#1a4d1a'
      c.beginPath(); c.ellipse(tx + 6, crownY + 6, crownRx, crownRy, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#2a5e2a'
      c.beginPath(); c.ellipse(tx, crownY, crownRx, crownRy, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#357a44'
      c.beginPath(); c.ellipse(tx - crownRx * 0.08, crownY - h * 0.03, crownRx * 0.84, crownRy * 0.82, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#44924f'
      c.beginPath(); c.ellipse(tx + crownRx * 0.04, crownY - h * 0.065, crownRx * 0.68, crownRy * 0.62, 0, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#56aa60'
      c.beginPath(); c.ellipse(tx, crownY - h * 0.098, crownRx * 0.52, crownRy * 0.44, 0, 0, Math.PI * 2); c.fill()

      // Mele cotogne (frutti giallo-verdastri)
      const fruits = [
        { ox: -crownRx * 0.42, oy: crownRy * 0.0 },
        { ox: crownRx * 0.38, oy: -crownRy * 0.08 },
        { ox: crownRx * 0.05, oy: crownRy * 0.12 },
        { ox: -crownRx * 0.22, oy: -crownRy * 0.18 },
        { ox: crownRx * 0.28, oy: crownRy * 0.22 },
        { ox: -crownRx * 0.08, oy: -crownRy * 0.32 },
      ]
      fruits.forEach(({ ox, oy }) => {
        const fr = h * 0.023
        // Frutto
        const fg = c.createRadialGradient(tx + ox - fr * 0.3, crownY + oy - fr * 0.3, fr * 0.1, tx + ox, crownY + oy, fr)
        fg.addColorStop(0, '#dde840')
        fg.addColorStop(1, '#9aaa10')
        c.fillStyle = fg
        c.beginPath(); c.arc(tx + ox, crownY + oy, fr, 0, Math.PI * 2); c.fill()
        c.strokeStyle = '#6a7a08'; c.lineWidth = 1
        c.beginPath(); c.arc(tx + ox, crownY + oy, fr, 0, Math.PI * 2); c.stroke()
        // Picciolo
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.5
        c.beginPath(); c.moveTo(tx + ox, crownY + oy - fr); c.lineTo(tx + ox + 2, crownY + oy - fr - 6); c.stroke()
      })

      // Contenitori (zone) — larghezze diverse per difficoltà
      s.zones.forEach((z) => {
        const zx = tx - z.w / 2
        // Ombra
        c.fillStyle = 'rgba(0,0,0,0.3)'
        c.beginPath(); c.roundRect(zx + 3, z.y + 3, z.w, z.h, 6); c.fill()
        // Gradiente colore per zona
        const zg = c.createLinearGradient(zx, z.y, zx, z.y + z.h)
        if (z.points === 10) {
          zg.addColorStop(0, '#f0d020'); zg.addColorStop(1, '#a89000')
        } else if (z.points === 5) {
          zg.addColorStop(0, '#c8a818'); zg.addColorStop(1, '#806808')
        } else {
          zg.addColorStop(0, '#b09010'); zg.addColorStop(1, '#706008')
        }
        c.fillStyle = zg
        c.beginPath(); c.roundRect(zx, z.y, z.w, z.h, 6); c.fill()
        // Bordo luminoso per zona 10pt
        c.strokeStyle = z.points === 10 ? '#fee46e' : '#7a5500'
        c.lineWidth = z.points === 10 ? 2.5 : 1.5
        c.beginPath(); c.roundRect(zx, z.y, z.w, z.h, 6); c.stroke()
        // Etichetta
        c.fillStyle = z.points === 10 ? '#fff' : '#2a1a00'
        c.font = `bold ${Math.max(9, h * 0.024)}px Cinzel, serif`
        c.textAlign = 'center'
        c.fillText(z.label, tx, z.y + z.h * 0.75)
      })
    }

    function drawRibbons(c: CanvasRenderingContext2D, ribbons: Ribbon[]) {
      ribbons.forEach((r) => {
        if (!r.active && r.trail.length < 2) return
        if (r.trail.length >= 2) {
          // Nastro spesso con highlight
          c.beginPath()
          c.moveTo(r.trail[0].x, r.trail[0].y)
          r.trail.forEach((p) => c.lineTo(p.x, p.y))
          c.strokeStyle = r.color
          c.lineWidth = r.width
          c.lineCap = 'round'
          c.lineJoin = 'round'
          c.globalAlpha = 0.85
          c.stroke()
          // Highlight
          c.strokeStyle = 'rgba(255,255,255,0.45)'
          c.lineWidth = r.width * 0.35
          c.stroke()
          c.globalAlpha = 1
        }
        if (r.active) {
          // Nodo fettuccia
          c.beginPath(); c.arc(r.x, r.y, r.width * 0.9, 0, Math.PI * 2)
          c.fillStyle = r.color; c.fill()
          c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5; c.stroke()
        }
      })
    }

    function drawParticles(c: CanvasRenderingContext2D, particles: Particle[]) {
      particles.forEach((p) => {
        c.save()
        c.globalAlpha = p.life
        c.translate(p.x, p.y)
        c.rotate(p.angle)
        // Coriandolo rettangolare
        c.fillStyle = p.color
        c.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5)
        c.restore()
      })
      c.globalAlpha = 1
    }

    function drawScorePopups(c: CanvasRenderingContext2D, popups: ScorePopup[], h: number) {
      popups.forEach((p) => {
        const alpha = p.life > 0.7 ? 1 : p.life / 0.7
        c.save()
        c.globalAlpha = alpha
        const fontSize = h * 0.07
        c.font = `bold ${fontSize}px Cinzel, serif`
        c.textAlign = 'center'
        // Ombra
        c.fillStyle = 'rgba(0,0,0,0.7)'
        c.fillText(p.text, p.x + 2, p.y + 2)
        // Testo
        c.fillStyle = p.color
        c.fillText(p.text, p.x, p.y)
        c.restore()
      })
    }

    function drawWindIndicator(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const wx = w / 2
      const wy = h * 0.065
      const mag = Math.abs(s.wind.strength)
      const windDesc = mag < 0.08 ? 'calmo' : mag < 0.45 ? 'debole' : mag < 0.78 ? 'medio' : 'forte'
      const windDir = s.wind.strength > 0 ? '→' : s.wind.strength < 0 ? '←' : ''
      const label = mag < 0.08 ? '🌿 Prossimo lancio: calmo' : `💨 Prossimo lancio: ${windDir} ${windDesc}`
      const boxW = 210
      c.fillStyle = 'rgba(0,0,0,0.55)'
      c.beginPath(); c.roundRect(wx - boxW / 2, wy - 13, boxW, 26, 8); c.fill()
      c.fillStyle = mag < 0.08 ? '#90ee90' : mag < 0.45 ? '#b8f0b8' : mag < 0.78 ? '#ffdd55' : '#ff8844'
      c.font = `bold ${h * 0.023}px Inter, sans-serif`
      c.textAlign = 'center'
      c.fillText(label, wx, wy + 5)
    }

    function drawHUD(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const pad = 12
      // Punteggio
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(pad, pad, 115, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(pad, pad, 115, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.025}px Cinzel, serif`
      c.textAlign = 'left'
      c.fillText('Punti', pad + 10, pad + 20)
      c.font = `bold ${h * 0.048}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(String(s.score), pad + 10, pad + 48)

      // Timer
      const urgent = s.timeLeft <= 5
      c.fillStyle = urgent ? 'rgba(180,30,20,0.95)' : 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(w - 115 - pad, pad, 115, 52, 10); c.fill()
      c.strokeStyle = urgent ? '#ff9090' : '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(w - 115 - pad, pad, 115, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.025}px Cinzel, serif`
      c.textAlign = 'right'
      c.fillText('Tempo', w - pad - 10, pad + 20)
      c.font = `bold ${h * 0.048}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(`${Math.ceil(s.timeLeft)}s`, w - pad - 10, pad + 48)

      // Indicatore vento
      drawWindIndicator(c, s, w, h)

      // Linea zona di lancio + indicatore potenza
      const launchY = h * 0.70
      c.save()
      c.setLineDash([10, 8])
      c.strokeStyle = 'rgba(254,228,110,0.50)'
      c.lineWidth = 1.5
      c.beginPath(); c.moveTo(0, launchY); c.lineTo(w, launchY); c.stroke()
      c.setLineDash([])
      c.fillStyle = 'rgba(254,228,110,0.60)'
      c.font = `bold ${h * 0.020}px Inter, sans-serif`
      c.textAlign = 'center'
      c.fillText('↑ in alto = 2pt  •  in basso = 5/10pt ↓', w / 2, launchY + 18)
      c.restore()

      // Suggerimento iniziale
      if (s.timeLeft > 17.5) {
        c.fillStyle = 'rgba(0,0,0,0.6)'
        c.beginPath(); c.roundRect(w / 2 - 165, h - 58, 330, 38, 10); c.fill()
        c.fillStyle = '#fff'
        c.font = `${h * 0.025}px Inter, sans-serif`
        c.textAlign = 'center'
        c.fillText('Tocca in basso per lanciare più in alto!', w / 2, h - 33)
      }
    }

    function spawnParticles(particles: Particle[], x: number, y: number, _color: string, count = 18) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2.5 + Math.random() * 5
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1,
          color: RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)],
          size: 5 + Math.random() * 7,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.3,
        })
      }
    }

    function checkCollisions(s: GameState) {
      const colors: Record<number, string> = { 10: '#fee46e', 5: '#ffd040', 2: '#90ee90' }
      s.ribbons.forEach((r) => {
        if (!r.active || r.vy <= 0 || r.overshot) return  // solo in discesa, non se ha superato tutte le zone
        s.zones.forEach((z) => {
          if (!r.active) return
          const zx = s.treeX - z.w / 2
          if (r.x >= zx && r.x <= zx + z.w && r.y >= z.y && r.y <= z.y + z.h) {
            r.active = false
            s.score += z.points
            spawnParticles(s.particles, r.x, r.y, r.color)
            s.popups.push({
              x: s.treeX + (Math.random() - 0.5) * 60,
              y: z.y - 10,
              vy: -110,
              text: `+${z.points}`,
              life: 1.4,
              color: colors[z.points] ?? '#fff',
            })
          }
        })
      })
    }

    function update(dt: number) {
      const s = stateRef.current
      if (s.phase !== 'playing') return

      s.timeLeft -= dt
      if (s.timeLeft <= 0) {
        s.timeLeft = 0
        s.phase = 'gameover'
        integrityRef.current.end()
        setFinalScore(s.score)
        setIntegrityResult(integrityRef.current.validate(s.score))
        setPhase('gameover')
        return
      }

      const h = canvas.height
      const g = h * 1.55

      s.ribbons.forEach((r) => {
        if (!r.active) return
        r.vy += g * dt
        // Ogni fettuccia usa il vento fisso assegnato al momento del lancio
        r.vx += r.windStrength * 140 * dt
        r.x += r.vx * dt
        r.y += r.vy * dt
        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 24) r.trail.shift()
        // Se supera la cima della zona 10pt → colpo troppo forte, niente punteggio
        if (s.zones.length > 0 && r.y < s.zones[0].y) r.overshot = true
        if (r.y < -60 || r.y > canvas.height + 60 || r.x < -90 || r.x > canvas.width + 90) r.active = false
      })
      s.ribbons = s.ribbons.filter((r) => r.active || r.trail.length > 0)
      if (s.ribbons.length > 22) s.ribbons = s.ribbons.slice(-14)

      s.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        p.vy += 0.18
        p.angle += p.spin
        p.life -= dt * 1.9
      })
      s.particles = s.particles.filter((p) => p.life > 0)

      s.popups.forEach((p) => {
        p.y += p.vy * dt
        p.life -= dt * 1.2
      })
      s.popups = s.popups.filter((p) => p.life > 0)

      checkCollisions(s)
    }

    function draw() {
      const s = stateRef.current
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawBackground(ctx, w, h)
      drawTree(ctx, s, w, h)
      drawRibbons(ctx, s.ribbons)
      drawParticles(ctx, s.particles)
      drawScorePopups(ctx, s.popups, h)
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
      if (s.phase !== 'playing') return
      const elapsed = GAME_DURATION - s.timeLeft
      if (elapsed - s.lastTapTime < TAP_COOLDOWN) return

      let tapX: number, tapY: number
      const rect = canvas.getBoundingClientRect()
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
      const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
      if (e instanceof TouchEvent) {
        tapX = (e.touches[0].clientX - rect.left) * scaleX
        tapY = (e.touches[0].clientY - rect.top) * scaleY
      } else {
        const me = e as MouseEvent
        tapX = (me.clientX - rect.left) * scaleX
        tapY = (me.clientY - rect.top) * scaleY
      }

      // Solo dal basso: non si può toccare direttamente le ceste
      const launchZoneY = canvas.height * 0.70
      if (tapY < launchZoneY) return
      if (!integrityRef.current.recordInput(e, { x: tapX, y: tapY })) return
      s.lastTapTime = elapsed

      // Potenza proporzionale a quanto in basso si tocca:
      // vicino alla linea = 2pt, in basso = 5/10pt
      const tapRatio = (tapY - launchZoneY) / (canvas.height - launchZoneY)
      const power = canvas.height * (0.96 + tapRatio * 0.84)

      const dx = s.treeX - tapX
      const dy = s.treeY - tapY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const factor = 0.90 + Math.random() * 0.20
      const vx = (dx / dist) * power * factor
      const vy = (dy / dist) * power * factor - canvas.height * 0.10

      // Scegli il vento per questo lancio e mostralo nell'HUD per il lancio successivo
      const thisWindStrength = s.wind.strength
      s.wind.strength = (Math.random() - 0.5) * 3.0  // prepara vento per prossimo lancio

      const color = RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)]
      s.ribbons.push({
        x: tapX, y: tapY, vx, vy, color, active: true,
        trail: [{ x: tapX, y: tapY }], overshot: false,
        width: 4 + Math.random() * 3,
        windStrength: thisWindStrength,
      })
    }

    canvas.addEventListener('touchstart', handleInput, { passive: false })
    canvas.addEventListener('mousedown', handleInput)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      resizeObserver.disconnect()
      canvas.removeEventListener('touchstart', handleInput)
      canvas.removeEventListener('mousedown', handleInput)
    }
  }, [])

  function startGame() {
    const s = stateRef.current
    s.phase = 'playing'
    s.score = 0
    s.timeLeft = GAME_DURATION
    s.ribbons = []
    s.particles = []
    s.popups = []
    s.wind = { strength: 0 }
    s.lastTapTime = -999
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
        Gioco del Melocotogno
      </h1>
      <p className="text-amber-300/80 text-xs mt-1">
        Lancia le fettucce verso i contenitori • 20 sec • Il vento cambia ad ogni lancio!
      </p>
    </div>
  )

  return (
    <GamePlayShell isPlaying={isPlaying} hero={hero} minHeight={420}>
      <canvas ref={canvasRef} className="game-canvas" />

          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-6 p-6">
              <h2 className="font-medieval text-2xl text-amber-300 text-center">Pronto a giocare?</h2>
              <div className="bg-palio-900/80 rounded-xl p-4 max-w-xs text-center text-sm text-amber-100 space-y-1.5 border border-amber-700/40">
                <p>🎯 Tocca per lanciare le fettucce</p>
                <p>🌿 Colpisci i contenitori dell'albero</p>
                <p>⭐ Alto = 10 pt &bull; Medio = 5 pt &bull; Basso = 2 pt</p>
                <p>💨 Il vento cambia ad ogni lancio — leggi l'indicatore!</p>
                <p>⏱ Hai 20 secondi!</p>
              </div>
              <button onClick={startGame} className="btn-game">Inizia!</button>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="absolute inset-0 overflow-y-auto bg-black/65">
              <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
                <p className="font-medieval text-xl text-amber-300">Tempo scaduto!</p>
                <p className="text-white text-4xl font-bold">
                  {finalScore} <span className="text-amber-300 text-xl">punti</span>
                </p>
                <GameScoreSubmissionPanel
                  gameId="melocotogno"
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
