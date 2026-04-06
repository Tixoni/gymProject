import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../storage/db'
import { THEME_COLORS } from '../theme'
import AddBodyWeightModal from './modal/AddBodyWeightModal'
import AddPersonalMaximumModal from './modal/AddPersonalMaximumModal'

export default function StatisticsTab() {
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [pmModalOpen, setPmModalOpen] = useState(false)
  const [pmExerciseId, setPmExerciseId] = useState('')

  const exercises = useLiveQuery(() => db.exercisesTable.toArray(), [])
  const weightHistory = useLiveQuery(
    () => db.bodyWeightProviderTable.orderBy('date').reverse().toArray(),
    [],
  )
  const pmRows = useLiveQuery(
    () => db.personalMaximumsTable.orderBy('date').reverse().toArray(),
    [],
  )

  const exerciseMap = useMemo(() => {
    const map = new Map()
    for (const e of exercises ?? []) {
      if (e.exerciseId != null) map.set(e.exerciseId, e.title)
    }
    return map
  }, [exercises])

  const selectedExerciseTitle = useMemo(() => {
    const id = Number(pmExerciseId)
    if (!id) return 'Упражнение'
    return exerciseMap.get(id) ?? `Упражнение #${id}`
  }, [pmExerciseId, exerciseMap])

  const bestPmRows = useMemo(() => {
    const byExercise = new Map()
    for (const row of pmRows ?? []) {
      const prev = byExercise.get(row.exerciseId)
      if (!prev) {
        byExercise.set(row.exerciseId, row)
        continue
      }
      const betterWeight = Number(row.weight) > Number(prev.weight)
      const sameWeightMoreReps =
        Number(row.weight) === Number(prev.weight) &&
        Number(row.reps) > Number(prev.reps)
      if (betterWeight || sameWeightMoreReps) {
        byExercise.set(row.exerciseId, row)
      }
    }
    return Array.from(byExercise.values()).sort(
      (a, b) => Number(b.weight) - Number(a.weight),
    )
  }, [pmRows])

  return (
    <div className="mt-6 space-y-6 lg:mt-8">
      <section className={`rounded-2xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4`}>
        <h2 className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}>
          Вес тела
        </h2>
        <p className={`mt-1 text-sm ${THEME_COLORS.contentMuted}`}>
          Сохраняется в локальном хранилище по дате.
        </p>
        <button
          type="button"
          onClick={() => setWeightModalOpen(true)}
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} ${THEME_COLORS.accentBg} ${THEME_COLORS.accentBgHover}`}
        >
          Добавить вес
        </button>
        <ul className="mt-4 list-none space-y-2 p-0">
          {(weightHistory ?? []).slice(0, 20).map((w) => (
            <li
              key={w.date}
              className={`flex items-center justify-between rounded-lg border ${THEME_COLORS.cardSubtleBorder} ${THEME_COLORS.cardSubtleBg} px-3 py-2 text-sm`}
            >
              <span className={THEME_COLORS.labelText}>{w.date}</span>
              <span className={`font-semibold ${THEME_COLORS.valueText}`}>{w.weight} кг</span>
            </li>
          ))}
          {!weightHistory?.length ? (
            <li className={`text-sm ${THEME_COLORS.contentMuted}`}>Пока нет записей.</li>
          ) : null}
        </ul>
      </section>

      <section className={`rounded-2xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4`}>
        <h2 className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}>
          Личные рекорды (ПМ)
        </h2>
        <p className={`mt-1 text-sm ${THEME_COLORS.contentMuted}`}>
          Выберите упражнение и добавьте запись.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={pmExerciseId}
            onChange={(e) => setPmExerciseId(e.target.value)}
            className={`min-w-[220px] flex-1 rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 text-sm ${THEME_COLORS.inputText}`}
          >
            <option value="">Выберите упражнение…</option>
            {(exercises ?? []).map((e) => (
              <option key={e.exerciseId} value={e.exerciseId}>
                {e.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!pmExerciseId}
            onClick={() => setPmModalOpen(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} disabled:opacity-50 ${THEME_COLORS.accentBg} ${THEME_COLORS.accentBgHover}`}
          >
            Добавить рекорд
          </button>
        </div>
        <ul className="mt-4 list-none space-y-2 p-0">
          {bestPmRows.slice(0, 30).map((r) => (
            <li
              key={r.pmId ?? `${r.exerciseId}-${r.date}-${r.weight}`}
              className={`rounded-lg border ${THEME_COLORS.cardSubtleBorder} ${THEME_COLORS.cardSubtleBg} px-3 py-2 text-sm`}
            >
              <div className={`font-medium ${THEME_COLORS.valueText}`}>
                {exerciseMap.get(r.exerciseId) ?? `Упражнение #${r.exerciseId}`}
              </div>
              <div className={THEME_COLORS.labelText}>
                {r.date.slice(0, 10)} · {r.weight} кг × {r.reps}
              </div>
            </li>
          ))}
          {!bestPmRows.length ? (
            <li className={`text-sm ${THEME_COLORS.contentMuted}`}>Пока нет записей.</li>
          ) : null}
        </ul>
      </section>

      <AddBodyWeightModal
        open={weightModalOpen}
        onClose={() => setWeightModalOpen(false)}
        onSaved={() => {}}
      />
      <AddPersonalMaximumModal
        open={pmModalOpen}
        exerciseId={pmExerciseId ? Number(pmExerciseId) : null}
        exerciseTitle={selectedExerciseTitle}
        onClose={() => setPmModalOpen(false)}
        onSaved={() => {}}
      />
    </div>
  )
}
