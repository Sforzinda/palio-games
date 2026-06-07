interface GameLeaderboardBadgeProps {
  code: string
}

const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  'overall-first': {
    label: 'Primo assoluto',
    className: 'border-amber-500 bg-amber-100 text-amber-900',
  },
  'overall-second': {
    label: 'Secondo assoluto',
    className: 'border-slate-400 bg-slate-100 text-slate-800',
  },
  'overall-third': {
    label: 'Terzo assoluto',
    className: 'border-orange-400 bg-orange-100 text-orange-900',
  },
  'overall-top10': {
    label: 'Top 10',
    className: 'border-palio-300 bg-palio-50 text-palio-800',
  },
  'contrada-first': {
    label: 'Primo di contrada',
    className: 'border-emerald-500 bg-emerald-100 text-emerald-900',
  },
  'contrada-top3': {
    label: 'Podio di contrada',
    className: 'border-sky-400 bg-sky-100 text-sky-900',
  },
}

export default function GameLeaderboardBadge({ code }: GameLeaderboardBadgeProps) {
  const badge = BADGE_STYLES[code]

  if (!badge) return null

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${badge.className}`}>
      {badge.label}
    </span>
  )
}
