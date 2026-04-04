import { db } from './db';

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
  }
};