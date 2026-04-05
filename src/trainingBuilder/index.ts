import type { SetRow, WorkoutTemplate } from '../storage/db'
import { SCHEDULED_PROGRAM_CYCLE_KIND, db } from '../storage/db'
import { addDaysToDateKey, getDateKey, parseDateKeyLocal } from '../utils/dateKeys'

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

export function computeSetRow(
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
  const titleBase = input.cycleTitle.trim()

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
        cycleTitle: titleBase,
      })

      const trainingIds: number[] = []
      const templateIds: number[] = []

      for (let i = 0; i < input.workouts.length; i++) {
        const w = input.workouts[i]
        const hasSchedule =
          startKey != null &&
          startKey !== '' &&
          /^\d{4}-\d{2}-\d{2}$/.test(String(startKey).trim())
        const plannedDate = hasSchedule
          ? addDaysToDateKey(String(startKey).trim(), i * step)
          : ''

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

function collectSlotsForCycle(
  cycleId: number,
): Promise<
  { sourceCycleId: number; sets: SetRow[]; template: WorkoutTemplate }[]
> {
  return (async () => {
    const trainings = await db.trainingsTable
      .where('cycleId')
      .equals(cycleId)
      .toArray()
    trainings.sort(
      (a, b) =>
        (a.dayOfTheWeek ?? 0) - (b.dayOfTheWeek ?? 0) ||
        (a.trainingId ?? 0) - (b.trainingId ?? 0),
    )
    const tmplRows = await db.workoutTemplatesTable
      .where('cycleId')
      .equals(cycleId)
      .toArray()
    const out: {
      sourceCycleId: number
      sets: SetRow[]
      template: WorkoutTemplate
    }[] = []

    for (const t of trainings) {
      const tid = t.trainingId
      if (tid == null) continue
      const sets = await db.setsTable.where('trainingId').equals(tid).toArray()
      sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
      const candidates = tmplRows.filter((tm) => tm.trainingId === tid)
      const template = candidates.sort(
        (a, b) => (a.templateId ?? 0) - (b.templateId ?? 0),
      )[0]
      if (!sets.length || !template) continue
      out.push({ sourceCycleId: cycleId, sets, template })
    }
    return out
  })()
}

function* streamDatesMatchingWeekdays(
  startDateKey: string,
  allowedDow: Set<number>,
): Generator<string> {
  const parsed = parseDateKeyLocal(startDateKey)
  if (!parsed) return
  const cur = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  )
  for (;;) {
    const js = cur.getDay()
    const dow = js === 0 ? 7 : js
    if (allowedDow.has(dow)) {
      const k = getDateKey(cur)
      if (k) yield k
    }
    cur.setDate(cur.getDate() + 1)
  }
}

type CycleSlot = { sets: SetRow[]; template: WorkoutTemplate }

/**
 * Программа: циклы в заданном порядке **склеиваются по номеру тренировки**.
 * День 1 = 1-я тренировка цикла A + 1-я тренировка цикла B в **одной** тренировке
 * (все подходы подряд); день 2 = 2-я + 2-я, и т.д. Если у цикла нет k-й тренировки,
 * в этот день он не добавляется. Даты — выбранные дни недели от `startDateKey`.
 * `repeatRounds` — сколько раз повторить весь такой микро-цикл (все k).
 */
export async function createComposedProgramWithSchedule(input: {
  title: string
  /** Порядок циклов = порядок блоков в одной тренировке (грудь, затем бицепс…) */
  sourceCycleIds: number[]
  weekdays: number[]
  startDateKey: string
  repeatRounds: number
}): Promise<{ cycleId: number; trainingIds: number[] }> {
  const titleBase = input.title.trim()
  if (!titleBase) throw new Error('NO_TITLE')

  const startKey = String(input.startDateKey || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !parseDateKeyLocal(startKey)) {
    throw new Error('BAD_START_DATE')
  }

  const allowedDow = new Set(
    input.weekdays.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
  )
  if (!allowedDow.size) throw new Error('NO_WEEKDAYS')

  const rounds = Math.min(
    52,
    Math.max(1, Math.floor(Number(input.repeatRounds)) || 1),
  )

  const cycleIds = input.sourceCycleIds
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!cycleIds.length) throw new Error('NO_CYCLES')

  const cache = new Map<number, CycleSlot[]>()
  for (const cid of [...new Set(cycleIds)]) {
    const rows = await collectSlotsForCycle(cid)
    const slots: CycleSlot[] = rows.map(({ sets, template }) => ({
      sets,
      template,
    }))
    if (!slots.length) throw new Error('EMPTY_CYCLE')
    cache.set(cid, slots)
  }

  const maxK = Math.max(...cycleIds.map((cid) => cache.get(cid)!.length))
  if (maxK < 1) throw new Error('NO_TRAININGS_TO_COPY')

  const firstPart = cycleIds.map((cid) => cache.get(cid)![0]).find(Boolean)
  if (!firstPart) throw new Error('NO_TRAININGS_TO_COPY')
  const firstMg = firstPart.template.muscleGroupId

  const dateIter = streamDatesMatchingWeekdays(startKey, allowedDow)
  const nextPlannedDate = (): string => {
    const { value, done } = dateIter.next()
    if (done || !value) throw new Error('DATE_EXHAUSTED')
    return value
  }

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
        cycleKind: SCHEDULED_PROGRAM_CYCLE_KIND,
        programTitle: titleBase,
      })

      const trainingIds: number[] = []
      const createdAt = new Date().toISOString()

      for (let r = 0; r < rounds; r += 1) {
        for (let k = 0; k < maxK; k += 1) {
          const parts: CycleSlot[] = []
          for (const cid of cycleIds) {
            const row = cache.get(cid)![k]
            if (row) parts.push(row)
          }
          if (!parts.length) continue

          const plannedDate = nextPlannedDate()
          const pd = parseDateKeyLocal(plannedDate)
          const js = pd!.getDay()
          const dow = js === 0 ? 7 : js

          const trainingId = await db.trainingsTable.add({
            status: 'planned',
            cycleId,
            dayOfTheWeek: dow,
            plannedDate,
          })
          trainingIds.push(trainingId)

          let setNumber = 1
          for (const p of parts) {
            for (const s of p.sets) {
              await db.setsTable.add({
                trainingId,
                exerciseId: s.exerciseId,
                setNumber: setNumber++,
                weight: s.weight,
                reps: s.reps,
                percentageOfPM: s.percentageOfPM,
                status: 'not_completed',
              })
            }
          }

          const roundSuffix = rounds > 1 ? ` · р.${r + 1}` : ''
          const daySuffix = maxK > 1 ? ` · день ${k + 1}` : ''
          for (const p of parts) {
            await db.workoutTemplatesTable.add({
              title: `${titleBase}${roundSuffix}${daySuffix} · ${p.template.title}`,
              muscleGroupId: p.template.muscleGroupId,
              exerciseId: p.template.exerciseId,
              setsJson: p.template.setsJson,
              createdAt,
              cycleId,
              trainingId,
            })
          }
        }
      }

      return { cycleId, trainingIds }
    },
  )
}
