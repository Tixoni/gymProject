import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { db } from '../../storage/db'
import { workoutService } from '../../storage/workoutService'
import { getDateKey } from '../../utils/dateKeys'
import { createCycleWithWorkouts } from '../../trainingBuilder'
import AddPersonalMaximumModal from './AddPersonalMaximumModal'

function newRowId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
}

function defaultBulk() {
  return {
    weightMode: 'kg',
    weightKg: '',
    percentPm: '',
    reps: '',
    numSets: 3,
  }
}

function emptyWorkout() {
  return {
    id: newRowId(),
    muscleGroupId: '',
    exerciseId: '',
    bulk: defaultBulk(),
    customizeSets: false,
    sets: [],
  }
}

function newSetRowFromBulk(bulk) {
  return {
    id: newRowId(),
    weightMode: bulk.weightMode,
    weightKg: bulk.weightKg,
    percentPm: bulk.percentPm,
    reps: bulk.reps,
  }
}

function parseOneSetEntry(s) {
  const reps = Math.floor(Number(String(s.reps).replace(',', '.')))
  if (!Number.isFinite(reps) || reps < 1) {
    return { ok: false, message: 'Укажите целое число повторений ≥ 1.' }
  }
  if (s.weightMode === 'kg') {
    const w = Number(String(s.weightKg).replace(',', '.'))
    if (!Number.isFinite(w) || w <= 0) {
      return { ok: false, message: 'Укажите положительный вес (кг).' }
    }
    return {
      ok: true,
      entry: { weightMode: 'kg', weightKg: w, percentOfPm: 0, reps },
    }
  }
  const p = Number(String(s.percentPm).replace(',', '.'))
  if (!Number.isFinite(p) || p <= 0 || p > 200) {
    return { ok: false, message: 'Укажите процент от ПМ (от 0 до 200).' }
  }
  return {
    ok: true,
    entry: { weightMode: 'percent', weightKg: 0, percentOfPm: p, reps },
  }
}

function buildParsedSetsForWorkout(w) {
  if (!w.customizeSets) {
    const n = Math.floor(Number(w.bulk.numSets))
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      return { ok: false, message: 'Число подходов — от 1 до 30.' }
    }
    const one = parseOneSetEntry({
      weightMode: w.bulk.weightMode,
      weightKg: w.bulk.weightKg,
      percentPm: w.bulk.percentPm,
      reps: w.bulk.reps,
    })
    if (!one.ok) return one
    return {
      ok: true,
      parsed: Array.from({ length: n }, () => ({ ...one.entry })),
    }
  }
  if (!w.sets.length) {
    return { ok: false, message: 'Добавьте хотя бы один подход.' }
  }
  const parsed = []
  for (const s of w.sets) {
    const r = parseOneSetEntry(s)
    if (!r.ok) return r
    parsed.push(r.entry)
  }
  return { ok: true, parsed }
}

export default function CreateTrainingCycleModal({ open, onClose, onCreated }) {
  const [cycleTitle, setCycleTitle] = useState('')
  const [scheduleStartKey, setScheduleStartKey] = useState(() => getDateKey(new Date()) ?? '')
  const [workouts, setWorkouts] = useState([emptyWorkout()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pmModalOpen, setPmModalOpen] = useState(false)
  const [pmContext, setPmContext] = useState(null)

  const muscleGroups = useLiveQuery(
    () => db.muscleGroupsTable.toArray(),
    [],
  )

  const allExercises = useLiveQuery(() => db.exercisesTable.toArray(), [])

  const updateWorkout = useCallback((id, patch) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    )
  }, [])

  const patchWorkoutBulk = useCallback((id, patch) => {
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, bulk: { ...w.bulk, ...patch } } : w,
      ),
    )
  }, [])

  const updateWorkoutSet = useCallback((wid, setId, patch) => {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== wid) return w
        return {
          ...w,
          sets: w.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        }
      }),
    )
  }, [])

  const addWorkout = useCallback(() => {
    setWorkouts((prev) => [...prev, emptyWorkout()])
  }, [])

  const exercisesForGroup = useCallback(
    (muscleGroupId) => {
      const mg = Number(muscleGroupId)
      if (!mg) return []
      return (allExercises ?? []).filter((e) => e.muscleGroupId === mg)
    },
    [allExercises],
  )

  const exerciseTitle = useCallback(
    (exerciseId) => {
      const ex = (allExercises ?? []).find((e) => e.exerciseId === exerciseId)
      return ex?.title ?? 'Упражнение'
    },
    [allExercises],
  )

  useEffect(() => {
    if (!open) return
    setCycleTitle('')
    setScheduleStartKey(getDateKey(new Date()) ?? '')
    setWorkouts([emptyWorkout()])
    setError('')
    setPmModalOpen(false)
    setPmContext(null)
    setSubmitting(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !pmModalOpen) onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, pmModalOpen])

  const openPmForExercise = (exerciseId, title) => {
    if (!exerciseId) return
    setPmContext({ exerciseId, title })
    setPmModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const t = cycleTitle.trim()
    if (!t) {
      setError('Введите название цикла.')
      return
    }
    const startKey = String(scheduleStartKey || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startKey)) {
      setError('Укажите дату первой тренировки (формат ГГГГ-ММ-ДД).')
      return
    }
    if (!workouts.length) {
      setError('Добавьте хотя бы одну тренировку.')
      return
    }

    const plans = []
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i]
      const mg = Number(w.muscleGroupId)
      const ex = Number(w.exerciseId)
      if (!mg || !ex) {
        setError(`Тренировка ${i + 1}: выберите мышечную группу и упражнение.`)
        return
      }
      const built = buildParsedSetsForWorkout(w)
      if (!built.ok) {
        setError(`Тренировка ${i + 1}: ${built.message}`)
        return
      }
      const pmMax = await workoutService.getMaxPmWeightForExercise(ex)
      if (
        built.parsed.some((x) => x.weightMode === 'percent') &&
        pmMax <= 0
      ) {
        setError(
          `Тренировка ${i + 1}: для процентов от ПМ нужен рекорд по упражнению.`,
        )
        openPmForExercise(ex, exerciseTitle(ex))
        return
      }
      plans.push({
        muscleGroupId: mg,
        exerciseId: ex,
        sets: built.parsed,
        pmMaxWeightKg: pmMax,
      })
    }

    setSubmitting(true)
    try {
      const result = await createCycleWithWorkouts({
        cycleTitle: t,
        workouts: plans,
        schedule: { startDateKey: startKey, stepDays: 2 },
      })
      onCreated?.(result)
      onClose?.()
    } catch (err) {
      if (err?.message === 'PM_REQUIRED') {
        setError('Добавьте личный рекорд для упражнений с процентами от ПМ.')
        const w = workouts.find((x) => Number(x.exerciseId) > 0)
        if (w) openPmForExercise(Number(w.exerciseId), exerciseTitle(Number(w.exerciseId)))
      } else {
        setError(err?.message ?? 'Не удалось сохранить данные.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderWorkoutBlock = (w, index) => {
    const mgNum = Number(w.muscleGroupId)
    const exNum = Number(w.exerciseId)
    const exList = exercisesForGroup(w.muscleGroupId)

    const startCustomize = () => {
      const n = Math.max(
        1,
        Math.min(30, Math.floor(Number(w.bulk.numSets)) || 1),
      )
      updateWorkout(w.id, {
        customizeSets: true,
        sets: Array.from({ length: n }, () => newSetRowFromBulk(w.bulk)),
      })
    }

    const addSetRow = () => {
      const last = w.sets[w.sets.length - 1]
      const base = last ?? newSetRowFromBulk(w.bulk)
      updateWorkout(w.id, {
        sets: [
          ...w.sets,
          {
            id: newRowId(),
            weightMode: base.weightMode,
            weightKg: base.weightKg,
            percentPm: base.percentPm,
            reps: base.reps,
          },
        ],
      })
    }

    return (
      <div
        key={w.id}
        className="rounded-xl border border-zinc-700/80 bg-zinc-900/30 p-3 lg:p-4"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-orange-300/90">
          Тренировка {index + 1}
        </div>

        <label className="mt-3 block text-xs font-medium text-zinc-400 lg:text-sm">
          Мышечная группа <span className="text-red-400">*</span>
          <select
            value={w.muscleGroupId}
            onChange={(e) => {
              updateWorkout(w.id, {
                muscleGroupId: e.target.value,
                exerciseId: '',
              })
            }}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
            required
          >
            <option value="">Выберите…</option>
            {(muscleGroups ?? []).map((g) => (
              <option key={g.muscleGroupId} value={g.muscleGroupId}>
                {g.title}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-zinc-400 lg:text-sm">
          Упражнение <span className="text-red-400">*</span>
          <select
            value={w.exerciseId}
            onChange={(e) =>
              updateWorkout(w.id, { exerciseId: e.target.value })
            }
            disabled={!mgNum}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 enabled:cursor-pointer disabled:opacity-50 lg:py-3"
            required
          >
            <option value="">{mgNum ? 'Выберите…' : 'Сначала группа'}</option>
            {exList.map((ex) => (
              <option key={ex.exerciseId} value={ex.exerciseId}>
                {ex.title}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="text-sm font-semibold text-zinc-200">
            Параметры тренировки
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Вес / % от ПМ, повторения, число подходов или настройка каждого
            подхода.
          </p>

          {!w.customizeSets ? (
            <div className="mt-3 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/20 p-3">
              <label className="block text-xs font-medium text-zinc-400">
                Число подходов
                <input
                  type="number"
                  min={1}
                  max={30}
                  step={1}
                  value={w.bulk.numSets}
                  onChange={(e) =>
                    patchWorkoutBulk(w.id, { numSets: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-zinc-100"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
                    name={`bulk-wm-${w.id}`}
                    checked={w.bulk.weightMode === 'kg'}
                    onChange={() => patchWorkoutBulk(w.id, { weightMode: 'kg' })}
                  />
                  Вес, кг
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
                    name={`bulk-wm-${w.id}`}
                    checked={w.bulk.weightMode === 'percent'}
                    onChange={() => {
                      patchWorkoutBulk(w.id, { weightMode: 'percent' })
                      if (exNum) {
                        void workoutService
                          .getMaxPmWeightForExercise(exNum)
                          .then((max) => {
                            if (max <= 0) {
                              setError(
                                'Для выбранного упражнения нет ПМ. Добавьте рекорд.',
                              )
                              openPmForExercise(
                                exNum,
                                exerciseTitle(exNum),
                              )
                            }
                          })
                      }
                    }}
                  />
                  % от ПМ
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {w.bulk.weightMode === 'kg' ? (
                  <label className="block text-xs font-medium text-zinc-400">
                    Вес (кг)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={w.bulk.weightKg}
                      onChange={(e) =>
                        patchWorkoutBulk(w.id, { weightKg: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-zinc-100"
                    />
                  </label>
                ) : (
                  <label className="block text-xs font-medium text-zinc-400">
                    % от ПМ
                    <input
                      type="text"
                      inputMode="decimal"
                      value={w.bulk.percentPm}
                      onChange={(e) =>
                        patchWorkoutBulk(w.id, { percentPm: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-zinc-100"
                    />
                  </label>
                )}
                <label className="block text-xs font-medium text-zinc-400">
                  Повторения
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={w.bulk.reps}
                    onChange={(e) =>
                      patchWorkoutBulk(w.id, { reps: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-2 text-zinc-100"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={startCustomize}
                className="text-xs font-semibold text-orange-300 underline hover:text-orange-200"
              >
                Задать подходы по отдельности
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap justify-between gap-2">
                <span className="text-xs text-zinc-500">
                  Подходов: {w.sets.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateWorkout(w.id, { customizeSets: false, sets: [] })
                  }
                  className="text-xs font-semibold text-zinc-400 underline"
                >
                  К общему шаблону
                </button>
              </div>
              <ul className="list-none space-y-3 p-0">
                {w.sets.map((s, si) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-2"
                  >
                    <div className="text-[11px] text-zinc-500">
                      Подход {si + 1}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-200">
                        <input
                          type="radio"
                          name={`wm-${w.id}-${s.id}`}
                          checked={s.weightMode === 'kg'}
                          onChange={() =>
                            updateWorkoutSet(w.id, s.id, { weightMode: 'kg' })
                          }
                        />
                        кг
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-200">
                        <input
                          type="radio"
                          name={`wm-${w.id}-${s.id}`}
                          checked={s.weightMode === 'percent'}
                          onChange={() => {
                            updateWorkoutSet(w.id, s.id, {
                              weightMode: 'percent',
                            })
                            if (exNum) {
                              void workoutService
                                .getMaxPmWeightForExercise(exNum)
                                .then((max) => {
                                  if (max <= 0) {
                                    setError('Нет ПМ для этого упражнения.')
                                    openPmForExercise(
                                      exNum,
                                      exerciseTitle(exNum),
                                    )
                                  }
                                })
                            }
                          }}
                        />
                        % ПМ
                      </label>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {s.weightMode === 'kg' ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.weightKg}
                          onChange={(e) =>
                            updateWorkoutSet(w.id, s.id, {
                              weightKg: e.target.value,
                            })
                          }
                          className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-sm text-zinc-100"
                          placeholder="кг"
                        />
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.percentPm}
                          onChange={(e) =>
                            updateWorkoutSet(w.id, s.id, {
                              percentPm: e.target.value,
                            })
                          }
                          className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-sm text-zinc-100"
                          placeholder="%"
                        />
                      )}
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={s.reps}
                        onChange={(e) =>
                          updateWorkoutSet(w.id, s.id, { reps: e.target.value })
                        }
                        className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-sm text-zinc-100"
                        placeholder="повт."
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={addSetRow}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-950/30 text-xl font-light text-emerald-300 transition hover:border-emerald-400/70"
                  aria-label="Добавить подход"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!open) return null

  const showPmLink =
    Boolean(
      error &&
        pmContext?.exerciseId &&
        /ПМ|рекорд|процент/i.test(error),
    )

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center lg:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          aria-label="Закрыть"
          onClick={onClose}
        />

        <div
          className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl lg:max-w-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cycle-modal-title"
        >
          <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 lg:px-6 lg:py-5">
            <div className="text-[11px] font-semibold tracking-wide text-emerald-300/90 lg:text-xs">
              НОВЫЙ ТРЕНИРОВОЧНЫЙ ЦИКЛ
            </div>
            <h2
              id="cycle-modal-title"
              className="mt-2 text-lg font-semibold text-zinc-50 lg:text-xl"
            >
              Цикл и одна или несколько тренировок
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 lg:px-6 lg:py-5">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
                {showPmLink ? (
                  <button
                    type="button"
                    onClick={() =>
                      openPmForExercise(
                        pmContext.exerciseId,
                        pmContext.title,
                      )
                    }
                    className="mt-2 block text-xs font-semibold text-orange-300 underline"
                  >
                    Открыть окно добавления рекорда
                  </button>
                ) : null}
              </div>
            ) : null}

            <label className="block text-xs font-medium text-zinc-400 lg:text-sm">
              Название цикла <span className="text-red-400">*</span>
              <input
                type="text"
                value={cycleTitle}
                onChange={(e) => setCycleTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
                placeholder="Например, сплит сила"
                required
              />
            </label>

            <label className="mt-3 block text-xs font-medium text-zinc-400 lg:text-sm">
              Дата 1-й тренировки <span className="text-red-400">*</span>
              <input
                type="date"
                value={scheduleStartKey}
                onChange={(e) => setScheduleStartKey(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
                required
              />
              <span className="mt-1 block text-[11px] text-zinc-600">
                Следующие тренировки цикла: +2 дня, +4 дня… (для календаря)
              </span>
            </label>

            <div className="mt-5 space-y-4">
              <div className="text-sm font-semibold text-zinc-200">
                Тренировки в цикле
              </div>
              {workouts.map((w, i) => renderWorkoutBlock(w, i))}
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={addWorkout}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-950/30 text-2xl font-light text-emerald-300 transition hover:border-emerald-400/70 hover:bg-emerald-950/50"
                aria-label="Добавить тренировку"
              >
                +
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Добавить ещё одну тренировку в этот цикл
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5 lg:gap-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900/25 lg:rounded-2xl lg:py-4 lg:text-base"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting || muscleGroups === undefined}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 transition enabled:hover:opacity-95 disabled:opacity-50 lg:rounded-2xl lg:py-4 lg:text-base"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(16,185,129,0.95), rgba(249,115,22,0.9))',
                }}
              >
                {submitting ? 'Сохранение…' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AddPersonalMaximumModal
        open={pmModalOpen}
        exerciseId={pmContext?.exerciseId}
        exerciseTitle={pmContext?.title ?? 'Упражнение'}
        onClose={() => {
          setPmModalOpen(false)
          setPmContext(null)
        }}
        onSaved={() => {
          setError('')
        }}
      />
    </>
  )
}
