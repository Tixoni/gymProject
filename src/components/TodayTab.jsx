import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'
import { db } from '../storage/db'
import { workoutService } from '../storage/workoutService'
import InfoAccordion from './InfoAccordion'
import TrainingTemplate from './TrainingTemplate'
import WeekTemplate from './WeekTemplate'

const DEFAULT_SET_STATUS = 'not_completed'

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function isTrainingCompleted(sets) {
  return (
    sets.length > 0 &&
    sets.every((s) => s?.status && s.status !== DEFAULT_SET_STATUS)
  )
}

function isTrainingAllDefault(sets) {
  return sets.length > 0 && sets.every((s) => s?.status === DEFAULT_SET_STATUS)
}

export default function TodayTab() {
  const exercises = useLiveQuery(() => db.exercisesTable.toArray(), [])

  const exercisesById = useMemo(() => {
    const map = {}
    for (const e of exercises ?? []) {
      if (e.exerciseId != null) {
        map[e.exerciseId] = { title: e.title, imgTitle: e.imgTitle }
      }
    }
    return map
  }, [exercises])

  const trainingBlocks = useLiveQuery(
    () => workoutService.listTrainingsWithSetsForActiveCycles(),
    [],
  )

  const weeksConfig = useMemo(() => {
    const blocks = trainingBlocks ?? []
    if (!blocks.length) return []
    const trainingIds = blocks.map((b) => b.training.trainingId).filter(Boolean)
    const trainings = blocks.map((b, i) => {
      const tid = b.training.trainingId
      const dow = b.training.dayOfTheWeek
      const label =
        dow != null && dow >= 1 && dow <= 7
          ? DAY_LABELS[dow - 1]
          : DAY_LABELS[i % 7]
      return {
        trainingId: tid,
        dayLabel: label,
        date: b.training.plannedDate ?? '',
      }
    })
    return [
      {
        weekNumber: 1,
        trainingIds,
        trainings,
      },
    ]
  }, [trainingBlocks])

  const setsByTrainingId = useMemo(() => {
    const map = {}
    for (const b of trainingBlocks ?? []) {
      const tid = b.training.trainingId
      if (tid != null) map[tid] = b.sets
    }
    return map
  }, [trainingBlocks])

  const markTrainingAllSets = useCallback(async (trainingId, status) => {
    const list = setsByTrainingId[trainingId]
    if (!list?.length) return
    await Promise.all(
      list
        .filter((s) => s.setId != null)
        .map((s) => workoutService.updateSetById(s.setId, { status })),
    )
  }, [setsByTrainingId])

  const markWeekAllSets = useCallback(
    async (trainingIds, status) => {
      for (const tid of trainingIds) {
        await markTrainingAllSets(tid, status)
      }
    },
    [markTrainingAllSets],
  )

  const handleUpdateSet = useCallback(async (updated) => {
    if (updated?.setId == null) return
    const { setId, ...rest } = updated
    await workoutService.updateSetById(setId, rest)
  }, [])

  if (trainingBlocks === undefined) {
    return (
      <p className="mt-6 text-sm text-zinc-500 lg:mt-8">
        Загрузка тренировок…
      </p>
    )
  }

  if (!weeksConfig.length || !weeksConfig[0].trainingIds.length) {
    return (
      <div className="mt-6 lg:mt-8">
        <InfoAccordion title="Справка">
          Здесь отображаются тренировки из циклов в локальной базе. При первом
          запуске добавляется демо-цикл; новые программы создаются на вкладке
          «Программы».
        </InfoAccordion>
        <p className="mt-4 text-sm text-zinc-500">
          Нет тренировок с подходами. Откройте «Программы» и создайте цикл или
          дождитесь инициализации демо-данных.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-3 lg:mt-8 lg:space-y-4">
      <InfoAccordion title="Справка">
        Статус тренировки (✓/✕) следует за подходами: если все подходы не в
        дефолте — тренировка «выполнена». Неделя «выполнена», когда так все
        тренировки недели. Кнопка ✓ у недели помечает все подходы всех
        тренировок недели как выполненные. Данные сохраняются в IndexedDB.
      </InfoAccordion>
      {weeksConfig.map((w) => {
        const weekCompleted =
          w.trainingIds.length > 0 &&
          w.trainingIds.every((id) =>
            isTrainingCompleted(setsByTrainingId[id] ?? []),
          )
        const weekAllDefault =
          w.trainingIds.length > 0 &&
          w.trainingIds.every((id) =>
            isTrainingAllDefault(setsByTrainingId[id] ?? []),
          )

        return (
          <WeekTemplate
            key={w.weekNumber}
            weekNumber={w.weekNumber}
            weekCompleted={weekCompleted}
            weekAllDefault={weekAllDefault}
            onWeekMarkCompleted={() => markWeekAllSets(w.trainingIds, 'completed')}
            onWeekMarkNotCompleted={() =>
              markWeekAllSets(w.trainingIds, DEFAULT_SET_STATUS)
            }
            onWeekReset={() => markWeekAllSets(w.trainingIds, DEFAULT_SET_STATUS)}
            trainings={w.trainings.map((t) => ({
              id: t.trainingId,
              node: (
                <TrainingTemplate
                  training={t}
                  sets={setsByTrainingId[t.trainingId] ?? []}
                  exercisesById={exercisesById}
                  onUpdateSet={handleUpdateSet}
                  onMarkTrainingCompleted={() =>
                    markTrainingAllSets(t.trainingId, 'completed')
                  }
                  onMarkTrainingNotCompleted={() =>
                    markTrainingAllSets(t.trainingId, DEFAULT_SET_STATUS)
                  }
                />
              ),
            }))}
          />
        )
      })}
    </div>
  )
}
