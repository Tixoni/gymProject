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
  const [expanded, setExpanded] = useState(false)
  const cardClass = `mb-2 rounded-xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} px-3 py-1 sm:p-5`
  const weekKey = String(clampWeek(cycle?.currentWeek ?? 1))
  const weekBlock = cycle?.weeks?.[weekKey] ?? []
  const blockCount = weekBlock?.length ?? 0

  const cycleLabel = cycle?.cycleName ?? cycle?.muscleGroup ?? 'Цикл'
  const isProgram = !!cycle?.isScheduledProgram
  const kindLabel = isProgram ? 'Тренировочная программа:' : 'Цикл:'
  const completed = cycle?.status === 'completed'
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
          <div className={`text-[10px] font-medium uppercase tracking-wide ${THEME_COLORS.contentMuted}`}>
            {kindLabel}
          </div>
          <h2 className={`text-lg font-semibold leading-snug ${THEME_COLORS.heading}`}>
            {cycleLabel}
          </h2>
          <div className="text-xs text-zinc-500">
            {completed ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Завершен
              </span>
            ) : null}
            {!expanded && blockCount > 0 ? (
              <span className="text-zinc-600"> · {blockCount} тренировок</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
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
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-zinc-200 hover:bg-zinc-800"
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
            className="flex items-center justify-center rounded-lg px-2 py-1 transition hover:bg-zinc-900/25"
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
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 text-zinc-300 transition lg:h-8 lg:w-8 lg:text-lg ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
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
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 text-left text-xs leading-relaxed text-zinc-400">
                {cycle.planText}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  )
}
