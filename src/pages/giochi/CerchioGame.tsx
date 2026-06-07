import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GamePlayShell from '../../components/GamePlayShell'
import GameScoreSubmissionPanel from '../../components/GameScoreSubmissionPanel'
import { createGameIntegrityTracker, type GameIntegrityResult } from '../../lib/game-anti-cheat'

type GamePhase = 'idle' | 'playing' | 'gameover'

interface GameState {
  phase: GamePhase
  tilt: number           // radianti
  tiltVelocity: number
  distance: number
  bgOffset: number
  elapsed: number        // secondi trascorsi (per difficoltà progressiva)
  hoopX: number
  hoopAngle: number
  tapFlash: number
  tapDir: number
  tiltNoise: number
  playerRunPhase: number
}

const MAX_TILT = Math.PI / 4        // 45° = caduta

// ---- DIFFICOLTÀ BASE ----
const TILT_CORRECTION = 0.45
const TILT_GRAVITY    = 3.5
const TILT_FRICTION   = 0.985
const BASE_SPEED      = 190
const NOISE_MAGNITUDE = 1.2
const NOISE_MIN_INTERVAL = 0.35
const NOISE_MAX_INTERVAL = 0.90

const BANNER_COLORS = ['#e63946', '#1d3557', '#2a9d8f', '#e9c46a', '#6a4c93', '#f4a261']

function makeInitialState(): GameState {
  return {
    phase: 'idle',
    tilt: 0,
    tiltVelocity: 0,
    distance: 0,
    bgOffset: 0,
    elapsed: 0,
    hoopX: 0,
    hoopAngle: 0,
    tapFlash: 0,
    tapDir: 0,
    tiltNoise: 1.5,
    playerRunPhase: 0,
  }
}

export default function CerchioGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<GameState>(makeInitialState())
  const integrityRef = useRef(createGameIntegrityTracker({
    maxAcceptedInputsPerSecond: 24,
    maxIdenticalPositionStreak: 80,
    maxScore: 2400,
    minDurationMs: 1000,
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
      stateRef.current.hoopX = canvas.width * 0.5
    }
    window.addEventListener('resize', resize)
    resize()

    // ---- DRAW ----

    function drawBackground(c: CanvasRenderingContext2D, w: number, h: number, _bgOffset: number) {
      const sky = c.createLinearGradient(0, 0, 0, h * 0.48)
      sky.addColorStop(0, '#2a6aad')
      sky.addColorStop(0.5, '#5b9bd5')
      sky.addColorStop(1, '#c5e8f8')
      c.fillStyle = sky
      c.fillRect(0, 0, w, h * 0.48)

      function cloud(cx: number, cy: number, r: number) {
        c.globalAlpha = 0.82; c.fillStyle = '#fff'
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx + r * 1.1, cy + r * 0.1, r * 0.7, 0, Math.PI * 2); c.fill()
        c.beginPath(); c.arc(cx - r * 0.85, cy + r * 0.05, r * 0.6, 0, Math.PI * 2); c.fill()
        c.globalAlpha = 1
      }
      cloud(w * 0.1, h * 0.08, h * 0.032)
      cloud(w * 0.78, h * 0.06, h * 0.025)

      const castleOff = 0
      c.fillStyle = '#c09a6080'
      c.fillRect(w * 0.05 - castleOff % (w * 0.9), h * 0.06, w * 0.9, h * 0.38)
      c.fillStyle = '#a08040'
      for (let i = 0; i < 12; i++) {
        if (i % 2 === 0) {
          c.fillRect(w * 0.05 + i * (w * 0.9 / 12) - castleOff % (w * 0.9), h * 0.03, w * 0.9 / 14, h * 0.04)
        }
      }
      c.fillStyle = '#3d2010'
      for (let i = 0; i < 6; i++) {
        const wx2 = w * 0.1 + i * w * 0.14 - castleOff % (w * 0.9)
        c.beginPath()
        c.arc(wx2, h * 0.2, w * 0.02, Math.PI, 0)
        c.fillRect(wx2 - w * 0.02, h * 0.2, w * 0.04, h * 0.09)
        c.fill()
      }

      const grd = c.createLinearGradient(0, h * 0.48, 0, h)
      grd.addColorStop(0, '#b89060')
      grd.addColorStop(1, '#8b6040')
      c.fillStyle = grd
      c.fillRect(0, h * 0.48, w, h * 0.52)

      c.fillStyle = '#c0a070'
      c.fillRect(0, h * 0.52, w, h * 0.48)
      const stoneW = 42
      const stoneH = h * 0.052
      const startY = h * 0.53
      for (let row = 0; row < 7; row++) {
        const py = startY + row * stoneH
        const rowOff = row % 2 === 0 ? 0 : stoneW / 2
        const scrollX = 0
        for (let col = -1; col < Math.ceil(w / stoneW) + 2; col++) {
          const px = col * stoneW - scrollX + rowOff
          c.fillStyle = (row + col) % 2 === 0 ? 'rgba(180,145,85,0.55)' : 'rgba(200,168,108,0.45)'
          c.beginPath(); c.roundRect(px + 1, py + 1, stoneW - 2, stoneH - 2, 3); c.fill()
          c.strokeStyle = 'rgba(120,85,35,0.5)'; c.lineWidth = 0.7
          c.beginPath(); c.roundRect(px + 1, py + 1, stoneW - 2, stoneH - 2, 3); c.stroke()
        }
      }

      BANNER_COLORS.forEach((color, i) => {
        const spacing = (w + 240) / BANNER_COLORS.length
        const bx = ((i * spacing) % (w + 240) + (w + 240)) % (w + 240) - 120
        c.strokeStyle = '#5a3a1a'; c.lineWidth = 3
        c.beginPath(); c.moveTo(bx, h * 0.04); c.lineTo(bx, h * 0.42); c.stroke()
        c.fillStyle = color
        c.beginPath()
        c.moveTo(bx, h * 0.06); c.lineTo(bx + 34, h * 0.15); c.lineTo(bx, h * 0.24)
        c.closePath(); c.fill()
        c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.8
        c.beginPath(); c.moveTo(bx + 9, h * 0.08); c.lineTo(bx + 9, h * 0.22); c.stroke()
        c.beginPath(); c.moveTo(bx + 2, h * 0.15); c.lineTo(bx + 30, h * 0.15); c.stroke()
      })
    }

    function drawPerspectiveTrack(c: CanvasRenderingContext2D, w: number, h: number, bgOffset: number) {
      const horizonY = h * 0.48
      const vanishingX = w * 0.5
      const trackHalfTop = w * 0.08
      const trackHalfBottom = w * 0.48

      const track = c.createLinearGradient(0, horizonY, 0, h)
      track.addColorStop(0, 'rgba(111, 78, 44, 0.05)')
      track.addColorStop(1, 'rgba(73, 44, 24, 0.28)')
      c.fillStyle = track
      c.beginPath()
      c.moveTo(vanishingX - trackHalfTop, horizonY)
      c.lineTo(vanishingX - trackHalfBottom, h)
      c.lineTo(vanishingX + trackHalfBottom, h)
      c.lineTo(vanishingX + trackHalfTop, horizonY)
      c.closePath()
      c.fill()

      c.strokeStyle = 'rgba(45, 16, 5, 0.22)'
      c.lineWidth = 2
      const laneProgress = (bgOffset * 0.005) % 1
      for (let i = 0; i < 7; i++) {
        const t = ((i / 7) + laneProgress) % 1
        const y = horizonY + (h - horizonY) * t * t
        const half = trackHalfTop + (trackHalfBottom - trackHalfTop) * t
        c.beginPath()
        c.moveTo(vanishingX - half, y)
        c.lineTo(vanishingX + half, y)
        c.stroke()
      }

      c.strokeStyle = 'rgba(80, 47, 24, 0.18)'
      c.lineWidth = 1.5
      for (let i = -2; i <= 2; i++) {
        const xShift = i * w * 0.08
        c.beginPath()
        c.moveTo(vanishingX + xShift * 0.18, horizonY)
        c.lineTo(vanishingX + xShift, h)
        c.stroke()
      }

      c.strokeStyle = 'rgba(255, 236, 180, 0.18)'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(vanishingX, horizonY)
      c.lineTo(vanishingX, h)
      c.stroke()
    }

    function drawHoop(c: CanvasRenderingContext2D, s: GameState, _w: number, h: number) {
      const hx = s.hoopX
      const hy = h * 0.6
      const r = h * 0.145
      const tiltRatio = Math.min(Math.abs(s.tilt) / MAX_TILT, 1)
      const tiltSign = Math.sign(s.tilt) || 1
      const swayX = s.tilt * 30
      const swayY = tiltRatio * 10
      const tiltRotation = s.tilt * 0.42
      const perspectiveNarrow = 0.42 + tiltRatio * 0.14
      const hoopRx = r * perspectiveNarrow
      const hoopRy = r * 1.18
      const leanShear = tiltSign * tiltRatio * 0.22
      const contactShift = tiltSign * tiltRatio * hoopRx * 0.9
      const attachX = hx + swayX * 0.06 + contactShift * 0.22
      const attachY = hy + hoopRy * (0.82 + tiltRatio * 0.06)

      c.save()
      c.translate(hx + swayX, hy + swayY)
      c.rotate(tiltRotation)
      c.transform(1, 0, leanShear, 1, 0, 0)

      c.beginPath()
      c.ellipse(10 + contactShift * 0.12, 16, hoopRx * (1.02 + tiltRatio * 0.08), hoopRy * 0.16, 0, 0, Math.PI * 2)
      c.fillStyle = 'rgba(0,0,0,0.22)'
      c.fill()

      const rim = c.createLinearGradient(-hoopRx, 0, hoopRx, 0)
      rim.addColorStop(0, '#4b2810')
      rim.addColorStop(0.18, '#7c4b1f')
      rim.addColorStop(0.5, '#ddb57b')
      rim.addColorStop(0.82, '#7c4b1f')
      rim.addColorStop(1, '#3f210d')

      c.fillStyle = rim
      c.beginPath()
      c.ellipse(0, 0, hoopRx, hoopRy, 0, 0, Math.PI * 2)
      c.ellipse(0, 0, hoopRx - 9, hoopRy - 10, 0, 0, Math.PI * 2, true)
      c.fill('evenodd')

      c.strokeStyle = '#4a2a0a'
      c.lineWidth = 8
      c.beginPath()
      c.ellipse(0, 0, hoopRx, hoopRy, 0, 0, Math.PI * 2)
      c.stroke()

      c.strokeStyle = 'rgba(255, 235, 190, 0.32)'
      c.lineWidth = 2.5
      c.beginPath()
      c.ellipse(-1 - contactShift * 0.08, -2, hoopRx - 10, hoopRy - 11, 0, 0, Math.PI * 2)
      c.stroke()

      const spokeStretch = 1.12
      for (let i = 0; i < 4; i++) {
        const a = s.hoopAngle + (i / 4) * Math.PI * 2
        c.strokeStyle = i % 2 === 0 ? '#6B4020' : '#8a5b31'
        c.lineWidth = i % 2 === 0 ? 3 : 2.1
        c.beginPath()
        c.moveTo(Math.cos(a) * hoopRx * 0.16, Math.sin(a) * hoopRy * 0.16)
        c.lineTo(Math.cos(a) * hoopRx * 0.82, Math.sin(a) * hoopRy * spokeStretch)
        c.stroke()
      }

      c.beginPath()
      c.arc(0, 0, 5, 0, Math.PI * 2)
      c.fillStyle = '#4a2a0a'
      c.fill()

      c.restore()

      c.strokeStyle = '#2d1005'; c.lineWidth = 6; c.lineCap = 'round'
      c.beginPath()
      c.moveTo(hx - r * 0.34 - s.tilt * 18 + contactShift * 0.15, h * (0.92 + tiltRatio * 0.01))
      c.quadraticCurveTo(hx - r * 0.14 + s.tilt * 10 + contactShift * 0.35, h * (0.84 + tiltRatio * 0.02), attachX, attachY)
      c.stroke()
    }

    function drawPlayer(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const cx = w / 2
      const baseY = h * 0.93
      const gripY = h * 0.84
      const gripOffset = w * 0.09
      const handLift = Math.sin(s.playerRunPhase) * 3
      const tiltOffset = s.tilt * 14

      c.fillStyle = 'rgba(0,0,0,0.14)'
      c.beginPath(); c.ellipse(cx, h * 0.935, w * 0.14, h * 0.018, 0, 0, Math.PI * 2); c.fill()

      c.strokeStyle = '#6d3f18'; c.lineWidth = 12; c.lineCap = 'round'
      c.beginPath()
      c.moveTo(cx - gripOffset, baseY)
      c.quadraticCurveTo(cx - gripOffset * 0.65, h * 0.86 + handLift, cx - 24, gripY + handLift)
      c.stroke()
      c.beginPath()
      c.moveTo(cx + gripOffset, baseY)
      c.quadraticCurveTo(cx + gripOffset * 0.65, h * 0.86 - handLift, cx + 24, gripY - handLift)
      c.stroke()

      c.strokeStyle = '#c8a060'; c.lineWidth = 7; c.lineCap = 'round'
      c.beginPath()
      c.moveTo(cx, baseY - 8)
      c.quadraticCurveTo(cx + tiltOffset * 0.25, h * 0.83, s.hoopX - h * 0.07, h * 0.77)
      c.stroke()

      const gloveY = gripY - 2
      const gloveXOffset = 32
      const gloveSize = h * 0.045

      function hand(x: number, y: number, flip: 1 | -1) {
        c.save()
        c.translate(x, y)
        c.scale(flip, 1)
        const palm = c.createLinearGradient(-gloveSize * 0.5, -gloveSize * 0.25, gloveSize * 0.4, gloveSize * 0.35)
        palm.addColorStop(0, '#d4a870')
        palm.addColorStop(1, '#a86f3c')
        c.fillStyle = palm
        c.beginPath()
        c.roundRect(-gloveSize * 0.48, -gloveSize * 0.3, gloveSize * 0.9, gloveSize * 0.56, 10)
        c.fill()
        c.strokeStyle = '#8B5E30'; c.lineWidth = 1.5
        c.beginPath()
        c.roundRect(-gloveSize * 0.48, -gloveSize * 0.3, gloveSize * 0.9, gloveSize * 0.56, 10)
        c.stroke()
        c.fillStyle = '#f2c27d'
        c.beginPath()
        c.roundRect(-gloveSize * 0.2, -gloveSize * 0.42, gloveSize * 0.36, gloveSize * 0.2, 6)
        c.fill()
        c.restore()
      }

      hand(cx - gloveXOffset, gloveY, -1)
      hand(cx + gloveXOffset, gloveY, 1)
    }

    function drawTiltIndicator(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const cx = w / 2
      const iy = h * 0.155
      const barW = w * 0.38
      const barH = 22
      const ratio = Math.abs(s.tilt) / MAX_TILT

      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.beginPath(); c.roundRect(cx - barW / 2, iy, barW, barH, barH / 2); c.fill()
      const safeW = barW * 0.28
      c.fillStyle = '#2a9d2a'
      c.beginPath(); c.roundRect(cx - safeW / 2, iy, safeW, barH, barH / 2); c.fill()
      if (ratio > 0.5) {
        const dangerAlpha = (ratio - 0.5) * 2 * 0.8
        c.fillStyle = `rgba(220, 40, 20, ${dangerAlpha})`
        c.beginPath(); c.roundRect(cx - barW / 2, iy, barW * 0.2, barH, barH / 2); c.fill()
        c.beginPath(); c.roundRect(cx + barW * 0.3, iy, barW * 0.2, barH, barH / 2); c.fill()
      }
      const indX = cx + (s.tilt / MAX_TILT) * (barW / 2)
      const indColor = ratio < 0.5 ? '#fee46e' : ratio < 0.75 ? '#ffaa00' : '#ff3333'
      c.fillStyle = indColor
      c.beginPath(); c.arc(indX, iy + barH / 2, barH / 2 + 4, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke()
    }

    function drawDangerVignette(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const ratio = Math.abs(s.tilt) / MAX_TILT
      if (ratio < 0.45) return
      const alpha = Math.min((ratio - 0.45) / 0.55 * 0.55, 0.55)
      const grad = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h))
      grad.addColorStop(0, 'rgba(200, 30, 20, 0)')
      grad.addColorStop(1, `rgba(200, 30, 20, ${alpha})`)
      c.fillStyle = grad
      c.fillRect(0, 0, w, h)
    }

    function drawHUD(c: CanvasRenderingContext2D, s: GameState, w: number, h: number) {
      const pad = 12
      const meters = Math.floor(s.distance / 80)

      // Distanza
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(pad, pad, 140, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(pad, pad, 140, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'left'
      c.fillText('Distanza', pad + 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(`${meters} m`, pad + 10, pad + 48)

      // Tempo sopravvissuto (in alto a destra, informativo)
      c.fillStyle = 'rgba(61,26,9,0.92)'
      c.beginPath(); c.roundRect(w - 130 - pad, pad, 130, 52, 10); c.fill()
      c.strokeStyle = '#fee46e'; c.lineWidth = 1.5
      c.beginPath(); c.roundRect(w - 130 - pad, pad, 130, 52, 10); c.stroke()
      c.fillStyle = '#fee46e'
      c.font = `bold ${h * 0.024}px Cinzel, serif`
      c.textAlign = 'right'
      c.fillText('Sopravvissuto', w - pad - 10, pad + 20)
      c.font = `bold ${h * 0.046}px Cinzel, serif`
      c.fillStyle = '#fff'
      c.fillText(`${Math.floor(s.elapsed)}s`, w - pad - 10, pad + 48)

      // Barra tilt
      drawTiltIndicator(c, s, w, h)

      // Avviso pericolo
      const ratio = Math.abs(s.tilt) / MAX_TILT
      if (ratio > 0.65) {
        c.fillStyle = `rgba(220,30,20,${0.8 + Math.sin(Date.now() * 0.01) * 0.2})`
        c.font = `bold ${h * 0.036}px Cinzel, serif`
        c.textAlign = 'center'
        c.fillText('⚠ PERICOLO ⚠', w / 2, h - 28)
      }

      // Istruzione iniziale
      if (s.elapsed < 3) {
        c.fillStyle = 'rgba(0,0,0,0.6)'
        c.beginPath(); c.roundRect(w / 2 - 165, h - 58, 330, 38, 10); c.fill()
        c.fillStyle = '#fff'
        c.font = `${h * 0.024}px Inter, sans-serif`
        c.textAlign = 'center'
        c.fillText('Tocca ◀ sinistra / destra ▶ per bilanciare!', w / 2, h - 33)
      }

      // Flash tap
      if (s.tapFlash > 0) {
        c.fillStyle = `rgba(254,228,110,${s.tapFlash * 0.22})`
        if (s.tapDir < 0) c.fillRect(0, 0, w / 2, h)
        else c.fillRect(w / 2, 0, w / 2, h)
      }
    }

    // ---- UPDATE ----
    function update(dt: number) {
      const s = stateRef.current
      if (s.phase !== 'playing') return

      s.elapsed += dt
      const elapsed = s.elapsed

      // Difficoltà progressiva: cresce aggressivamente col tempo
      const dynamicGravity = TILT_GRAVITY + elapsed * 0.14
      // La velocità di scorrimento aumenta
      const speed = BASE_SPEED + elapsed * 18
      // La magnitudine del rumore aumenta
      const noiseMag = NOISE_MAGNITUDE + elapsed * 0.06
      // Gli intervalli di perturbazione si accorciano (minimo 0.18s)
      const noiseMaxInterval = Math.max(0.18, NOISE_MAX_INTERVAL - elapsed * 0.025)
      const noiseMinInterval = Math.max(0.1, NOISE_MIN_INTERVAL - elapsed * 0.012)
      // L'attrito diminuisce (il cerchio diventa sempre più difficile da controllare)
      const dynamicFriction = Math.max(0.955, TILT_FRICTION - elapsed * 0.00045)

      // Perturbazioni casuali
      s.tiltNoise -= dt
      if (s.tiltNoise <= 0) {
        s.tiltVelocity += (Math.random() - 0.5) * noiseMag
        s.tiltNoise = noiseMinInterval + Math.random() * (noiseMaxInterval - noiseMinInterval)
      }

      // Gravità verso il lato inclinato
      s.tiltVelocity += s.tilt * dynamicGravity * dt
      // Attrito ridotto progressivamente
      s.tiltVelocity *= Math.pow(dynamicFriction, dt * 60)
      s.tilt += s.tiltVelocity * dt

      // Caduta
      if (Math.abs(s.tilt) >= MAX_TILT) {
        s.phase = 'gameover'
        const score = Math.floor(s.distance / 80)
        integrityRef.current.end()
        setFinalScore(score)
        setIntegrityResult(integrityRef.current.validate(score))
        setPhase('gameover')
        return
      }

      s.distance += speed * dt
      s.bgOffset += speed * dt
      s.hoopAngle += speed * 0.013 * dt * 60
      s.playerRunPhase += speed * 0.011 * dt * 60

      if (s.tapFlash > 0) s.tapFlash -= dt * 5
    }

    function draw() {
      const s = stateRef.current
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawBackground(ctx, w, h, s.bgOffset)
      drawDangerVignette(ctx, s, w, h)
      drawPerspectiveTrack(ctx, w, h, s.bgOffset)
      drawPlayer(ctx, s, w, h)
      drawHoop(ctx, s, w, h)
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

      let tapX: number
      let clientX: number
      let clientY: number
      if (e instanceof TouchEvent) {
        const touch = e.changedTouches[0]
        if (!touch) return
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        const mouseEvent = e as MouseEvent
        clientX = mouseEvent.clientX
        clientY = mouseEvent.clientY
      }

      const rect = canvas.getBoundingClientRect()
      const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
      tapX = (clientX - rect.left) * scaleX
      if (!integrityRef.current.recordInput(e, { x: clientX, y: clientY })) return

      const w = canvas.width
      if (tapX < w / 2) {
        s.tiltVelocity -= TILT_CORRECTION
        s.tapDir = -1
      } else {
        s.tiltVelocity += TILT_CORRECTION
        s.tapDir = 1
      }
      s.tapFlash = 1
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
    const s = stateRef.current
    Object.assign(s, makeInitialState())
    s.phase = 'playing'
    s.hoopX = canvasRef.current!.width * 0.5
    s.tilt = (Math.random() - 0.5) * 0.18
    s.tiltVelocity = (Math.random() - 0.5) * 0.35
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
        Corsa con il Cerchio
      </h1>
      <p className="text-amber-300/80 text-xs mt-1">
        Tocca ◀ sinistra / destra ▶ per bilanciare • Diventa sempre più instabile!
      </p>
    </div>
  )

  return (
    <GamePlayShell isPlaying={isPlaying} hero={hero} minHeight={420}>
      <canvas ref={canvasRef} className="game-canvas" />

          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-6 p-6">
              <h2 className="font-medieval text-2xl text-amber-300 text-center">
                Tieni il cerchio in equilibrio!
              </h2>
              <div className="bg-palio-900/80 rounded-xl p-4 max-w-xs text-center text-sm text-amber-100 space-y-1.5 border border-amber-700/40">
                <p>◀ Tocca a sinistra per raddrizzare a sinistra</p>
                <p>▶ Tocca a destra per raddrizzare a destra</p>
                <p>⚠️ Se si inclina troppo, cade!</p>
                <p>📈 Diventa sempre più instabile col tempo!</p>
                <p>📏 Più vai lontano, più punti fai</p>
                <p>♾ Non c'è limite di tempo: sopravvivi più a lungo che puoi!</p>
              </div>
              <button onClick={startGame} className="btn-game focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Rotola!</button>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="absolute inset-0 overflow-y-auto bg-black/65">
              <div className="min-h-full flex flex-col items-center justify-center gap-4 p-6">
                <p className="font-medieval text-xl text-amber-300">Il cerchio è caduto!</p>
                <p className="text-amber-200 text-sm">Sopravvissuto per {Math.floor(stateRef.current.elapsed)}s</p>
                <p className="text-white text-4xl font-bold">
                  {finalScore} <span className="text-amber-300 text-xl">metri</span>
                </p>
                <GameScoreSubmissionPanel
                  gameId="cerchio"
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
