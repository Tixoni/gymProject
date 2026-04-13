import { useId, useMemo, useState } from 'react'
import { THEME_COLORS } from '../theme'
import { getExerciseIconSrc } from '../utils/exerciseIcons'
import SetEditModal from './modal/SetEditModal'
import SetRow from './SetRow'

function IconCheck({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition lg:h-8 lg:w-8 lg:text-lg ${
        selected
          ? THEME_COLORS.statusDoneOn
          : THEME_COLORS.statusDoneOff
      }`}
    >
      ✓
    </span>
  )
}

function IconCross({ selected }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold transition lg:h-8 lg:w-8 lg:text-lg ${
        selected
          ? THEME_COLORS.statusNotDoneOn
          : THEME_COLORS.statusNotDoneOff
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
  onTrainingHeaderClick,
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
    <section className="rounded-xl border border-zinc-800/90 bg-zinc-950/25 lg:rounded-2xl">
      <div className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 lg:gap-4 lg:px-4 lg:py-3">
        <div
          role="button"
          tabIndex={0}
          aria-controls={collapseId}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg py-1 transition hover:bg-zinc-900/30"
          onClick={() => {
            if (onTrainingHeaderClick) onTrainingHeaderClick()
            else setCollapsed((v) => !v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (onTrainingHeaderClick) onTrainingHeaderClick()
              else setCollapsed((v) => !v)
            }
          }}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-950/15 text-orange-300/90 lg:h-10 lg:w-10 lg:text-xl">
            🗓
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 lg:text-base">
              {dayLabel}
              {dateLabel ? <span className="text-zinc-500"> · {dateLabel}</span> : null}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 lg:text-sm">
              {progress.done}/{progress.total} подходов
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <fieldset className="flex items-center gap-2">
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

          <button
            type="button"
            aria-controls={collapseId}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Развернуть тренировку' : 'Свернуть тренировку'}
            className="flex items-center justify-center rounded-lg px-2 py-1 transition hover:bg-zinc-900/25"
            onClick={() => setCollapsed((v) => !v)}
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 text-zinc-300 transition lg:h-8 lg:w-8 lg:text-lg ${
                collapsed ? '' : 'rotate-180'
              }`}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      <div
        id={collapseId}
        className={`grid transition-all duration-300 ease-out ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 lg:px-4 lg:pb-4 lg:pt-2">
          {groups.length ? (
            <ul className="list-none space-y-4 pl-0">
              {groups.map((g) => {
                const meta = exercisesById?.[g.exerciseId]
                const title =
                  meta?.title ??
                  (typeof meta === 'string' ? meta : null) ??
                  (g.exerciseId === 'unknown' ? 'Без упражнения' : `Упражнение ${g.exerciseId}`)
                const titleForIcon =
                  meta?.title ?? (typeof meta === 'string' ? meta : undefined)
                const iconSrc = getExerciseIconSrc(
                  typeof meta === 'object' &&
                    meta?.imgTitle != null &&
                    String(meta.imgTitle).trim() !== ''
                    ? meta.imgTitle
                    : undefined,
                  titleForIcon,
                )

                return (
                  <li key={String(g.exerciseId)}>
                    <div className=" border-b border-orange-500/25 bg-zinc-950/30 pb-3">
                      <div className="mb-3 flex items-start gap-3">
                        {iconSrc ? (
                          <img
                            src={iconSrc}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-xl bg-zinc-900/40 object-contain lg:h-24 lg:w-24 lg:rounded-2xl"
                          />
                        ) : (
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-orange-500/35 bg-zinc-900/25 text-[10px] text-orange-300/70 lg:h-[4.5rem] lg:w-[4.5rem] lg:text-xs"
                            aria-hidden
                          >
                            нет
                          </div>
                        )}
                        <div className="min-w-0 text-sm font-semibold leading-snug text-orange-100 lg:text-base">
                          {title}
                        </div>
                      </div>
                      <ul className="list-none space-y-2 pl-0">
                        {g.sets.map((s) => (
                          <li key={s?.setId ?? `${s?.exerciseId}-${s?.setNumber}`}>
                            <SetRow set={s} onClick={() => setEditingSet(s)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 p-3 text-sm text-zinc-500 lg:p-4 lg:text-base">
              Подходов пока нет.
            </div>
          )}
        </div>

          <div className="border-t border-zinc-800 px-3 py-3 lg:px-4 lg:py-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 lg:text-sm">
              <span>Прогресс</span>
              <span className="text-zinc-400">{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-900/20">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress.percent}%`,
                  background: 'rgba(249,115,22,0.85)',
                }}
              />
            </div>
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

