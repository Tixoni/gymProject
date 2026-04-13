import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../storage/db'
import { THEME_COLORS } from '../theme'
import AddBodyWeightModal from './modal/AddBodyWeightModal'
import AddPersonalMaximumModal from './modal/AddPersonalMaximumModal'
import CollapsibleStatSection from './statistics/CollapsibleStatSection'
import StatisticsHistoryChart from './statistics/StatisticsHistoryChart'

const CHART_COLORS = [
  '#fb923c',
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
]

export default function StatisticsTab() {
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [pmModalOpen, setPmModalOpen] = useState(false)
  const [pmExerciseId, setPmExerciseId] = useState('')
  const [chartSectionOpen, setChartSectionOpen] = useState(false)
  const [weightSectionOpen, setWeightSectionOpen] = useState(false)
  const [pmSectionOpen, setPmSectionOpen] = useState(false)
  const [recordsSort, setRecordsSort] = useState('highest')
  const [chartMode, setChartMode] = useState('weight')
  /** Одно упражнение для графика ПМ (id из списка или '') */
  const [chartExerciseId, setChartExerciseId] = useState('')

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

  const newestPmRows = useMemo(() => {
    return [...(pmRows ?? [])].sort((a, b) => {
      const c = String(b.date).localeCompare(String(a.date))
      if (c !== 0) return c
      return (b.pmId ?? 0) - (a.pmId ?? 0)
    })
  }, [pmRows])

  const displayedPmRows =
    recordsSort === 'highest'
      ? bestPmRows.slice(0, 30)
      : newestPmRows.slice(0, 30)

  const exercisesWithPm = useMemo(() => {
    const ids = new Set((pmRows ?? []).map((r) => r.exerciseId))
    return (exercises ?? []).filter((e) => ids.has(e.exerciseId))
  }, [exercises, pmRows])

  const chartSeries = useMemo(() => {
    if (chartMode === 'weight') {
      const sorted = [...(weightHistory ?? [])].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      )
      return [
        {
          id: 'bw',
          label: 'Вес тела, кг',
          color: CHART_COLORS[0],
          points: sorted.map((w) => ({ date: w.date, value: w.weight })),
        },
      ]
    }
    const exId = Number(chartExerciseId)
    if (!exId) return []
    const rows = (pmRows ?? [])
      .filter((r) => r.exerciseId === exId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    return [
      {
        id: `ex-${exId}`,
        label: exerciseMap.get(exId) ?? `Упр. #${exId}`,
        color: CHART_COLORS[0],
        points: rows.map((r) => ({ date: r.date, value: r.weight })),
      },
    ]
  }, [chartMode, chartExerciseId, weightHistory, pmRows, exerciseMap])

  const chartEmptyHint = useMemo(() => {
    if (chartMode === 'weight') {
      return 'Добавьте записи веса тела — график появится здесь.'
    }
    if (!chartExerciseId) {
      return 'Выберите упражнение в списке.'
    }
    return 'Для этого упражнения нет записей ПМ.'
  }, [chartMode, chartExerciseId])

  return (
    <div className="mt-6 space-y-6 lg:mt-8">
      <CollapsibleStatSection
        title="График"
        open={chartSectionOpen}
        onToggle={() => setChartSectionOpen((v) => !v)}
      >
        <p className={`text-sm ${THEME_COLORS.contentMuted}`}>
          Вес тела или динамика веса по датам записей ПМ для одного выбранного
          упражнения.
        </p>
        <div className="mt-3">
          <label
            className={`block text-xs font-medium ${THEME_COLORS.labelText}`}
          >
            Что показать
            <select
              value={chartMode}
              onChange={(e) => setChartMode(e.target.value)}
              className={`mt-1 w-full max-w-xs rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 text-sm ${THEME_COLORS.inputText}`}
            >
              <option value="weight">Вес тела</option>
              <option value="records">Рекорды (ПМ)</option>
            </select>
          </label>
        </div>

        {chartMode === 'records' ? (
          <div className="mt-3">
            <label
              className={`block text-xs font-medium ${THEME_COLORS.labelText}`}
            >
              Упражнение
              {!exercisesWithPm.length ? (
                <p className={`mt-2 text-sm font-normal ${THEME_COLORS.contentMuted}`}>
                  Пока нет рекордов — сначала добавьте ПМ в секции ниже.
                </p>
              ) : (
                <select
                  value={chartExerciseId}
                  onChange={(e) => setChartExerciseId(e.target.value)}
                  className={`mt-1 w-full max-w-md rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 text-sm ${THEME_COLORS.inputText}`}
                  aria-label="Упражнение для графика ПМ"
                >
                  <option value="">Выберите упражнение…</option>
                  {exercisesWithPm.map((e) => (
                    <option key={e.exerciseId} value={String(e.exerciseId)}>
                      {e.title}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        ) : null}

        <div className="mt-4">
          <StatisticsHistoryChart
            series={chartSeries}
            emptyHint={chartEmptyHint}
          />
        </div>

        {chartMode === 'records' && chartSeries.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-3 text-xs">
            {chartSeries.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className={THEME_COLORS.contentMuted}>{s.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CollapsibleStatSection>

      <CollapsibleStatSection
        title="Вес тела"
        open={weightSectionOpen}
        onToggle={() => setWeightSectionOpen((v) => !v)}
      >
        <p className={`text-sm ${THEME_COLORS.contentMuted}`}>
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
              <span className={`font-semibold ${THEME_COLORS.valueText}`}>
                {w.weight} кг
              </span>
            </li>
          ))}
          {!weightHistory?.length ? (
            <li className={`text-sm ${THEME_COLORS.contentMuted}`}>
              Пока нет записей.
            </li>
          ) : null}
        </ul>
      </CollapsibleStatSection>

      <CollapsibleStatSection
        title="Личные рекорды (ПМ)"
        open={pmSectionOpen}
        onToggle={() => setPmSectionOpen((v) => !v)}
      >
        <p className={`text-sm ${THEME_COLORS.contentMuted}`}>
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`text-xs ${THEME_COLORS.labelText}`}>
            В списке рекордов показывать:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRecordsSort('highest')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                recordsSort === 'highest'
                  ? `${THEME_COLORS.accentBg} ${THEME_COLORS.buttonPrimaryText}`
                  : `${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} ${THEME_COLORS.contentText}`
              }`}
            >
              Самые высокие
            </button>
            <button
              type="button"
              onClick={() => setRecordsSort('newest')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                recordsSort === 'newest'
                  ? `${THEME_COLORS.accentBg} ${THEME_COLORS.buttonPrimaryText}`
                  : `${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} ${THEME_COLORS.contentText}`
              }`}
            >
              Самые новые
            </button>
          </div>
        </div>

        <ul className="mt-4 list-none space-y-2 p-0">
          {displayedPmRows.map((r) => (
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
          {!displayedPmRows.length ? (
            <li className={`text-sm ${THEME_COLORS.contentMuted}`}>
              Пока нет записей.
            </li>
          ) : null}
        </ul>
      </CollapsibleStatSection>

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
