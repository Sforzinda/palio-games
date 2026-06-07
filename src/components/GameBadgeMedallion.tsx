import type { ComponentType, SVGProps } from 'react'
import {
  Award,
  BadgeCheck,
  Building2,
  Castle,
  Compass,
  Drum,
  Hammer,
  Map,
  Medal,
  MoonStar,
  Shield,
  Swords,
  Target,
  Trophy,
  Wheat,
} from 'lucide-react'
import type { UnlockedBadge } from '../lib/game-badges'

interface BadgeVisualConfig {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  background: string
  borderColor: string
  glowColor: string
}

interface GameBadgeMedallionProps {
  badge: Pick<UnlockedBadge, 'slug' | 'name' | 'icon'>
  size?: 'md' | 'lg'
}

const DEFAULT_BADGE_CONFIG: BadgeVisualConfig = {
  Icon: Award,
  background: 'linear-gradient(135deg, #fce7a8 0%, #d4a017 48%, #8c5a12 100%)',
  borderColor: '#7a2e0a',
  glowColor: 'rgba(212, 160, 23, 0.45)',
}

const BADGE_VISUALS: Record<string, BadgeVisualConfig> = {
  'contadino-novizio': {
    Icon: Wheat,
    background: 'linear-gradient(135deg, #efe29b 0%, #cfa63a 55%, #86510e 100%)',
    borderColor: '#7a4a12',
    glowColor: 'rgba(207, 166, 58, 0.42)',
  },
  'giovane-scudiero': {
    Icon: Shield,
    background: 'linear-gradient(135deg, #f6d8ab 0%, #c7782f 58%, #7f2f0d 100%)',
    borderColor: '#7a2e0a',
    glowColor: 'rgba(199, 120, 47, 0.38)',
  },
  'araldo-del-ducato': {
    Icon: Drum,
    background: 'linear-gradient(135deg, #f7d3ad 0%, #ca5c30 56%, #7d2416 100%)',
    borderColor: '#8b2d1f',
    glowColor: 'rgba(202, 92, 48, 0.38)',
  },
  'difensore-del-castello': {
    Icon: Castle,
    background: 'linear-gradient(135deg, #f1dcc0 0%, #a86f4c 55%, #5d2f1d 100%)',
    borderColor: '#6d3820',
    glowColor: 'rgba(126, 80, 43, 0.4)',
  },
  'eroe-sforzesco': {
    Icon: Swords,
    background: 'linear-gradient(135deg, #f4d7bf 0%, #b45b39 52%, #5f1815 100%)',
    borderColor: '#6b1b15',
    glowColor: 'rgba(180, 91, 57, 0.42)',
  },
  'contradaiolo-di-vigevano': {
    Icon: Building2,
    background: 'linear-gradient(135deg, #f3d9ad 0%, #b3482f 55%, #631d12 100%)',
    borderColor: '#7d2416',
    glowColor: 'rgba(179, 72, 47, 0.38)',
  },
  'ospite-del-ducato': {
    Icon: Compass,
    background: 'linear-gradient(135deg, #dbe7f8 0%, #6588bf 55%, #233e68 100%)',
    borderColor: '#23486d',
    glowColor: 'rgba(101, 136, 191, 0.36)',
  },
  'viaggiatore-del-ducato': {
    Icon: Map,
    background: 'linear-gradient(135deg, #d0f0e0 0%, #4d9f74 55%, #1e5c45 100%)',
    borderColor: '#1d6b4b',
    glowColor: 'rgba(77, 159, 116, 0.36)',
  },
  'maestro-del-melocotogno': {
    Icon: Wheat,
    background: 'linear-gradient(135deg, #e2f1c6 0%, #7db64a 55%, #3f6a20 100%)',
    borderColor: '#4e7b28',
    glowColor: 'rgba(125, 182, 74, 0.36)',
  },
  'maestro-della-carriola': {
    Icon: Hammer,
    background: 'linear-gradient(135deg, #e0d7f7 0%, #7a66b8 54%, #3a275f 100%)',
    borderColor: '#4c3484',
    glowColor: 'rgba(122, 102, 184, 0.34)',
  },
  'domatore-del-cerchio': {
    Icon: Target,
    background: 'linear-gradient(135deg, #fde2d2 0%, #db6f3e 52%, #862b16 100%)',
    borderColor: '#a0381b',
    glowColor: 'rgba(219, 111, 62, 0.36)',
  },
  'costruttore-del-bramante': {
    Icon: Medal,
    background: 'linear-gradient(135deg, #eedfcf 0%, #b1784f 52%, #6f3d1f 100%)',
    borderColor: '#834f28',
    glowColor: 'rgba(177, 120, 79, 0.38)',
  },
  'sfida-del-castello': {
    Icon: BadgeCheck,
    background: 'linear-gradient(135deg, #e7d7f8 0%, #8b5ec7 54%, #4b267d 100%)',
    borderColor: '#5e3596',
    glowColor: 'rgba(139, 94, 199, 0.38)',
  },
  'campione-del-palio': {
    Icon: Trophy,
    background: 'linear-gradient(135deg, #fff1b7 0%, #dd9f1f 50%, #8e5010 100%)',
    borderColor: '#9d6512',
    glowColor: 'rgba(221, 159, 31, 0.44)',
  },
  'trionfatore-del-palio': {
    Icon: Trophy,
    background: 'linear-gradient(135deg, #ffe6a3 0%, #d99a1b 48%, #7d3b0c 100%)',
    borderColor: '#9b5b12',
    glowColor: 'rgba(217, 154, 27, 0.46)',
  },
  'capitano-di-contrada': {
    Icon: Shield,
    background: 'linear-gradient(135deg, #daf0e3 0%, #3f9c70 52%, #14503a 100%)',
    borderColor: '#1c6a4d',
    glowColor: 'rgba(63, 156, 112, 0.4)',
  },
  'paladino-di-contrada': {
    Icon: Medal,
    background: 'linear-gradient(135deg, #d9ebff 0%, #5b8fcb 52%, #1f4270 100%)',
    borderColor: '#2f5d95',
    glowColor: 'rgba(91, 143, 203, 0.38)',
  },
  'notte-del-palio': {
    Icon: MoonStar,
    background: 'linear-gradient(135deg, #d6ddfa 0%, #5e74c5 52%, #27336c 100%)',
    borderColor: '#33418a',
    glowColor: 'rgba(94, 116, 197, 0.4)',
  },
}

const SIZE_CLASSES = {
  md: {
    wrapper: 'h-16 w-16',
    icon: 'h-7 w-7',
    accent: 'h-2.5 w-2.5',
    label: 'text-[9px]',
  },
  lg: {
    wrapper: 'h-24 w-24',
    icon: 'h-10 w-10',
    accent: 'h-3.5 w-3.5',
    label: 'text-[10px]',
  },
} as const

const isDisplayIconLabel = (value: string) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) return false
  return !trimmedValue.includes('-') && !trimmedValue.includes('_') && trimmedValue.length <= 4
}

export default function GameBadgeMedallion({
  badge,
  size = 'md',
}: GameBadgeMedallionProps) {
  const visual = BADGE_VISUALS[badge.slug] ?? DEFAULT_BADGE_CONFIG
  const { Icon } = visual
  const sizeClass = SIZE_CLASSES[size]
  const badgeLabel = isDisplayIconLabel(badge.icon) ? badge.icon : null

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${sizeClass.wrapper}`}
      style={{
        background: visual.background,
        border: `3px solid ${visual.borderColor}`,
        boxShadow: `0 0 0 2px rgba(255, 244, 214, 0.8), 0 10px 24px ${visual.glowColor}`,
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-[7%] rounded-full border border-white/45 bg-white/12" />
      <div className="absolute inset-x-[16%] top-[10%] h-[28%] rounded-full bg-white/25 blur-sm" />
      <div className={`absolute left-[16%] top-[20%] rounded-full bg-white/70 ${sizeClass.accent}`} />
      <div className={`absolute right-[16%] bottom-[22%] rounded-full bg-amber-100/80 ${sizeClass.accent}`} />
      <Icon className={`${sizeClass.icon} relative z-10 text-white drop-shadow-[0_2px_5px_rgba(47,10,9,0.45)]`} strokeWidth={2.2} />
      {badgeLabel && (
        <div className="absolute bottom-[10%] left-1/2 z-10 -translate-x-1/2 rounded-full bg-palio-950/28 px-2 py-0.5">
          <span className={`font-bold uppercase tracking-[0.24em] text-amber-50 ${sizeClass.label}`}>
            {badgeLabel}
          </span>
        </div>
      )}
    </div>
  )
}
