import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo, useState } from 'react'
import { workoutService } from '../storage/workoutService'
import { THEME_COLORS } from '../theme'
import CycleTemplate from './CycleTemplate'
import ComposeProgramModal from './modal/ComposeProgramModal'
import CreateTrainingCycleModal from './modal/CreateTrainingCycleModal'
import EditCycleModal from './modal/EditCycleModal'
import EditTrainingModal from './modal/EditTrainingModal'
import PresetTemplateCyclesModal from './modal/PresetTemplateCyclesModal'

export default function TrainingProgramsTab({
  cycles = [],
  onRefresh,
  onRemoveCycle,
}) {
  const [cycleModalOpen, setCycleModalOpen] = useState(false)
  const [presetTemplatesModalOpen, setPresetTemplatesModalOpen] = useState(false)
  const [composeModalOpen, setComposeModalOpen] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState(null)
  const [editCycleCtx, setEditCycleCtx] = useState(null)

  const dbTemplateCycles = useLiveQuery(
    () => workoutService.listSavedCyclesAsTemplateCycles(),
    [],
  )

  const { scheduledPrograms, baseDbCycles } = useMemo(() => {
    const list = Array.isArray(dbTemplateCycles) ? dbTemplateCycles : []
    return {
      scheduledPrograms: list.filter((c) => c.isScheduledProgram),
      baseDbCycles: list.filter((c) => !c.isScheduledProgram),
    }
  }, [dbTemplateCycles])

  const sorted = useMemo(
    () =>
      [...cycles].sort((a, b) =>
        (a.muscleGroup || '').localeCompare(b.muscleGroup || '', 'ru'),
      ),
    [cycles],
  )

  const hasSessionTemplates = sorted.length > 0
  const hasScheduledPrograms = scheduledPrograms.length > 0
  const hasBaseDbCycles = baseDbCycles.length > 0
  const hasAnyDbListings = hasScheduledPrograms || hasBaseDbCycles

  const handleDuplicateCycle = useCallback(async (cycle) => {
    const id = cycle?.cycleId
    if (id == null) return false
    try {
      await workoutService.duplicateCycle(id)
      return true
    } catch (e) {
      console.error(e)
      window.alert(
        e?.message === 'NO_DUP_PROGRAM'
          ? 'Дублирование недоступно для составной программы.'
          : 'Не удалось дублировать цикл.',
      )
      return false
    }
  }, [])

  const handleDeleteDbCycle = useCallback(async (cycle) => {
    const spec = cycle?.deleteSpec
    if (!spec) return false
    const msg =
      spec.kind === 'cycle'
        ? 'Удалить цикл и все тренировки, подходы и шаблоны из базы?'
        : 'Удалить эту программу из базы?'
    if (!window.confirm(msg)) return false
    try {
      if (spec.kind === 'cycle') {
        await workoutService.deleteCycleCascade(spec.cycleId)
      } else {
        await workoutService.deleteOrphanProgram(
          spec.templateId,
          spec.trainingId,
        )
      }
      return true
    } catch (e) {
      console.error(e)
      window.alert('Не удалось удалить.')
      return false
    }
  }, [])

  return (
    <div className="mt-6 lg:mt-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:mb-8 lg:gap-3">
        <button
          type="button"
          onClick={() => setCycleModalOpen(true)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} ${THEME_COLORS.contentText} hover:bg-zinc-800/60`}
        >
          Новый цикл
        </button>
        <button
          type="button"
          onClick={() => setComposeModalOpen(true)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} ${THEME_COLORS.contentText} hover:bg-zinc-800/60`}
        >
          Составить программу
        </button>
        <button
          type="button"
          onClick={() => setPresetTemplatesModalOpen(true)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} ${THEME_COLORS.contentText} hover:bg-zinc-800/60`}
        >
          Добавить шаблон
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className={`rounded-xl border px-4 py-3 text-sm font-medium lg:rounded-2xl lg:px-6 lg:py-4 lg:text-base ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-zinc-200`}
        >
          Обновить
        </button>
      </div>

      {!hasSessionTemplates && !hasAnyDbListings ? (
        <p className={THEME_COLORS.contentMuted}>
          Циклов пока нет. Создайте цикл через форму или дождитесь демо-данных.
          Вкладка «Сегодня» и «Календарь» используют тренировки из IndexedDB.
        </p>
      ) : null}

      {hasScheduledPrograms ? (
        <section className="mb-8">
          <h2
            className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
          >
            Тренировочные программы
          </h2>
          <p className={`mb-3 text-sm ${THEME_COLORS.contentMuted}`}>
            Собранные через «Составить программу»: в один календарный день может
            входить несколько блоков (циклов), объединённых в одну тренировку.
          </p>
          <ul className="list-none space-y-0 p-0">
            {scheduledPrograms.map((c) => (
              <CycleTemplate
                key={c.id}
                cycle={c}
                onOpenCycleEditor={(row) =>
                  setEditCycleCtx({
                    cycleId: row.cycleId,
                    isScheduledProgram: true,
                    ref: row,
                  })
                }
                onOpenTrainingEditor={({ templateId }) =>
                  setEditTemplateId(templateId)
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {hasBaseDbCycles ? (
        <section className="mb-8">
          <h2
            className={`mb-3 text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
          >
            Циклы (база данных)
          </h2>
          <ul className="list-none space-y-0 p-0">
            {baseDbCycles.map((c) => (
              <CycleTemplate
                key={c.id}
                cycle={c}
                onOpenCycleEditor={(row) =>
                  setEditCycleCtx({
                    cycleId: row.cycleId,
                    isScheduledProgram: false,
                    ref: row,
                  })
                }
                onOpenTrainingEditor={({ templateId }) =>
                  setEditTemplateId(templateId)
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {hasSessionTemplates ? (
        <section>
          {hasAnyDbListings ? (
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

      <PresetTemplateCyclesModal
        open={presetTemplatesModalOpen}
        onClose={() => setPresetTemplatesModalOpen(false)}
        onCreated={() => {}}
      />

      <ComposeProgramModal
        open={composeModalOpen}
        onClose={() => setComposeModalOpen(false)}
        onCreated={() => {}}
      />

      <EditTrainingModal
        open={editTemplateId != null}
        templateId={editTemplateId}
        onClose={() => setEditTemplateId(null)}
        onSaved={() => {}}
      />

      <EditCycleModal
        open={editCycleCtx != null}
        cycleId={editCycleCtx?.cycleId}
        isScheduledProgram={!!editCycleCtx?.isScheduledProgram}
        onClose={() => setEditCycleCtx(null)}
        onSaved={() => {}}
        onDuplicate={
          editCycleCtx && !editCycleCtx.isScheduledProgram
            ? () => handleDuplicateCycle(editCycleCtx.ref)
            : undefined
        }
        onDelete={
          editCycleCtx
            ? () => handleDeleteDbCycle(editCycleCtx.ref)
            : undefined
        }
      />
    </div>
  )
}
