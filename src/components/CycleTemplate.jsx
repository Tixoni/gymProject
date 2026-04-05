import { THEME_COLORS } from '../theme'
import SetTemplate from './SetTemplate'

function clampWeek(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 1
  return Math.min(Math.max(1, Math.trunc(n)), 18)
}

export default function CycleTemplate({ cycle, onRemove }) {
  const cardClass = `mb-4 rounded-xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4 sm:p-5`
  const weekKey = String(clampWeek(cycle?.currentWeek ?? 1))
  const weekBlock = cycle?.weeks?.[weekKey] ?? []

  return (
    <li className={cardClass} >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={`text-lg font-semibold ${THEME_COLORS.heading}`}>
            {cycle?.muscleGroup}
          </h2>
          <div className="mt-1 text-xs text-zinc-500">
            Неделя {weekKey} из 18
          </div>
        </div>

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(cycle)}
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/70"
          >
            Удалить
          </button>
        ) : null}
      </div>

      {weekBlock?.length ? (
        <div className="mt-3 grid gap-2">
          {weekBlock.map((s, idx) => (
            <SetTemplate
              key={`${s.exerciseId}-${idx}`}
              exerciseId={s.exerciseId}
              sets={s.sets}
              reps={s.reps}
              weight={s.weight}
              intensity={s.intensity}
            />
          ))}
        </div>
      ) : (
        <div className={`mt-3 text-sm ${THEME_COLORS.contentMuted}`}>—</div>
      )}

      {cycle?.planText ? (
        <details className="group mt-4">
          <summary className="cursor-pointer text-sm text-orange-400 hover:text-orange-300">
            Таблица плана
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-left text-xs leading-relaxed text-zinc-400">
            {cycle.planText}
          </pre>
        </details>
      ) : null}
    </li>
  )
}

