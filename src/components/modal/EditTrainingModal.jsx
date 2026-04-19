import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import useBodyScrollLock from '../../hooks/useBodyScrollLock'
import { db } from '../../storage/db'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'
import AddPersonalMaximumModal from './AddPersonalMaximumModal'

function newRowId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
}

function parseOneSetEntry(s) {
  const reps = Math.floor(Number(String(s.reps).replace(',', '.')))
  if (!Number.isFinite(reps) || reps < 1) {
    return { ok: false, message: 'Укажите целое число повторений ≥ 1.' }
  }
  if (s.weightMode === 'kg') {
    const w = Number(String(s.weightKg).replace(',', '.'))
    if (!Number.isFinite(w) || w < 0) {
      return { ok: false, message: 'Укажите вес (кг) не меньше 0.' }
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

function buildParsedCustomize(setRows) {
  const parsed = []
  for (const s of setRows) {
    const r = parseOneSetEntry(s)
    if (!r.ok) return r
    parsed.push(r.entry)
  }
  return { ok: true, parsed }
}

function planToSetRows(plan) {
  return plan.map((entry) => ({
    id: newRowId(),
    weightMode: entry.weightMode === 'percent' ? 'percent' : 'kg',
    weightKg:
      entry.weightKg != null
        ? String(entry.weightKg)
        : entry.displayWeightKg != null
          ? String(entry.displayWeightKg)
          : '',
    percentPm:
      entry.percentOfPm != null
        ? String(entry.percentOfPm)
        : entry.displayPercentOfPm != null
          ? String(entry.displayPercentOfPm)
          : '',
    reps: entry.reps != null ? String(entry.reps) : '',
  }))
}

export default function EditTrainingModal({ open, templateId, onClose, onSaved }) {
  useBodyScrollLock(open)
  const [workTitle, setWorkTitle] = useState('')
  const [muscleGroupId, setMuscleGroupId] = useState('')
  const [exerciseId, setExerciseId] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [setRows, setSetRows] = useState([])
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pmModalOpen, setPmModalOpen] = useState(false)
  const [pmContext, setPmContext] = useState(null)
  const [deletingTraining, setDeletingTraining] = useState(false)

  const muscleGroups = useLiveQuery(() => db.muscleGroupsTable.toArray(), [])
  const allExercises = useLiveQuery(() => db.exercisesTable.toArray(), [])

  const exercisesForGroup = useCallback(
    (mg) => {
      const n = Number(mg)
      if (!n) return []
      return (allExercises ?? []).filter((e) => e.muscleGroupId === n)
    },
    [allExercises],
  )

  const exerciseTitle = useCallback(
    (ex) => {
      const row = (allExercises ?? []).find((e) => e.exerciseId === ex)
      return row?.title ?? 'Упражнение'
    },
    [allExercises],
  )

  useEffect(() => {
    if (!open || templateId == null) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    void (async () => {
      try {
        const snap = await workoutService.getTrainingEditSnapshot(templateId)
        if (cancelled) return
        if (!snap?.template) {
          setLoadError('Не найдено в базе.')
          setSetRows([])
          return
        }
        const { template, sets } = snap
        setWorkTitle(template.title ?? '')
        setMuscleGroupId(String(template.muscleGroupId ?? ''))
        setExerciseId(String(template.exerciseId ?? ''))
        setDayOfWeek(
          snap?.training?.dayOfTheWeek != null
            ? String(snap.training.dayOfTheWeek)
            : '',
        )

        let plan = []
        try {
          const p = JSON.parse(template.setsJson)
          if (Array.isArray(p) && p.length) plan = p
        } catch {
          plan = []
        }
        if (!plan.length && sets.length) {
          plan = sets.map((s) => ({
            weightMode: s.percentageOfPM > 0 ? 'percent' : 'kg',
            weightKg: s.weight,
            percentOfPm: s.percentageOfPM,
            reps: s.reps,
          }))
        }
        setSetRows(plan.length ? planToSetRows(plan) : [])
      } catch (e) {
        if (!cancelled) {
          setLoadError('Не удалось загрузить данные.')
          console.error(e)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, templateId])

  useEffect(() => {
    if (!open) return
    setError('')
    setPmModalOpen(false)
    setPmContext(null)
    setSubmitting(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !pmModalOpen) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, pmModalOpen])

  const updateSetRow = (id, patch) => {
    setSetRows((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    )
  }

  const addSetRow = () => {
    const last = setRows[setRows.length - 1]
    setSetRows((prev) => [
      ...prev,
      {
        id: newRowId(),
        weightMode: last?.weightMode ?? 'kg',
        weightKg: last?.weightKg ?? '0',
        percentPm: last?.percentPm ?? '',
        reps: last?.reps ?? '',
      },
    ])
  }

  const removeSetRow = (id) => {
    setSetRows((prev) => prev.filter((s) => s.id !== id))
  }

  const openPmForExercise = (ex, title) => {
    if (!ex) return
    setPmContext({ exerciseId: ex, title })
    setPmModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const tid = templateId
    if (tid == null) return

    const t = workTitle.trim()
    if (!t) {
      setError('Введите название.')
      return
    }
    const mg = Number(muscleGroupId)
    const ex = Number(exerciseId)
    if (!mg || !ex) {
      setError('Выберите мышечную группу и упражнение.')
      return
    }
    const dow = Number(dayOfWeek)
    if (!Number.isFinite(dow) || dow < 1 || dow > 7) {
      setError('Выберите день проведения (Пн–Вс).')
      return
    }
    if (!setRows.length) {
      setError('Добавьте хотя бы один подход.')
      return
    }

    const built = buildParsedCustomize(setRows)
    if (!built.ok) {
      setError(built.message)
      return
    }

    const pmMax = await workoutService.getLatestPmWeightForExercise(ex)
    if (
      built.parsed.some((x) => x.weightMode === 'percent') &&
      pmMax <= 0
    ) {
      setError('Для процентов от ПМ нужен рекорд по упражнению.')
      openPmForExercise(ex, exerciseTitle(ex))
      return
    }

    setSubmitting(true)
    try {
      await workoutService.updateTrainingFromTemplateForm(tid, {
        title: t,
        muscleGroupId: mg,
        exerciseId: ex,
        sets: built.parsed,
        pmMaxWeightKg: pmMax,
        dayOfTheWeek: dow,
      })
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Не удалось сохранить.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTraining = async () => {
    if (templateId == null) return
    if (!window.confirm('Удалить эту тренировку целиком?')) return
    setDeletingTraining(true)
    setError('')
    try {
      await workoutService.deleteTrainingByTemplate(templateId)
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Не удалось удалить тренировку.')
    } finally {
      setDeletingTraining(false)
    }
  }

  if (!open) return null

  const mgNum = Number(muscleGroupId)
  const exNum = Number(exerciseId)
  const exList = exercisesForGroup(muscleGroupId)
  const weightHint = workoutService.getWeightInputHintForExercise(
    (allExercises ?? []).find((e) => e.exerciseId === exNum),
  )

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center lg:p-6">
        <button
          type="button"
          className={`absolute inset-0 ${THEME_COLORS.modalBackdrop}`}
          aria-label="Закрыть"
          onClick={onClose}
        />
        <div
          className={`relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border ${THEME_COLORS.modalBorder} ${THEME_COLORS.modalPanel} shadow-2xl lg:max-w-xl`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-training-title"
        >
          <div className={`sticky top-0 z-10 border-b ${THEME_COLORS.modalSectionBorder} ${THEME_COLORS.modalPanel} px-5 py-4`}>
            <div className={`text-[11px] font-semibold tracking-wide ${THEME_COLORS.accentText}`}>
              РЕДАКТИРОВАНИЕ
            </div>
            <h2
              id="edit-training-title"
              className={`mt-2 text-lg font-semibold ${THEME_COLORS.heading}`}
            >
              Тренировка (блок)
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4">
            {loadError ? (
              <p className={`mb-3 text-sm ${THEME_COLORS.errorText}`}>{loadError}</p>
            ) : null}
            {loading ? (
              <p className={`mb-3 text-sm ${THEME_COLORS.dateTextSecondary}`}>Загрузка…</p>
            ) : null}

            {error ? (
              <div className={`mb-4 rounded-xl border ${THEME_COLORS.errorBorder} ${THEME_COLORS.errorBg} px-3 py-2 text-sm ${THEME_COLORS.errorText}`}>
                {error}
              </div>
            ) : null}

            <label className="block text-xs font-medium text-zinc-400">
              Название
              <input
                type="text"
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100"
              />
            </label>

            <label className="mt-3 block text-xs font-medium text-zinc-400">
              Мышечная группа
              <select
                value={muscleGroupId}
                onChange={(e) => {
                  setMuscleGroupId(e.target.value)
                  setExerciseId('')
                }}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100"
              >
                <option value="">Выберите…</option>
                {(muscleGroups ?? []).map((g) => (
                  <option key={g.muscleGroupId} value={g.muscleGroupId}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-zinc-400">
              День проведения
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100"
              >
                <option value="">Выберите…</option>
                <option value="1">Понедельник</option>
                <option value="2">Вторник</option>
                <option value="3">Среда</option>
                <option value="4">Четверг</option>
                <option value="5">Пятница</option>
                <option value="6">Суббота</option>
                <option value="7">Воскресенье</option>
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-zinc-400">
              Упражнение
              <select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
                disabled={!mgNum}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 disabled:opacity-50"
              >
                <option value="">{mgNum ? 'Выберите…' : 'Сначала группа'}</option>
                {exList.map((x) => (
                  <option key={x.exerciseId} value={x.exerciseId}>
                    {x.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 border-t border-zinc-800 pt-3">
              <div className="text-sm font-semibold text-zinc-200">Подходы</div>
              <ul className="mt-2 list-none space-y-3 p-0">
                {setRows.map((s, si) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                      <span>Подход {si + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSetRow(s.id)}
                        className="rounded border border-red-900/60 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-200"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-200">
                        <input
                          type="radio"
                          name={`wm-${s.id}`}
                          checked={s.weightMode === 'kg'}
                          onChange={() => updateSetRow(s.id, { weightMode: 'kg' })}
                        />
                        кг
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-200">
                        <input
                          type="radio"
                          name={`wm-${s.id}`}
                          checked={s.weightMode === 'percent'}
                          onChange={() => {
                            updateSetRow(s.id, { weightMode: 'percent' })
                            if (exNum) {
                              void workoutService
                                .getLatestPmWeightForExercise(exNum)
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
                            updateSetRow(s.id, { weightKg: e.target.value })
                          }
                          className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-sm text-zinc-100"
                          placeholder={weightHint}
                        />
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.percentPm}
                          onChange={(e) =>
                            updateSetRow(s.id, { percentPm: e.target.value })
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
                          updateSetRow(s.id, { reps: e.target.value })
                        }
                        className="rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-sm text-zinc-100"
                        placeholder="повт."
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addSetRow}
                className="mt-2 text-xs font-semibold text-orange-300 underline"
              >
                + подход
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  loading ||
                  !!loadError ||
                  muscleGroups === undefined
                }
                className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {submitting ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => void handleDeleteTraining()}
                disabled={deletingTraining || loading || !!loadError}
                className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-50"
              >
                {deletingTraining ? 'Удаление…' : 'Удалить тренировку'}
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
