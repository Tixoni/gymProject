import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo, useState } from 'react'
import { workoutService } from '../storage/workoutService'
import { THEME_COLORS } from '../theme'
import CycleTemplate from './CycleTemplate'
import CreateTrainingCycleModal from './modal/CreateTrainingCycleModal'

export default function TrainingProgramsTab({
  cycles = [],
  onSeed,
  onRebuild,
  onRefresh,
  onRemoveCycle,
}) {
  const [cycleModalOpen, setCycleModalOpen] = useState(false)

  const dbTemplateCycles = useLiveQuery(
    () => workoutService.listSavedCyclesAsTemplateCycles(),
    [],
  )

  const sorted = useMemo(
    () =>
      [...cycles].sort((a, b) =>
        (a.muscleGroup || '').localeCompare(b.muscleGroup || '', 'ru'),
      ),
    [cycles],
  )

  const hasSessionTemplates = sorted.length > 0
  const hasDbCycles =
    Array.isArray(dbTemplateCycles) && dbTemplateCycles.length > 0

  const handleDeleteDbCycle = useCallback(async (cycle) => {
    const spec = cycle?.deleteSpec
    if (!spec) return
    const msg =
      spec.kind === 'cycle'
        ? 'Удалить цикл и все тренировки, подходы и шаблоны из базы?'
        : 'Удалить эту программу из базы?'
    if (!window.confirm(msg)) return
    try {
      if (spec.kind === 'cycle') {
        await workoutService.deleteCycleCascade(spec.cycleId)
      } else {
        await workoutService.deleteOrphanProgram(
          spec.templateId,
          spec.trainingId,
        )
      }
    } catch (e) {
      console.error(e)
      window.alert('Не удалось удалить.')
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

      {!hasSessionTemplates && !hasDbCycles ? (
        <p className={THEME_COLORS.contentMuted}>
          Циклов пока нет. Создайте цикл через форму или дождитесь демо-данных.
          Вкладка «Сегодня» и «Календарь» используют тренировки из IndexedDB.
        </p>
      ) : null}

      {hasDbCycles ? (
        <section className="mb-8">
          <h2
            className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
          >
            Циклы (база данных)
          </h2>
          <ul className="list-none space-y-0 p-0">
            {dbTemplateCycles.map((c) => (
              <CycleTemplate
                key={c.id}
                cycle={c}
                onRemove={() => handleDeleteDbCycle(c)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {hasSessionTemplates ? (
        <section>
          {hasDbCycles ? (
            <h2
              className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
            >
              Шаблоны в этой сессии
            </h2>
          ) : null}
          <ul className="list-none space-y-0 p-0">
            {sorted.map((c) => (
              <CycleTemplate
                key={c.id}
                cycle={c}
                onRemove={
                  onRemoveCycle
                    ? () => onRemoveCycle(c?.id)
                    : undefined
                }
              />
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
