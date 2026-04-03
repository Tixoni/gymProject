import { useCallback, useMemo, useState } from 'react'
import InfoAccordion from './InfoAccordion'
import TrainingTemplate from './TrainingTemplate'
import WeekTemplate from './WeekTemplate'

const DEFAULT_SET_STATUS = 'not_completed'

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
  const exercisesById = useMemo(
    () => ({
      23: { title: 'Приседания' },
      15: { title: 'Подъем штанги на бицепс' },
    }),
    [],
  )

  const [setsByTrainingId, setSetsByTrainingId] = useState(() => ({
    101: [
      {
        setId: 1,
        trainingId: 101,
        exerciseId: 23,
        setNumber: 1,
        weight: 17.5,
        reps: 5,
        status: DEFAULT_SET_STATUS,
      },
      {
        setId: 2,
        trainingId: 101,
        exerciseId: 23,
        setNumber: 2,
        weight: 17.5,
        reps: 5,
        status: DEFAULT_SET_STATUS,
      },
      {
        setId: 3,
        trainingId: 101,
        exerciseId: 15,
        setNumber: 1,
        weight: 20,
        reps: 8,
        status: 'completed',
      },
    ],
    102: [
      {
        setId: 4,
        trainingId: 102,
        exerciseId: 23,
        setNumber: 1,
        weight: 20,
        reps: 5,
        status: 'partial',
      },
      {
        setId: 5,
        trainingId: 102,
        exerciseId: 23,
        setNumber: 2,
        weight: 20,
        reps: 5,
        status: 'failed',
      },
      {
        setId: 6,
        trainingId: 102,
        exerciseId: 15,
        setNumber: 1,
        weight: 17.5,
        reps: 10,
        status: 'skipped',
      },
    ],
  }))

  const weeksConfig = useMemo(
    () => [
      {
        weekNumber: 1,
        trainingIds: [101, 102],
        trainings: [
          { trainingId: 101, dayLabel: 'Пн', date: '02.04' },
          { trainingId: 102, dayLabel: 'Ср', date: '04.04' },
        ],
      },
    ],
    [],
  )

  const markTrainingAllSets = useCallback((trainingId, status) => {
    setSetsByTrainingId((prev) => {
      const list = prev[trainingId]
      if (!list?.length) return prev
      return {
        ...prev,
        [trainingId]: list.map((s) => ({ ...s, status })),
      }
    })
  }, [])

  const markWeekAllSets = useCallback((trainingIds, status) => {
    setSetsByTrainingId((prev) => {
      const next = { ...prev }
      for (const tid of trainingIds) {
        const list = next[tid]
        if (!list?.length) continue
        next[tid] = list.map((s) => ({ ...s, status }))
      }
      return next
    })
  }, [])

  return (
    <div className="mt-6 space-y-3">
      <InfoAccordion title="Справка">
        Статус тренировки (✓/✕) следует за подходами: если все подходы не в
        дефолте — тренировка «выполнена». Неделя «выполнена», когда так все
        тренировки недели. Кнопка ✓ у недели помечает все подходы всех
        тренировок недели как выполненные.
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
                  onUpdateSet={(updated) => {
                    setSetsByTrainingId((prev) => {
                      const next = { ...prev }
                      next[t.trainingId] = (next[t.trainingId] ?? []).map((s) =>
                        s.setId === updated.setId ? { ...s, ...updated } : s,
                      )
                      return next
                    })
                  }}
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
