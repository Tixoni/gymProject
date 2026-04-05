function formatWeightKg(weight) {
  if (weight == null || Number.isNaN(Number(weight))) return '—'
  const n = Number(weight)
  // 17.5 -> "17.5", 17 -> "17"
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function formatPercentPm(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return null
  const n = Number(pct)
  if (!Number.isFinite(n) || n <= 0) return null
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function statusBadge(status) {
  switch (status) {
    case 'completed':
      return { label: '✓', className: 'border-green-500/50 bg-green-950/35 text-green-200' }
    case 'partial':
      return { label: '½', className: 'border-orange-500/50 bg-orange-950/25 text-orange-200' }
    case 'failed':
      return { label: '✕', className: 'border-red-500/50 bg-red-950/35 text-red-200' }
    case 'skipped':
      return { label: '≫', className: 'border-zinc-700/70 bg-zinc-900/10 text-zinc-400' }
    default:
      return { label: '•', className: 'border-zinc-700/70 bg-zinc-900/10 text-zinc-500' }
  }
}

export default function SetRow({ set, onClick }) {
  const badge = statusBadge(set?.status)
  const weight = formatWeightKg(set?.weight)
  const pmStr = formatPercentPm(set?.percentageOfPM)
  const weightLine =
    pmStr != null ? `${weight} кг (${pmStr}% ПМ)` : `${weight} кг`
  const reps = set?.reps ?? '—'
  const partialSubtitle =
    set?.status === 'partial' &&
    set?.actualReps != null &&
    Number.isFinite(Number(set.actualReps)) &&
    Number.isFinite(Number(set.reps))
      ? `${set.actualReps} из ${set.reps}`
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/20 px-3 py-2 text-left transition hover:bg-zinc-900/25 lg:gap-4 lg:rounded-xl lg:px-4 lg:py-3"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-100 lg:text-base">
          {weightLine} × {reps}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500 lg:text-sm">
          {partialSubtitle ?? `Подход ${set?.setNumber ?? '—'}`}
        </div>
      </div>

      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold lg:h-9 lg:w-9 lg:text-base ${badge.className}`}
        aria-label="Статус подхода"
      >
        {badge.label}
      </span>
    </button>
  )
}

