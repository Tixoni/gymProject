import Dexie, { type Table, type Transaction } from 'dexie'

/** Префикс названий демо-цикла (автосид для тестов) */
export const DEMO_CYCLE_TITLE_PREFIX = '[Демо]'

export interface MuscleGroup {
  muscleGroupId?: number
  title: string
}

export interface Exercise {
  exerciseId?: number
  title: string
  muscleGroupId: number
  /** Имя файла или подпуть внутри `src/assets/exercisesIcon` */
  imgTitle?: string
}

export interface PersonalMaximum {
  pmId?: number
  exerciseId: number
  date: string
  weight: number
  reps: number
  textComment?: string
}

export interface SetRow {
  setId?: number
  trainingId: number
  exerciseId: number
  setNumber: number
  weight: number
  reps: number
  percentageOfPM: number
  status: string
  /** Фактические повторения при status === 'partial' */
  actualReps?: number
}

export interface Week {
  weekId?: number
  weekNumber: number
  tonnage?: number
  IntensityInKG?: number
  IntensityInPercentage?: number
  totalReps?: number
}

export interface Training {
  trainingId?: number
  status: string
  cycleId?: number
  plannedDate?: string
  weekId?: number
  dayOfTheWeek?: number
  tonnage?: number
  IntensityInKG?: number
  IntensityInPercentage?: number
  totalReps?: number
}

export interface TrainingCycle {
  cycleId?: number
  muscleGroupId: number
  status: string
}

export interface BodyWeightEntry {
  date: string
  weight: number
}

/** Сохранённый шаблон тренировки (план подходов) */
export interface WorkoutTemplate {
  templateId?: number
  title: string
  muscleGroupId: number
  exerciseId: number
  /** JSON: массив `{ weightMode, weightKg, percentOfPm, reps }` */
  setsJson: string
  createdAt?: string
  cycleId?: number
  trainingId?: number
}

class WorkoutAppDB extends Dexie {
  muscleGroupsTable!: Table<MuscleGroup, number>
  exercisesTable!: Table<Exercise, number>
  personalMaximumsTable!: Table<PersonalMaximum, number>
  setsTable!: Table<SetRow, number>
  weekTable!: Table<Week, number>
  trainingsTable!: Table<Training, number>
  trainingCyclesTable!: Table<TrainingCycle, number>
  bodyWeightProviderTable!: Table<BodyWeightEntry, string>
  workoutTemplatesTable!: Table<WorkoutTemplate, number>

  constructor() {
    super('WorkoutAppDB')

    this.version(1).stores({
      muscleGroupsTable: '++muscleGroupId, title',
      exercisesTable: '++exerciseId, title, muscleGroupId',
      personalMaximumsTable: '++pmId, exerciseId, date, weight, reps, textComment',
      setsTable:
        '++setId, trainingId, exerciseId, setNumber, weight, percentageOfPM, reps, status',
      weekTable: '++weekId, weekNumber, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingsTable:
        '++trainingId, status, cycleId, plannedDate, weekId, dayOfTheWeek, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingCyclesTable: '++cycleId, muscleGroupId, status',
      bodyWeightProviderTable: 'date, weight',
    })

    this.version(2).stores({
      muscleGroupsTable: '++muscleGroupId, title',
      exercisesTable: '++exerciseId, title, muscleGroupId, imgTitle',
      personalMaximumsTable: '++pmId, exerciseId, date, weight, reps, textComment',
      setsTable:
        '++setId, trainingId, exerciseId, setNumber, weight, percentageOfPM, reps, status',
      weekTable: '++weekId, weekNumber, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingsTable:
        '++trainingId, status, cycleId, plannedDate, weekId, dayOfTheWeek, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingCyclesTable: '++cycleId, muscleGroupId, status',
      bodyWeightProviderTable: 'date, weight',
    })

    this.version(3).stores({
      workoutTemplatesTable: '++templateId, title, muscleGroupId, exerciseId, createdAt',
    })

    this.version(4).stores({
      workoutTemplatesTable:
        '++templateId, title, muscleGroupId, exerciseId, createdAt, cycleId, trainingId',
    })

    this.on('ready', () => {
      void seedDemoCycleIfDbEmpty()
    })

    this.on('populate', (transaction) => {
      return Promise.all([
        transaction.table('muscleGroupsTable').bulkAdd([
        { muscleGroupId: 1, title: 'Грудные мышцы' },
        { muscleGroupId: 2, title: 'Широчайшие мышцы спины' },
        { muscleGroupId: 3, title: 'Трапециевидные мышцы' },
        { muscleGroupId: 4, title: 'Дельтовидные мышцы' },
        { muscleGroupId: 5, title: 'Бицепс' },
        { muscleGroupId: 6, title: 'Трицепс' },
        { muscleGroupId: 7, title: 'Квадрицепс' },
        { muscleGroupId: 8, title: 'Бицепс бедра' },
        { muscleGroupId: 9, title: 'Икроножные мышцы' },
        { muscleGroupId: 10, title: 'Мышцы пресса' },
        { muscleGroupId: 11, title: 'Предплечья' },
      ]),
        transaction.table('exercisesTable').bulkAdd([
        { exerciseId: 1, title: 'Жим штанги лежа', muscleGroupId: 1 },
        { exerciseId: 2, title: 'Жим гантелей лежа', muscleGroupId: 1 },
        { exerciseId: 3, title: 'Баттерфляй', muscleGroupId: 1 },
        { exerciseId: 4, title: 'Отжимания на брусьях', muscleGroupId: 1 },

        { exerciseId: 5, title: 'Тяга верхнего блока', muscleGroupId: 2 },
        { exerciseId: 6, title: 'Горизонтальная тяга', muscleGroupId: 2 },
        { exerciseId: 7, title: 'Подтягивания', muscleGroupId: 2 },
        { exerciseId: 8, title: 'Тяга гантели одной рукой', muscleGroupId: 2 },

        { exerciseId: 9, title: 'Шраги со штангой', muscleGroupId: 3 },
        { exerciseId: 10, title: 'Шраги с гантелями', muscleGroupId: 3 },

        { exerciseId: 11, title: 'Жим штанги стоя', muscleGroupId: 4 },
        { exerciseId: 12, title: 'Разведение гантелей в стороны', muscleGroupId: 4 },
        { exerciseId: 13, title: 'Жим гантелей сидя', muscleGroupId: 4 },
        { exerciseId: 14, title: 'Жим гири', muscleGroupId: 4 },

        { exerciseId: 15, title: 'Подъем штанги на бицепс', muscleGroupId: 5 },
        { exerciseId: 16, title: 'Подъем гантелей на бицепс', muscleGroupId: 5 },
        { exerciseId: 17, title: 'Молотки с гантелями', muscleGroupId: 5 },
        { exerciseId: 18, title: 'Подъем на бицепс обратным прямым хватом', muscleGroupId: 5 },

        { exerciseId: 19, title: 'Французский жим', muscleGroupId: 6 },
        { exerciseId: 20, title: 'Разгибание рук в кроссовере', muscleGroupId: 6 },
        { exerciseId: 21, title: 'Жим узким хватом', muscleGroupId: 6 },
        { exerciseId: 22, title: 'Разгибание рук с гантелью из-за головы', muscleGroupId: 6 },

        { exerciseId: 23, title: 'Приседания со штангой', muscleGroupId: 7 },
        { exerciseId: 24, title: 'Жим ногами', muscleGroupId: 7 },
        { exerciseId: 25, title: 'Выпады с гантелями', muscleGroupId: 7 },
        { exerciseId: 26, title: 'Разгибание ног в тренажере', muscleGroupId: 7 },

        { exerciseId: 27, title: 'Сгибание ног в тренажере', muscleGroupId: 8 },
        { exerciseId: 28, title: 'Румынская тяга', muscleGroupId: 8 },
        { exerciseId: 29, title: 'Мертвая тяга', muscleGroupId: 8 },

        { exerciseId: 30, title: 'Подъем на носки стоя', muscleGroupId: 9 },
        { exerciseId: 31, title: 'Подъем на носки сидя', muscleGroupId: 9 },
        { exerciseId: 32, title: 'Подъем на носки в тренажере', muscleGroupId: 9 },

        { exerciseId: 33, title: 'Скручивания', muscleGroupId: 10 },
        { exerciseId: 34, title: 'Подъем ног в висе', muscleGroupId: 10 },
        { exerciseId: 35, title: 'Планка', muscleGroupId: 10 },
        { exerciseId: 36, title: 'Хвот дракона', muscleGroupId: 10 },

        { exerciseId: 37, title: 'Подъём на луч штанги', muscleGroupId: 11 },
        { exerciseId: 38, title: 'Подъём на луч одной рукой', muscleGroupId: 11 },
        { exerciseId: 39, title: 'Кистевой эспандер', muscleGroupId: 11 },
        { exerciseId: 40, title: 'Вис на турнике с fatgrips', muscleGroupId: 11 },
        ]),
      ]).then(() => addDemoCycleInTransaction(transaction))
    })
  }
}

export const db = new WorkoutAppDB()

/** Два подхода бицепс + два подхода присед — только кг, без ПМ */
async function addDemoCycleInTransaction(tx: Transaction) {
  const cycleId = await tx.table('trainingCyclesTable').add({
    muscleGroupId: 5,
    status: 'planned',
  })
  const tr1 = await tx.table('trainingsTable').add({
    status: 'planned',
    cycleId,
    dayOfTheWeek: 1,
  })
  const tr2 = await tx.table('trainingsTable').add({
    status: 'planned',
    cycleId,
    dayOfTheWeek: 3,
  })
  const plan1 = [
    { weightMode: 'kg', weightKg: 12.5, percentOfPm: 0, reps: 10 },
    { weightMode: 'kg', weightKg: 12.5, percentOfPm: 0, reps: 10 },
  ]
  const plan2 = [
    { weightMode: 'kg', weightKg: 20, percentOfPm: 0, reps: 5 },
    { weightMode: 'kg', weightKg: 20, percentOfPm: 0, reps: 5 },
  ]
  let sn = 1
  for (const _ of plan1) {
    await tx.table('setsTable').add({
      trainingId: tr1,
      exerciseId: 15,
      setNumber: sn++,
      weight: 12.5,
      reps: 10,
      percentageOfPM: 0,
      status: 'not_completed',
    })
  }
  sn = 1
  for (const _ of plan2) {
    await tx.table('setsTable').add({
      trainingId: tr2,
      exerciseId: 23,
      setNumber: sn++,
      weight: 20,
      reps: 5,
      percentageOfPM: 0,
      status: 'not_completed',
    })
  }
  await tx.table('workoutTemplatesTable').add({
    title: `${DEMO_CYCLE_TITLE_PREFIX} Подъём штанги на бицепс`,
    muscleGroupId: 5,
    exerciseId: 15,
    setsJson: JSON.stringify(plan1),
    createdAt: new Date().toISOString(),
    cycleId,
    trainingId: tr1,
  })
  await tx.table('workoutTemplatesTable').add({
    title: `${DEMO_CYCLE_TITLE_PREFIX} Приседания со штангой`,
    muscleGroupId: 7,
    exerciseId: 23,
    setsJson: JSON.stringify(plan2),
    createdAt: new Date().toISOString(),
    cycleId,
    trainingId: tr2,
  })
}

async function seedDemoCycleIfDbEmpty() {
  try {
    const n = await db.trainingCyclesTable.count()
    if (n > 0) return
    await db.transaction(
      'rw',
      [
        db.trainingCyclesTable,
        db.trainingsTable,
        db.setsTable,
        db.workoutTemplatesTable,
      ],
      async (tx) => {
        await addDemoCycleInTransaction(tx)
      },
    )
  } catch (e) {
    console.error('seedDemoCycleIfDbEmpty', e)
  }
}
