import { TRAINING_LOAD_CONSTANTS as C } from '../constants/trainingLoadConstants'
import type { CycleWorkoutPlanInput } from './index'

export type StrengthPresetId = 'strength-bench' | 'strength-squat' | 'strength-deadlift'

export interface StrengthProgramPreset {
  id: StrengthPresetId
  /** Короткий заголовок в списке */
  title: string
  /** Подзаголовок в модалке */
  description: string
  cycleTitle: string
  exerciseId: number
  muscleGroupId: number
}

/** Предзагруженные варианты «базовый тренинг на силу» (одна схема, разные упражнения). */
export const STRENGTH_PROGRAM_PRESETS: StrengthProgramPreset[] = [
  {
    id: 'strength-bench',
    title: 'Базовый тренинг на силу — жим лёжа',
    description:
      '12 тренировок: 70→87% ПМ (8→2 повт.), затем два блока с прибавкой min(4,5% ПМ, 5 кг).',
    cycleTitle: 'Сила · жим лёжа',
    exerciseId: 1,
    muscleGroupId: 1,
  },
  {
    id: 'strength-squat',
    title: 'Базовый тренинг на силу — присед',
    description: 'Та же схема нагрузки для приседаний со штангой.',
    cycleTitle: 'Сила · присед',
    exerciseId: 25,
    muscleGroupId: 7,
  },
  {
    id: 'strength-deadlift',
    title: 'Базовый тренинг на силу — становая тяга',
    description: 'Та же схема нагрузки для становой тяги.',
    cycleTitle: 'Сила · становая',
    exerciseId: 31,
    muscleGroupId: 8,
  },
]

export function getStrengthPresetById(
  id: string,
): StrengthProgramPreset | undefined {
  return STRENGTH_PROGRAM_PRESETS.find((p) => p.id === id)
}

/** Прибавка к весу: min(0,045 × ПМ, 5) кг */
export function strengthProgressBumpKg(pm: number): number {
  const raw = C.GROWTH_RATE * pm
  return Math.min(raw, 5)
}

/**
 * 12 тренировок по схеме:
 * 1–4: % ПМ; 5–8: как 1–4 + bump; 9–12: как 5–8 + bump (= +2×bump к базе).
 */
export function buildStrengthTwelveWorkouts(
  pm: number,
  muscleGroupId: number,
  exerciseId: number,
): CycleWorkoutPlanInput[] {
  const bump = strengthProgressBumpKg(pm)

  const blocks = [
    {
      pct: C.PERCENT_OF_RECORD_8_REPS,
      reps: 8,
      setCount: 4,
    },
    {
      pct: C.PERCENT_OF_RECORD_6_REPS,
      reps: 6,
      setCount: 5,
    },
    {
      pct: C.PERCENT_OF_RECORD_4_REPS,
      reps: 4,
      setCount: 6,
    },
    {
      pct: C.PERCENT_OF_RECORD_2_REPS,
      reps: 2,
      setCount: 6,
    },
  ] as const

  const workouts: CycleWorkoutPlanInput[] = []

  const pushPercentPhase = () => {
    for (const b of blocks) {
      const sets = Array.from({ length: b.setCount }, () => ({
        weightMode: 'percent' as const,
        weightKg: 0,
        percentOfPm: b.pct,
        reps: b.reps,
      }))
      workouts.push({
        muscleGroupId,
        exerciseId,
        sets,
        pmMaxWeightKg: pm,
      })
    }
  }

  const pushKgPhase = (bumpMul: number) => {
    for (const b of blocks) {
      const baseKg = (pm * b.pct) / 100
      const kg = baseKg + bumpMul * bump
      const w = Math.round(kg * 1000) / 1000
      const sets = Array.from({ length: b.setCount }, () => ({
        weightMode: 'kg' as const,
        weightKg: w,
        percentOfPm: 0,
        reps: b.reps,
      }))
      workouts.push({
        muscleGroupId,
        exerciseId,
        sets,
        pmMaxWeightKg: pm,
      })
    }
  }

  pushPercentPhase()
  pushKgPhase(1)
  pushKgPhase(2)

  return workouts
}
