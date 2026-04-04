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