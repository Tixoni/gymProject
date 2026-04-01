import { THEME_COLORS } from '../theme'

export default function SetTemplate({ exerciseId, sets, reps, weight, intensity }) {
  const load =
    weight != null && !Number.isNaN(Number(weight))
      ? `${weight} кг`
      : intensity != null
        ? `${Math.round(Number(intensity) * 100)}%`
        : '—'

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border ${THEME_COLORS.chromeBorder} bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 `}
    >
      <span className="font-medium text-zinc-100">{exerciseId}</span>
      <span className="text-zinc-500">·</span>
      <span>
        {sets}×{reps}
      </span>
      <span className="text-zinc-500">·</span>
      <span className="text-zinc-300">{load}</span>
    </div>
  )
}
