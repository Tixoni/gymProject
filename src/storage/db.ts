import Dexie, { type Table, type Transaction } from 'dexie'

/** Префикс названий демо-цикла (автосид для тестов) */
export const DEMO_CYCLE_TITLE_PREFIX = '[Демо]'

/** Цикл создан через «Составить программу» (все тренировки с датами) */
export const SCHEDULED_PROGRAM_CYCLE_KIND = 'scheduled_program'

export interface MuscleGroup {
  muscleGroupId?: number
  title: string
  percentage_of_fast_muscle_fibers?: number
}

export interface Exercise {
  exerciseId?: number
  title: string
  muscleGroupId: number
  /** Имя файла или подпуть внутри `src/assets/exercisesIcon` */
  imgTitle?: string
  number_of_pieces_of_equipment?: number
  initially_using_only_body_weight?: number
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
  /** @see SCHEDULED_PROGRAM_CYCLE_KIND */
  cycleKind?: string
  /** Заголовок для программы (scheduled_program) */
  programTitle?: string
  /** Название обычного цикла (для списков вместо «Цикл #id») */
  cycleTitle?: string
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
      muscleGroupsTable: '++muscleGroupId, title, percentage_of_fast_muscle_fibers',
      exercisesTable: '++exerciseId, title, muscleGroupId, number_of_pieces_of_equipment, initially_using_only_body_weight',
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

    this.version(5).stores({
      trainingCyclesTable: '++cycleId, muscleGroupId, status, cycleKind',
    })

    this.version(6).stores({
      trainingCyclesTable:
        '++cycleId, muscleGroupId, status, cycleKind, cycleTitle, programTitle',
    })

    this.version(7).stores({
      muscleGroupsTable:
        '++muscleGroupId, title, percentage_of_fast_muscle_fibers',
      exercisesTable:
        '++exerciseId, title, muscleGroupId, imgTitle, number_of_pieces_of_equipment, initially_using_only_body_weight',
      personalMaximumsTable: '++pmId, exerciseId, date, weight, reps, textComment',
      setsTable:
        '++setId, trainingId, exerciseId, setNumber, weight, percentageOfPM, reps, status',
      weekTable:
        '++weekId, weekNumber, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingsTable:
        '++trainingId, status, cycleId, plannedDate, weekId, dayOfTheWeek, tonnage, IntensityInKG, IntensityInPercentage, totalReps',
      trainingCyclesTable:
        '++cycleId, muscleGroupId, status, cycleKind, cycleTitle, programTitle',
      bodyWeightProviderTable: 'date, weight',
      workoutTemplatesTable:
        '++templateId, title, muscleGroupId, exerciseId, createdAt, cycleId, trainingId',
    })

    this.on('ready', () => {
      void seedDemoCycleIfDbEmpty()
    })

    this.on('populate', (transaction) => {
      return Promise.all([
        transaction.table('muscleGroupsTable').bulkAdd([
          { muscleGroupId: 1, title: 'Грудные мышцы', percentage_of_fast_muscle_fibers: 0.5 },
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
          { exerciseId: 1, title: 'Жим штанги лежа', muscleGroupId: 1, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 2, title: 'Жим штанги в наклоне', muscleGroupId: 1, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 3, title: 'Жим гантелей', muscleGroupId: 1, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
          { exerciseId: 4, title: 'Отжимания на брусьях', muscleGroupId: 1, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 5, title: 'Отжимания от пола', muscleGroupId: 1, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 6, title: 'Баттерфляй', muscleGroupId: 1, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 7, title: 'Тяга верхнего блока', muscleGroupId: 2, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 8, title: 'Горизонтальная тяга блока', muscleGroupId: 2, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 9, title: 'Подтягивания', muscleGroupId: 2, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 10, title: 'Тяга гантели одной рукой', muscleGroupId: 2, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 11, title: 'Тяга Ятса', muscleGroupId: 2, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 12, title: 'Шраги со штангой', muscleGroupId: 3, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 13, title: 'Шраги с гантелями', muscleGroupId: 3, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
        
          { exerciseId: 14, title: 'Жим штанги стоя', muscleGroupId: 4, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 15, title: 'Разведение гантелей в стороны', muscleGroupId: 4, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
          { exerciseId: 16, title: 'Жим гантелей сидя', muscleGroupId: 4, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
          { exerciseId: 17, title: 'Жим гири', muscleGroupId: 4, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 18, title: 'Подъем штанги на бицепс', muscleGroupId: 5, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 19, title: 'Подъем гантелей на бицепс', muscleGroupId: 5, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
          { exerciseId: 20, title: 'Молотки с гантелями', muscleGroupId: 5, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 0 },
          { exerciseId: 21, title: 'Подъем на бицепс прямым хватом', muscleGroupId: 5, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 22, title: 'Французский жим', muscleGroupId: 6, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 23, title: 'Разгибание рук в кроссовере', muscleGroupId: 6, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 24, title: 'Жим лежа узким хватом', muscleGroupId: 6, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 25, title: 'Разгибание рук с гантелью за головой', muscleGroupId: 6, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 26, title: 'Приседания со штангой', muscleGroupId: 7, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 1 },
          { exerciseId: 27, title: 'Жим ногами', muscleGroupId: 7, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 28, title: 'Выпады с гантелями', muscleGroupId: 7, number_of_pieces_of_equipment: 2, initially_using_only_body_weight: 1 },
          { exerciseId: 29, title: 'Разгибание ног в тренажере', muscleGroupId: 7, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 30, title: 'Сгибание ног в тренажере', muscleGroupId: 8, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 31, title: 'Румынская тяга', muscleGroupId: 8, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 1 },
          { exerciseId: 32, title: 'Мертвая тяга', muscleGroupId: 8, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 1 },
        
          { exerciseId: 33, title: 'Подъем на носки стоя', muscleGroupId: 9, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 1 },
          { exerciseId: 34, title: 'Подъем на носки сидя', muscleGroupId: 9, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 1 },
          { exerciseId: 35, title: 'Подъем на носки в тренажере', muscleGroupId: 9, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
        
          { exerciseId: 36, title: 'Скручивания', muscleGroupId: 10, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 37, title: 'Подъем ног в висе', muscleGroupId: 10, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 38, title: 'Планка', muscleGroupId: 10, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
          { exerciseId: 39, title: 'Хвост дракона', muscleGroupId: 10, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
        
          { exerciseId: 40, title: 'Подъём на луч штанги', muscleGroupId: 11, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 41, title: 'Подъём на луч одной рукой', muscleGroupId: 11, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 42, title: 'Кистевой эспандер', muscleGroupId: 11, number_of_pieces_of_equipment: 1, initially_using_only_body_weight: 0 },
          { exerciseId: 43, title: 'Вис на турнике с fatgrips', muscleGroupId: 11, number_of_pieces_of_equipment: 0, initially_using_only_body_weight: 1 },
        ]),
      ])
      /* Демо-цикл не в populate: таблица шаблонов подключается в v3+, в транзакции
         первичного populate не все сторы гарантированы — демо создаётся в on('ready'). */
    })
  }
}

export const db = new WorkoutAppDB()

/** Два подхода бицепс + два подхода присед — только кг, без ПМ */
async function addDemoCycleInTransaction(tx: Transaction) {
  const cycleId = await tx.table('trainingCyclesTable').add({
    muscleGroupId: 5,
    status: 'planned',
    cycleTitle: `${DEMO_CYCLE_TITLE_PREFIX} Бицепс (2 тренировки)`,
  })
  const tr1 = await tx.table('trainingsTable').add({
    status: 'planned',
    cycleId,
    dayOfTheWeek: 1,
    plannedDate: '',
  })
  const tr2 = await tx.table('trainingsTable').add({
    status: 'planned',
    cycleId,
    dayOfTheWeek: 3,
    plannedDate: '',
  })
  const plan1 = [
    {
      weightMode: 'kg',
      weightKg: 12.5,
      percentOfPm: 0,
      reps: 10,
      displayWeightKg: 12.5,
      displayPercentOfPm: 0,
    },
    {
      weightMode: 'kg',
      weightKg: 12.5,
      percentOfPm: 0,
      reps: 10,
      displayWeightKg: 12.5,
      displayPercentOfPm: 0,
    },
  ]
  const plan2 = [
    {
      weightMode: 'kg',
      weightKg: 14,
      percentOfPm: 0,
      reps: 8,
      displayWeightKg: 14,
      displayPercentOfPm: 0,
    },
    {
      weightMode: 'kg',
      weightKg: 14,
      percentOfPm: 0,
      reps: 8,
      displayWeightKg: 14,
      displayPercentOfPm: 0,
    },
  ]
  let sn = 1
  for (const _ of plan1) {
    await tx.table('setsTable').add({
      trainingId: tr1,
      exerciseId: 18,
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
      exerciseId: 18,
      setNumber: sn++,
      weight: 14,
      reps: 8,
      percentageOfPM: 0,
      status: 'not_completed',
    })
  }
  await tx.table('workoutTemplatesTable').add({
    title: `${DEMO_CYCLE_TITLE_PREFIX} Подъём штанги на бицепс`,
    muscleGroupId: 5,
    exerciseId: 18,
    setsJson: JSON.stringify(plan1),
    createdAt: new Date().toISOString(),
    cycleId,
    trainingId: tr1,
  })
  await tx.table('workoutTemplatesTable').add({
    title: `${DEMO_CYCLE_TITLE_PREFIX} Трен. 2 — тяжелее`,
    muscleGroupId: 5,
    exerciseId: 18,
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