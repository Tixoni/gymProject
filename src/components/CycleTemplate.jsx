import { useState } from 'react'
import { ReactComponent as PencilEditIcon } from '../assets/pencil-edit-button-img.svg?react'
import { THEME_COLORS } from '../theme'
import SetTemplate from './SetTemplate'

function clampWeek(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 1
  return Math.min(Math.max(1, Math.trunc(n)), 18)
}

export default function CycleTemplate({
  cycle,
  onRemove,
  onOpenCycleEditor,
  onOpenTrainingEditor,
}) {
  const [expanded, setExpanded] = useState(true)
  const cardClass = `mb-4 rounded-xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4 sm:p-5`
  const weekKey = String(clampWeek(cycle?.currentWeek ?? 1))
  const weekBlock = cycle?.weeks?.[weekKey] ?? []
  const blockCount = weekBlock?.length ?? 0

  const cycleLabel = cycle?.cycleName ?? cycle?.muscleGroup ?? 'Цикл'
  const isProgram = !!cycle?.isScheduledProgram
  const kindLabel = isProgram ? 'Тренировочная программа:' : 'Цикл:'
  const canEditCycle =
    typeof onOpenCycleEditor === 'function' && cycle?.cycleId != null

  const openTraining = (s) => {
    if (
      typeof onOpenTrainingEditor !== 'function' ||
      s.templateId == null ||
      s.trainingId == null
    ) {
      return
    }
    onOpenTrainingEditor({
      templateId: s.templateId,
      trainingId: s.trainingId,
      cycleId: s.cycleId ?? cycle?.cycleId,
    })
  }

  return (
    <li className={cardClass}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-left">
          <div className={`text-[11px] font-medium uppercase tracking-wide ${THEME_COLORS.contentMuted}`}>
            {kindLabel}
          </div>
          <h2 className={`text-lg font-semibold leading-snug ${THEME_COLORS.heading}`}>
            {cycleLabel}
          </h2>
          <div className="mt-1 text-xs text-zinc-500">
            Неделя {weekKey} из 18
            {!expanded && blockCount > 0 ? (
              <span className="text-zinc-600"> · {blockCount} блок(ов)</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(cycle)}
              className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/70"
            >
              Удалить
            </button>
          ) : null}
          {canEditCycle ? (
            <button
              type="button"
              onClick={() => onOpenCycleEditor(cycle)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800"
              aria-label="Редактировать цикл"
            >
              <PencilEditIcon
                className="h-4 w-4 shrink-0 [&_path]:fill-current"
                aria-hidden
              />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-zinc-600/70 bg-zinc-900/50 px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80"
            aria-expanded={expanded}
            aria-label={
              expanded
                ? isProgram
                  ? 'Свернуть программу'
                  : 'Свернуть цикл'
                : isProgram
                  ? 'Развернуть программу'
                  : 'Развернуть цикл'
            }
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {expanded ? (
        <>
          {weekBlock?.length ? (
            <div className="mt-3 grid gap-2">
              {weekBlock.map((s, idx) => {
                const trainingTitle = s.trainingTitle ?? s.exerciseId
                const canEditTraining =
                  typeof onOpenTrainingEditor === 'function' &&
                  s.templateId != null &&
                  s.trainingId != null

                return (
                  <div
                    key={`${s.exerciseId}-${idx}`}
                    className="rounded-lg border border-zinc-800/60 bg-zinc-950/20 p-2"
                  >
                    {canEditTraining ? (
                      <div className="mb-2 flex items-start justify-between gap-2 px-1 py-1">
                        <div className="min-w-0">
                        <div
                          className={`text-[11px] font-medium uppercase tracking-wide ${THEME_COLORS.contentMuted}`}
                        >
                          Тренировка:
                        </div>
                        <div className="text-sm font-semibold text-zinc-100">
                          {trainingTitle}
                        </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openTraining(s)}
                          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-200 hover:bg-zinc-800"
                          aria-label="Редактировать тренировку"
                        >
                          <PencilEditIcon
                            className="h-3.5 w-3.5 shrink-0 [&_path]:fill-current"
                            aria-hidden
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="mb-2 px-1 py-1">
                        <div
                          className={`text-[11px] font-medium uppercase tracking-wide ${THEME_COLORS.contentMuted}`}
                        >
                          Тренировка:
                        </div>
                        <div className="text-sm font-semibold text-zinc-100">
                          {trainingTitle}
                        </div>
                      </div>
                    )}
                    <SetTemplate
                      exerciseId={s.exerciseId}
                      sets={s.sets}
                      reps={s.reps}
                      weight={s.weight}
                      intensity={s.intensity}
                      onClick={canEditTraining ? () => openTraining(s) : undefined}
                    />
                  </div>
                )
              })}
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
        </>
      ) : null}
    </li>
  )
}
