import { useId, useMemo, useState } from 'react'
import SetEditModal from './modal/SetEditModal'
import SetRow from './SetRow'

function IconCheck({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition ${
        selected
          ? 'border-green-500/60 bg-green-950/40 text-green-300'
          : 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600'
      }`}
    >
      ✓
    </span>
  )
}

function IconCross({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition ${
        selected
          ? 'border-red-500/60 bg-red-950/40 text-red-300'
          : 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600'
      }`}
    >
      ✕
    </span>
  )
}

function groupSetsByExercise(sets = []) {
  const map = new Map()
  for (const s of sets) {
    const key = s?.exerciseId ?? 'unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  const groups = Array.from(map.entries()).map(([exerciseId, arr]) => ({
    exerciseId,
    sets: [...arr].sort((a, b) => Number(a?.setNumber ?? 0) - Number(b?.setNumber ?? 0)),
  }))
  // Стабильный порядок по exerciseId
  groups.sort((a, b) => String(a.exerciseId).localeCompare(String(b.exerciseId), 'ru'))
  return groups
}

function progressOf(sets = []) {
  const total = sets.length
  if (!total) return { total: 0, done: 0, percent: 0 }
  const done = sets.filter((s) => s?.status && s.status !== 'not_completed').length
  const percent = Math.round((done / total) * 100)
  return { total, done, percent }
}

export default function TrainingTemplate({
  training,
  sets = [],
  exercisesById = {},
  onUpdateSet,
  onMarkTrainingCompleted,
  onMarkTrainingNotCompleted,
}) {
  const collapseId = useId()
  const [collapsed, setCollapsed] = useState(false)
  const [editingSet, setEditingSet] = useState(null)

  const groups = useMemo(() => groupSetsByExercise(sets), [sets])
  const progress = useMemo(() => progressOf(sets), [sets])

  /** Все подходы не в дефолте → радио «выполнено» */
  const trainingCompleted = useMemo(
    () =>
      sets.length > 0 && sets.every((s) => s?.status && s.status !== 'not_completed'),
    [sets],
  )
  /** Все подходы в дефолте → радио «не выполнено» */
  const trainingAllDefault = useMemo(
    () => sets.length > 0 && sets.every((s) => s?.status === 'not_completed'),
    [sets],
  )

  const dayLabel = training?.dayLabel ?? training?.dayOfWeek ?? training?.day ?? '—'
  const dateLabel = training?.date ?? training?.plannedDate ?? training?.actualDate ?? ''

  return (
    <section className="rounded-xl border border-zinc-800/90 bg-zinc-950/25">
      <div
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-900/30"
        role="button"
        tabIndex={0}
        aria-controls={collapseId}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setCollapsed((v) => !v)
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-950/15 text-orange-300/90">
            🗓
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100">
              {dayLabel}
              {dateLabel ? <span className="text-zinc-500"> · {dateLabel}</span> : null}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {progress.done}/{progress.total} подходов
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <fieldset
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <legend className="sr-only">Статус тренировки</legend>
            <label className="cursor-pointer">
              <input
                type="radio"
                name={`training-status-${training?.trainingId ?? training?.id ?? 'x'}`}
                checked={trainingCompleted}
                onChange={() => onMarkTrainingCompleted?.()}
                className="sr-only"
              />
              <IconCheck selected={trainingCompleted} />
            </label>
            <label className="cursor-pointer">
              <input
                type="radio"
                name={`training-status-${training?.trainingId ?? training?.id ?? 'x'}`}
                checked={trainingAllDefault}
                onChange={() => onMarkTrainingNotCompleted?.()}
                className="sr-only"
              />
              <IconCross selected={trainingAllDefault} />
            </label>
          </fieldset>


          <span
            className={`inline-flex items-center justify-center rounded-lg text-zinc-400 transition ${
              collapsed ? '' : 'rotate-180'
            }`}
          >
            ▾
          </span>
        </div>
      </div>

      <div id={collapseId} className={collapsed ? 'hidden' : 'block'}>
        <div className="px-3 pb-3 pt-1">
          {groups.length ? (
            <ul className="list-none space-y-3 pl-0">
              {groups.map((g) => {
                const title =
                  exercisesById?.[g.exerciseId]?.title ??
                  exercisesById?.[g.exerciseId] ??
                  (g.exerciseId === 'unknown' ? 'Без упражнения' : `Упражнение ${g.exerciseId}`)

                return (
                  <li key={String(g.exerciseId)} className="space-y-2">
                    <div className="px-1 text-xs font-semibold tracking-wide text-orange-300/90">
                      {title}
                    </div>
                    <div className="space-y-2">
                      {g.sets.map((s) => (
                        <SetRow
                          key={s?.setId ?? `${s?.exerciseId}-${s?.setNumber}`}
                          set={s}
                          onClick={() => setEditingSet(s)}
                        />
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 p-3 text-sm text-zinc-500">
              Подходов пока нет.
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-3 py-3">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Прогресс</span>
            <span className="text-zinc-400">{progress.percent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-900/20">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress.percent}%`,
                background:
                  'linear-gradient(90deg, rgba(16,185,129,0.9), rgba(249,115,22,0.85))',
              }}
            />
          </div>
        </div>
      </div>

      <SetEditModal
        open={!!editingSet}
        set={editingSet}
        exerciseTitle={
          exercisesById?.[editingSet?.exerciseId]?.title ??
          exercisesById?.[editingSet?.exerciseId] ??
          (editingSet?.exerciseId ? `Упражнение ${editingSet.exerciseId}` : 'Упражнение')
        }
        onClose={() => setEditingSet(null)}
        onSave={(updated) => {
          onUpdateSet?.(updated)
          setEditingSet(null)
        }}
      />
    </section>
  )
}

