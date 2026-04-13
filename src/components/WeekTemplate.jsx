import { useId, useState } from 'react'

function IconCheck({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition lg:h-8 lg:w-8 lg:text-lg ${
        selected
          ? 'border-green-500/60 bg-green-950/40 text-green-300'
          : 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600'
      }`}
    >
      ✓
    </span>
  )
}

function IconCross({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition lg:h-8 lg:w-8 lg:text-lg ${
        selected
          ? 'border-red-500/60 bg-red-950/40 text-red-300'
          : 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600'
      }`}
    >
      ✕
    </span>
  )
}

export default function WeekTemplate({
  weekNumber,
  trainings = [],
  weekCompleted = false,
  weekAllDefault = false,
  onWeekMarkCompleted,
  onWeekMarkNotCompleted,
  onWeekReset,
}) {
  const collapseId = useId()
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapsed = () => setCollapsed((v) => !v)
  const headerClass =
    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-zinc-900/30 lg:gap-4 lg:p-3'

  return (
    <section
      className="rounded-xl border border-zinc-800/90 bg-zinc-950/25 p-2 lg:rounded-2xl lg:p-3"
      aria-label={`Неделя ${weekNumber}`}
    >
      <div
        className={headerClass}
        role="button"
        tabIndex={0}
        aria-controls={collapseId}
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleCollapsed()
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-orange-400 lg:text-base">
              Неделя {weekNumber}
            </span>
            <span className="text-xs text-zinc-500 lg:text-sm">/ 18</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <fieldset
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <legend className="sr-only">Статус недели</legend>

            <label className="cursor-pointer">
              <input
                type="radio"
                name={`week-status-${weekNumber}`}
                checked={weekCompleted}
                onChange={() => onWeekMarkCompleted?.()}
                className="sr-only"
              />
              <IconCheck selected={weekCompleted} />
            </label>

            <label className="cursor-pointer">
              <input
                type="radio"
                name={`week-status-${weekNumber}`}
                checked={weekAllDefault}
                onChange={() => onWeekMarkNotCompleted?.()}
                className="sr-only"
              />
              <IconCross selected={weekAllDefault} />
            </label>
          </fieldset>

          <button
            type="button"
            aria-label="Сбросить выбор статуса недели"
            onClick={(e) => {
              e.stopPropagation()
              onWeekReset?.()
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition lg:h-8 lg:w-8 ${
              weekCompleted
                ? 'border-green-500/40 bg-green-950/25 text-green-200 hover:bg-green-950/35'
                : weekAllDefault
                  ? 'border-red-500/40 bg-red-950/25 text-red-200 hover:bg-red-950/35'
                  : 'border-orange-400/30 bg-orange-950/20 text-orange-300/90 hover:bg-orange-950/35'
            }`}
          >
            ↺
          </button>

          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 text-zinc-300 transition lg:h-8 lg:w-8 lg:text-lg ${
              collapsed ? '' : 'rotate-180'
            }`}
          >
            ▾
          </span>
        </div>
      </div>

      <div
        id={collapseId}
        className={`grid pt-2 transition-all duration-300 ease-out lg:pt-3 ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          {trainings.length ? (
            <ul className="list-none space-y-2 pl-0">
              {trainings.map((t, idx) => (
                <li key={t?.id ?? t?.trainingId ?? idx} className="rounded-lg">
                  {t?.node ?? (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-3 text-sm text-zinc-200 lg:p-4 lg:text-base">
                      {t?.title ?? t?.name ?? t?.trainingTitle ?? `Тренировка ${idx + 1}`}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 p-3 text-sm text-zinc-500 lg:p-4 lg:text-base">
              Тренировок пока нет.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
