import { addDaysToDateKey, formatCommaNum, getDateKey } from '../utils/dateKeys'
import type { SetRow } from './db'
import { db } from './db'

export const workoutService = {
  
  // --- MUSCLE GROUPS ---
  async getAllMuscleGroups() {
    return await db.muscleGroupsTable.toArray();
  },

  async addMuscleGroup(title: string) {
    return await db.muscleGroupsTable.add({ title });
  },

  // --- EXERCISES ---
  async getExercisesByMuscleGroup(muscleGroupId: number) {
    return await db.exercisesTable
      .where('muscleGroupId')
      .equals(muscleGroupId)
      .toArray();
  },

  async addExercise(title: string, muscleGroupId: number, imgTitle?: string) {
    return await db.exercisesTable.add({
      title,
      muscleGroupId,
      ...(imgTitle != null && imgTitle !== '' ? { imgTitle } : {}),
    });
  },

  // --- PERSONAL MAXIMUMS (PM) ---
  async addPersonalMaximum(exerciseId: number, weight: number, reps: number, comment: string = '') {
    return await db.personalMaximumsTable.add({
      exerciseId,
      weight,
      reps,
      date: new Date().toISOString(),
      textComment: comment
    });
  },

  async getPMByExercise(exerciseId: number) {
    const rows = await db.personalMaximumsTable
      .where('exerciseId')
      .equals(exerciseId)
      .sortBy('date')
    return rows.reverse()
  },

  /** Максимальный вес среди записей ПМ по упражнению (для расчёта % от рекорда) */
  async getMaxPmWeightForExercise(exerciseId: number) {
    const rows = await db.personalMaximumsTable
      .where('exerciseId')
      .equals(exerciseId)
      .toArray()
    if (!rows.length) return 0
    return Math.max(...rows.map((r) => r.weight))
  },


  // --- BODY WEIGHT ---
  async addBodyWeight(weight: number) {
    const date = new Date().toISOString().split('T')[0]; 
    return await db.bodyWeightProviderTable.add({ date, weight });
  },
  
  async getWeightHistory() {
    return await db.bodyWeightProviderTable.orderBy('date').toArray();
  },

  // --- SETS ---
  async addSet(trainingId: number, exerciseId: number, data: {
    setNumber: number,
    weight: number,
    reps: number,
    percentageOfPM: number
  }) {
    return await db.setsTable.add({
      ...data,
      trainingId,
      exerciseId,
      status: 'not_completed' // значение по умолчанию
    });
  },

  async getSetsByTraining(trainingId: number) {
    return await db.setsTable
      .where('trainingId')
      .equals(trainingId)
      .toArray();
  },

  async updateSetById(setId: number, patch: Partial<SetRow>) {
    await db.setsTable.update(setId, patch)
  },

  /**
   * Тренировки с привязкой к циклу и их подходы — для вкладки «Сегодня».
   */
  async listTrainingsWithSetsForActiveCycles() {
    const trainings = await db.trainingsTable
      .filter((t) => t.cycleId != null && t.trainingId != null)
      .toArray()
    trainings.sort(
      (a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0),
    )
    return await Promise.all(
      trainings.map(async (t) => {
        const id = t.trainingId as number
        const sets = await db.setsTable.where('trainingId').equals(id).toArray()
        sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
        return { training: t, sets }
      }),
    )
  },

  /** Удалить цикл, все его тренировки, сеты и шаблоны с этим cycleId */
  async deleteCycleCascade(cycleId: number) {
    await db.transaction(
      'rw',
      [
        db.setsTable,
        db.trainingsTable,
        db.workoutTemplatesTable,
        db.trainingCyclesTable,
      ],
      async () => {
        const trainings = await db.trainingsTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        const tids = trainings
          .map((t) => t.trainingId)
          .filter((id): id is number => id != null)
        for (const tid of tids) {
          await db.setsTable.where('trainingId').equals(tid).delete()
        }
        for (const tid of tids) {
          await db.trainingsTable.delete(tid)
        }
        await db.workoutTemplatesTable.where('cycleId').equals(cycleId).delete()
        await db.trainingCyclesTable.delete(cycleId)
      },
    )
  },

  /** Старые шаблоны без cycleId: удалить тренировку, сеты и шаблон */
  async deleteOrphanProgram(templateId: number, trainingId: number | undefined) {
    await db.transaction(
      'rw',
      [db.setsTable, db.trainingsTable, db.workoutTemplatesTable],
      async () => {
        if (trainingId != null) {
          await db.setsTable.where('trainingId').equals(trainingId).delete()
          await db.trainingsTable.delete(trainingId)
        }
        await db.workoutTemplatesTable.delete(templateId)
      },
    )
  },

  /** Даты, на которые запланирована хотя бы одна тренировка */
  async listDateKeysWithPlannedTrainings(): Promise<string[]> {
    const trainings = await db.trainingsTable
      .filter(
        (t) =>
          t.plannedDate != null && String(t.plannedDate).trim().length > 0,
      )
      .toArray()
    return [...new Set(trainings.map((t) => String(t.plannedDate)))].sort()
  },

  /** Тренировки на конкретный день (plannedDate = YYYY-MM-DD) */
  async getTrainingsOnDateKey(dateKey: string) {
    const trainings = await db.trainingsTable
      .filter(
        (t) => t.plannedDate === dateKey && t.trainingId != null,
      )
      .toArray()
    trainings.sort((a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0))
    return await Promise.all(
      trainings.map(async (t) => {
        const id = t.trainingId as number
        const sets = await db.setsTable.where('trainingId').equals(id).toArray()
        sets.sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
        return { training: t, sets }
      }),
    )
  },

  /**
   * Циклы из IndexedDB в форме, совместимой с `CycleTemplate` (вкладка «Программы»).
   */
  async listSavedCyclesAsTemplateCycles() {
    try {
    const rows = await this.listSavedWorkoutPrograms()
    const map = new Map<
      string,
      {
        key: string
        cycleId: number | undefined
        programs: (typeof rows)[number][]
      }
    >()
    for (const p of rows) {
      const key = p.cycleId != null ? `c-${p.cycleId}` : `t-${p.templateId}`
      if (!map.has(key)) {
        map.set(key, { key, cycleId: p.cycleId, programs: [] })
      }
      map.get(key)!.programs.push(p)
    }
    const groups = Array.from(map.values()).sort((a, b) => {
      const da = a.programs[0]?.createdAt ?? ''
      const db_ = b.programs[0]?.createdAt ?? ''
      return db_.localeCompare(da)
    })

    return groups.flatMap((group) => {
      if (!group.programs.length) return []
      const cycleId = group.cycleId
      const title =
        group.programs.length > 1
          ? `Цикл #${cycleId ?? '—'} · ${group.programs.length} трен.`
          : group.programs[0]?.title ?? 'Цикл'

      const weekRows = group.programs.map((p) => {
        const planSets = (p.planSets ?? []) as Array<Record<string, unknown>>
        const n = planSets.length
        const first = planSets[0]
        let weightLabel = '—'
        let repsLabel: string | number = '—'
        if (first) {
          const kgRaw = first.displayWeightKg ?? first.weightKg
          const pctRaw = first.displayPercentOfPm ?? first.percentOfPm
          const kg = kgRaw != null ? Number(kgRaw) : NaN
          const pct = pctRaw != null ? Number(pctRaw) : NaN
          repsLabel =
            first.reps != null && first.reps !== ''
              ? String(first.reps)
              : '—'
          if (Number.isFinite(kg) && kg > 0) {
            weightLabel = `${formatCommaNum(kg)} кг`
            if (Number.isFinite(pct) && pct > 0) {
              weightLabel += ` (${formatCommaNum(pct)}% ПМ)`
            }
          } else if (first.weightMode === 'percent' && first.percentOfPm) {
            weightLabel = `${String(first.percentOfPm)}% ПМ`
          }
        }
        return {
          exerciseId: p.exerciseTitle,
          sets: n,
          reps: repsLabel,
          weight: weightLabel,
        }
      })

      const first = group.programs[0]
      const deleteSpec =
        cycleId != null
          ? ({ kind: 'cycle' as const, cycleId })
          : ({
              kind: 'orphan' as const,
              templateId: first!.templateId,
              trainingId: first!.trainingId,
            })

      return [
        {
          id: cycleId != null ? `db-${cycleId}` : `db-${group.key}`,
          cycleId,
          muscleGroup: title,
          currentWeek: 1,
          weeks: { '1': weekRows },
          planText: group.programs.map((x) => x.title).join('\n'),
          deleteSpec,
        },
      ]
    })
    } catch (e) {
      console.error('listSavedCyclesAsTemplateCycles', e)
      return []
    }
  },

  /** Проставить plannedDate тренировкам цикла, если дата ещё не задана */
  async backfillMissingPlannedDates() {
    const trainings = await db.trainingsTable
      .filter(
        (t) =>
          t.cycleId != null &&
          t.trainingId != null &&
          (t.plannedDate == null || String(t.plannedDate).trim() === ''),
      )
      .toArray()
    if (!trainings.length) return
    trainings.sort((a, b) => (a.trainingId ?? 0) - (b.trainingId ?? 0))
    const byCycle = new Map<number, typeof trainings>()
    for (const t of trainings) {
      const c = t.cycleId as number
      if (!byCycle.has(c)) byCycle.set(c, [])
      byCycle.get(c)!.push(t)
    }
    for (const [, list] of byCycle) {
      let key = getDateKey(new Date()) ?? '2020-01-01'
      for (const t of list) {
        await db.trainingsTable.update(t.trainingId as number, {
          plannedDate: key,
        })
        key = addDaysToDateKey(key, 2)
      }
    }
  },

  /** Шаблоны из IndexedDB с названиями группы и упражнения (для UI «Программы») */
  async listSavedWorkoutPrograms() {
    const [templates, muscleGroups, exercises] = await Promise.all([
      db.workoutTemplatesTable.orderBy('createdAt').reverse().toArray(),
      db.muscleGroupsTable.toArray(),
      db.exercisesTable.toArray(),
    ])
    const mgTitle = new Map(
      muscleGroups.map((g) => [g.muscleGroupId, g.title] as const),
    )
    const exTitle = new Map(
      exercises.map((e) => [e.exerciseId, e.title] as const),
    )
    return templates
      .filter((t) => t.templateId != null)
      .map((t) => {
        let planSets: unknown[] = []
        try {
          const parsed = JSON.parse(t.setsJson) as unknown
          planSets = Array.isArray(parsed) ? parsed : []
        } catch {
          planSets = []
        }
        return {
          templateId: t.templateId as number,
          cycleId: t.cycleId,
          trainingId: t.trainingId,
          title: t.title,
          muscleGroupTitle: mgTitle.get(t.muscleGroupId) ?? '—',
          exerciseTitle: exTitle.get(t.exerciseId) ?? '—',
          createdAt: t.createdAt,
          planSets,
        }
      })
  },
};