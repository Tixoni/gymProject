/**
 * Доля от силового рекорда (1ПМ) для первого месяца цикла по неделям внутри месяца.
 * Неделя 1 → 8 повт., неделя 2 → 6, неделя 3 → 4, неделя 4 → 2.
 * Значения в процентах (целое число = % от рекорда).
 */
export const TRAINING_LOAD_CONSTANTS = {
  PERCENT_OF_RECORD_8_REPS: 70,
  PERCENT_OF_RECORD_6_REPS: 76,
  PERCENT_OF_RECORD_4_REPS: 82,
  PERCENT_OF_RECORD_2_REPS: 87,

  /** Прирост веса к «той же» неделе следующего месяца: + personalMaximum * GROWTH_RATE (кг) */
  GROWTH_RATE: 0.045,
}
