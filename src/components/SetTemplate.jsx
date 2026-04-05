import { THEME_COLORS } from '../theme'

export default function SetTemplate({
  exerciseId,
  sets,
  reps,
  weight,
  intensity,
  onClick,
}) {
  const load =
    typeof weight === 'string' &&
    (weight.includes('кг') || weight.includes('%') || weight.includes('ПМ'))
      ? weight
      : weight != null && !Number.isNaN(Number(weight))
        ? `${weight} кг`
        : intensity != null
          ? `${Math.round(Number(intensity) * 100)}%`
          : '—'

  const className = `flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border ${THEME_COLORS.chromeBorder} bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 ${
    onClick
      ? 'cursor-pointer transition hover:border-zinc-600/90 hover:bg-zinc-900/50'
      : ''
  }`

  const inner = (
    <>
      <span className="font-medium text-zinc-100">{exerciseId}</span>
      <span className="text-zinc-500">·</span>
      <span>
        {sets}×{reps}
      </span>
      <span className="text-zinc-500">·</span>
      <span className="text-zinc-300">{load}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} w-full text-left`}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}
