import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo, useState } from 'react'
import { workoutService } from '../storage/workoutService'
import { THEME_COLORS } from '../theme'
import CycleTemplate from './CycleTemplate'
import CreateTrainingCycleModal from './modal/CreateTrainingCycleModal'

function formatPlanLine(set, index) {
  const reps = set?.reps
  const mode = set?.weightMode
  if (mode === 'percent') {
    const p = set?.percentOfPm
    return `Подход ${index + 1}: ${p}% ПМ × ${reps} повт.`
  }
  if (mode === 'kg') {
    const w = set?.weightKg
    return `Подход ${index + 1}: ${w} кг × ${reps} повт.`
  }
  return `Подход ${index + 1}`
}

export default function TrainingProgramsTab({
  cycles = [],
  onSeed,
  onRebuild,
  onRefresh,
  onRemoveCycle,
}) {
  const [cycleModalOpen, setCycleModalOpen] = useState(false)

  const savedPrograms = useLiveQuery(
    () => workoutService.listSavedWorkoutPrograms(),
    [],
  )

  const savedCycleGroups = useMemo(() => {
    if (!savedPrograms?.length) return []
    const map = new Map()
    for (const p of savedPrograms) {
      const key = p.cycleId != null ? `c-${p.cycleId}` : `t-${p.templateId}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          cycleId: p.cycleId,
          programs: [],
        })
      }
      map.get(key).programs.push(p)
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.programs[0]?.createdAt ?? ''
      const db_ = b.programs[0]?.createdAt ?? ''
      return db_.localeCompare(da)
    })
  }, [savedPrograms])

  const sorted = useMemo(
    () =>
      [...cycles].sort((a, b) =>
        (a.muscleGroup || '').localeCompare(b.muscleGroup || '', 'ru'),
      ),
    [cycles],
  )

  const hasSessionTemplates = sorted.length > 0
  const hasSaved = savedCycleGroups.length > 0

  const cardClass = `mb-4 rounded-xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4 sm:p-5`

  const handleDeleteSavedGroup = useCallback(async (group) => {
    const msg =
      group.programs.length > 1
        ? `Удалить цикл и все ${group.programs.length} тренировок из сохранённых? Это действие необратимо.`
        : 'Удалить эту программу и все подходы из базы? Это действие необратимо.'
    if (!window.confirm(msg)) return
    try {
      if (group.cycleId != null) {
        await workoutService.deleteCycleCascade(group.cycleId)
      } else {
        for (const p of group.programs) {
          await workoutService.deleteOrphanProgram(p.templateId, p.trainingId)
        }
      }
    } catch (e) {
      console.error(e)
      window.alert('Не удалось удалить. Подробности в консоли.')
    }
  }, [])

  return (
    <div className="mt-6 lg:mt-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:mb-8 lg:gap-3">
        <button
          type="button"
          onClick={() => setCycleModalOpen(true)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-emerald-200`}
        >
          Новый цикл (форма + локальное хранилище)
        </button>
        <button
          type="button"
          onClick={onSeed}
          className={`rounded-xl px-4 py-3 text-sm font-semibold text-white lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.accentBg} ${THEME_COLORS.accentBgHover}`}
        >
          Добавить шаблоны (грудь, бицепс, спина, ноги)
        </button>
        <button
          type="button"
          onClick={onRebuild}
          className={`rounded-xl border px-4 py-3 text-sm font-medium lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-zinc-200`}
        >
          Пересчитать циклы по рекордам
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className={`rounded-xl border px-4 py-3 text-sm font-medium lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-zinc-200`}
        >
          Обновить
        </button>
      </div>

      {!hasSessionTemplates && !hasSaved ? (
        <p className={THEME_COLORS.contentMuted}>
          Циклов пока нет. Нажмите «Новый цикл», чтобы сохранить программу в
          память устройства, или «Добавить шаблоны» для примера в текущей
          сессии (пн / ср / пт). На вкладке «Сегодня» отображаются тренировки из
          базы (включая демо при первом запуске).
        </p>
      ) : null}

      {hasSaved ? (
        <section className="mb-8">
          <h2
            className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
          >
            Сохранено на устройстве
          </h2>
          <ul className="list-none space-y-0 p-0">
            {savedCycleGroups.map((group) => (
              <li key={group.key} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className={`text-lg font-semibold ${THEME_COLORS.heading}`}>
                      {group.programs.length > 1
                        ? `Цикл #${group.cycleId ?? '—'} (${group.programs.length} трен.)`
                        : group.programs[0]?.title}
                    </h3>
                    {group.cycleId != null ? (
                      <p className="mt-0.5 text-xs text-zinc-600">
                        cycleId: {group.cycleId}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedGroup(group)}
                    className="shrink-0 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/70"
                  >
                    Удалить цикл
                  </button>
                </div>

                <ul className="mt-4 list-none space-y-4 p-0">
                  {group.programs.map((p) => (
                    <li
                      key={p.templateId}
                      className="rounded-lg border border-zinc-800/80 bg-zinc-950/25 p-3"
                    >
                      <div className="text-sm font-medium text-zinc-200">
                        {p.title}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {p.muscleGroupTitle} · {p.exerciseTitle}
                        {p.trainingId != null ? ` · трен. #${p.trainingId}` : ''}
                      </p>
                      {p.planSets?.length ? (
                        <ul className="mt-2 list-none space-y-1 p-0 text-xs text-zinc-400">
                          {p.planSets.map((row, i) => (
                            <li key={`${p.templateId}-s-${i}`}>
                              {formatPlanLine(row, i)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`mt-2 text-xs ${THEME_COLORS.contentMuted}`}>
                          Нет плана подходов в шаблоне.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasSessionTemplates ? (
        <section>
          {hasSaved ? (
            <h2
              className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
            >
              Шаблоны в этой сессии
            </h2>
          ) : null}
          <ul className="list-none space-y-0 p-0">
            {sorted.map((c) => (
              <CycleTemplate key={c.id} cycle={c} onRemove={onRemoveCycle} />
            ))}
          </ul>
        </section>
      ) : null}

      <CreateTrainingCycleModal
        open={cycleModalOpen}
        onClose={() => setCycleModalOpen(false)}
        onCreated={() => {}}
      />
    </div>
  )
}
