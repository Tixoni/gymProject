export default function PartialRepsStepper({ value, targetReps, onChange }) {
  const max = Math.max(0, targetReps - 1)

  const dec = () => onChange?.(Math.max(0, value - 1))
  const inc = () => onChange?.(Math.min(max, value + 1))

  return (
    <div className="rounded-2xl border border-orange-500/60 bg-zinc-950/40 p-4 lg:p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-orange-400 lg:text-xs">
        Сколько повторений сделал?
      </div>
      <div className="mt-3 flex items-stretch gap-2 lg:mt-4 lg:gap-3">
        <button
          type="button"
          onClick={dec}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/70 text-xl font-semibold text-orange-400 transition hover:bg-orange-950/30 lg:h-14 lg:w-14 lg:rounded-2xl lg:text-2xl"
          aria-label="Уменьшить"
        >
          −
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-orange-500/70 px-3 py-2 lg:rounded-2xl lg:px-4 lg:py-3">
          <div className="text-3xl font-bold leading-none text-orange-400 lg:text-4xl">
            {value}
          </div>
          <div className="mt-1 text-xs text-zinc-500 lg:text-sm">из {targetReps}</div>
        </div>
        <button
          type="button"
          onClick={inc}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/70 text-xl font-semibold text-orange-400 transition hover:bg-orange-950/30 lg:h-14 lg:w-14 lg:rounded-2xl lg:text-2xl"
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  )
}
