import { useId, useState } from 'react'

function IconCheck({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition ${
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
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition ${
        selected
          ? 'border-red-500/60 bg-red-950/40 text-red-300'
          : 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600'
      }`}
    >
      ✕
    </span>
  )
}

export default function WeekTemplate({ weekNumber, trainings = [] }) {
  const collapseId = useId()
  const [collapsed, setCollapsed] = useState(false)
  const [status, setStatus] = useState(null) // 'completed' | 'not_completed' | null

  const toggleCollapsed = () => setCollapsed((v) => !v)
  const headerClass =
    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-zinc-900/30'

  return (
    <section
      className="rounded-xl border border-zinc-800/90 bg-zinc-950/25 p-2"
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
            <span className="text-sm font-semibold text-orange-400">
              Неделя {weekNumber}
            </span>
            <span className="text-xs text-zinc-500">/ 18</span>
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
                checked={status === 'completed'}
                onChange={() => setStatus('completed')}
                className="sr-only"
              />
              <IconCheck selected={status === 'completed'} />
            </label>

            <label className="cursor-pointer">
              <input
                type="radio"
                name={`week-status-${weekNumber}`}
                checked={status === 'not_completed'}
                onChange={() => setStatus('not_completed')}
                className="sr-only"
              />
              <IconCross selected={status === 'not_completed'} />
            </label>
          </fieldset>

          <button
            type="button"
            aria-label="Сбросить выбор статуса недели"
            onClick={(e) => {
              e.stopPropagation()
              setStatus(null)
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
              status === 'completed'
                ? 'border-green-500/40 bg-green-950/25 text-green-200 hover:bg-green-950/35'
                : status === 'not_completed'
                  ? 'border-red-500/40 bg-red-950/25 text-red-200 hover:bg-red-950/35'
                  : 'border-orange-400/30 bg-orange-950/20 text-orange-300/90 hover:bg-orange-950/35'
            }`}
          >
            ↺
          </button>

          <span
            className={`inline-flex items-center justify-center rounded-lg text-zinc-400 transition ${
              collapsed ? '' : 'rotate-180'
            }`}
            style={{ transformOrigin: 'center' }}
          >
            ▾
          </span>
        </div>
      </div>

      <div
        id={collapseId}
        className={`${collapsed ? 'hidden' : 'block'} pt-2`}
      >
        {trainings.length ? (
          <ul className="list-none space-y-2 pl-0">
            {trainings.map((t, idx) => {
              const title =
                typeof t === 'string'
                  ? t
                  : t?.title ??
                    t?.name ??
                    t?.trainingTitle ??
                    t?.trainingId ??
                    `Тренировка ${idx + 1}`

              return (
                <li
                  key={typeof t === 'string' ? `${t}-${idx}` : t?.id ?? idx}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-3 text-sm text-zinc-200"
                >
                  {title}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 p-3 text-sm text-zinc-500">
            Тренировок пока нет.
          </div>
        )}
      </div>
    </section>
  )
}

