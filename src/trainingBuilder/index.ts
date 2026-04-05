import { addDaysToDateKey } from '../utils/dateKeys'
import { db } from '../storage/db'

export type WeightMode = 'kg' | 'percent'

export interface WorkoutTemplateSetEntry {
  weightMode: WeightMode
  weightKg: number
  percentOfPm: number
  reps: number
}

export interface CycleWorkoutPlanInput {
  muscleGroupId: number
  exerciseId: number
  sets: WorkoutTemplateSetEntry[]
  pmMaxWeightKg: number
}

export interface CreateWorkoutFromCycleFormInput {
  title: string
  muscleGroupId: number
  exerciseId: number
  sets: WorkoutTemplateSetEntry[]
  pmMaxWeightKg: number
}

function computeSetRow(
  s: WorkoutTemplateSetEntry,
  pmMax: number,
): { weight: number; percentageOfPM: number; reps: number } {
  if (s.weightMode === 'percent') {
    const weight = (pmMax * s.percentOfPm) / 100
    return { weight, percentageOfPM: s.percentOfPm, reps: s.reps }
  }
  const weight = s.weightKg
  const percentageOfPM =
    pmMax > 0 ? Math.round((weight / pmMax) * 10000) / 100 : 0
  return { weight, percentageOfPM, reps: s.reps }
}

/**
 * Один цикл, несколько тренировок (каждая со своими сетами в БД и строкой шаблона).
 */
export async function createCycleWithWorkouts(input: {
  cycleTitle: string
  workouts: CycleWorkoutPlanInput[]
  /** Даты тренировок: первая = startDateKey, далее +stepDays */
  schedule?: { startDateKey: string; stepDays?: number }
}): Promise<{
  cycleId: number
  trainingIds: number[]
  templateIds: number[]
}> {
  if (!input.workouts.length) {
    throw new Error('NO_WORKOUTS')
  }
  for (const w of input.workouts) {
    if (!w.sets.length) throw new Error('NO_SETS')
    for (const s of w.sets) {
      if (s.weightMode === 'percent' && w.pmMaxWeightKg <= 0) {
        throw new Error('PM_REQUIRED')
      }
    }
  }

  const firstMg = input.workouts[0].muscleGroupId
  const step = input.schedule?.stepDays ?? 2
  const startKey = input.schedule?.startDateKey

  return await db.transaction(
    'rw',
    [
      db.trainingCyclesTable,
      db.trainingsTable,
      db.setsTable,
      db.workoutTemplatesTable,
    ],
    async () => {
      const cycleId = await db.trainingCyclesTable.add({
        muscleGroupId: firstMg,
        status: 'planned',
      })

      const trainingIds: number[] = []
      const templateIds: number[] = []
      const titleBase = input.cycleTitle.trim()

      for (let i = 0; i < input.workouts.length; i++) {
        const w = input.workouts[i]
        const plannedDate =
          startKey != null && startKey !== ''
            ? addDaysToDateKey(startKey, i * step)
            : undefined

        const trainingId = await db.trainingsTable.add({
          status: 'planned',
          cycleId,
          dayOfTheWeek: i + 1,
          plannedDate,
        })

        const enrichedSets = w.sets.map((s) => {
          const { weight, percentageOfPM } = computeSetRow(s, w.pmMaxWeightKg)
          return {
            ...s,
            displayWeightKg: Math.round(weight * 1000) / 1000,
            displayPercentOfPm: Math.round(percentageOfPM * 100) / 100,
          }
        })

        let setNumber = 1
        for (const s of w.sets) {
          const { weight, percentageOfPM, reps } = computeSetRow(
            s,
            w.pmMaxWeightKg,
          )
          await db.setsTable.add({
            trainingId,
            exerciseId: w.exerciseId,
            setNumber: setNumber++,
            weight: Math.round(weight * 1000) / 1000,
            reps,
            percentageOfPM: Math.round(percentageOfPM * 100) / 100,
            status: 'not_completed',
          })
        }

        const templateId = await db.workoutTemplatesTable.add({
          title:
            input.workouts.length > 1
              ? `${titleBase} — трен. ${i + 1}`
              : titleBase,
          muscleGroupId: w.muscleGroupId,
          exerciseId: w.exerciseId,
          setsJson: JSON.stringify(enrichedSets),
          createdAt: new Date().toISOString(),
          cycleId,
          trainingId,
        })
        trainingIds.push(trainingId)
        templateIds.push(templateId)
      }

      return { cycleId, trainingIds, templateIds }
    },
  )
}

/** Одна тренировка в цикле — обёртка над createCycleWithWorkouts. */
export async function createWorkoutFromCycleForm(
  input: CreateWorkoutFromCycleFormInput,
): Promise<{ cycleId: number; trainingId: number; templateId: number }> {
  const r = await createCycleWithWorkouts({
    cycleTitle: input.title,
    workouts: [
      {
        muscleGroupId: input.muscleGroupId,
        exerciseId: input.exerciseId,
        sets: input.sets,
        pmMaxWeightKg: input.pmMaxWeightKg,
      },
    ],
  })
  return {
    cycleId: r.cycleId,
    trainingId: r.trainingIds[0],
    templateId: r.templateIds[0],
  }
}
