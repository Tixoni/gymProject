import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'
import { db } from '../storage/db'
import { workoutService } from '../storage/workoutService'
import { getDateKey, isValidCalendarDateKey } from '../utils/dateKeys'
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
  const todayKey = useMemo(() => getDateKey(new Date()) ?? '', [])

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
    const blocks = (trainingBlocks ?? []).filter((b) => {
      const d = b.training.plannedDate
      return isValidCalendarDateKey(d) && d === todayKey
    })
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
  }, [trainingBlocks, todayKey])

  const setsByTrainingId = useMemo(() => {
    const map = {}
    for (const b of trainingBlocks ?? []) {
      const tid = b.training.trainingId
      if (tid != null) map[tid] = b.sets
    }
    return map
  }, [trainingBlocks])

  const hasAnyCycleTrainings = (trainingBlocks ?? []).length > 0

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
          Здесь только тренировки с датой на сегодня. Сначала создайте цикл на
          вкладке «Программы», затем нажмите «Составить программу» и выберите дни
          недели — после этого даты появятся в календаре и здесь в нужный день.
        </InfoAccordion>
        <p className="mt-4 text-sm text-zinc-500">
          {hasAnyCycleTrainings
            ? 'На сегодня нет запланированных тренировок (проверьте календарь или составьте программу с нужными днями недели).'
            : 'Нет тренировок с подходами. Откройте «Программы» и создайте цикл или дождитесь демо-данных.'}
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
