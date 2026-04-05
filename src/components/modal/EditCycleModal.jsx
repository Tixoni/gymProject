import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { SCHEDULED_PROGRAM_CYCLE_KIND, db } from '../../storage/db'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'

export default function EditCycleModal({
  open,
  cycleId,
  isScheduledProgram = false,
  onClose,
  onSaved,
  onDuplicate,
  onDelete,
}) {
  const [cycleTitle, setCycleTitle] = useState('')
  const [muscleGroupId, setMuscleGroupId] = useState('')
  const [exerciseId, setExerciseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyAction, setBusyAction] = useState('')

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

  useEffect(() => {
    if (!open || cycleId == null) return
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const c = await db.trainingCyclesTable.get(cycleId)
        const trainings = await db.trainingsTable
          .where('cycleId')
          .equals(cycleId)
          .toArray()
        trainings.sort(
          (a, b) =>
            (a.dayOfTheWeek ?? 0) - (b.dayOfTheWeek ?? 0) ||
            (a.trainingId ?? 0) - (b.trainingId ?? 0),
        )
        const firstTid = trainings[0]?.trainingId
        const tmpl =
          firstTid != null
            ? await db.workoutTemplatesTable
                .where('trainingId')
                .equals(firstTid)
                .first()
            : null
        if (cancelled) return
        const name =
          c?.cycleKind === SCHEDULED_PROGRAM_CYCLE_KIND
            ? (c?.programTitle ?? '').trim()
            : (c?.cycleTitle ?? '').trim()
        setCycleTitle(name)
        setMuscleGroupId(String(c?.muscleGroupId ?? tmpl?.muscleGroupId ?? ''))
        setExerciseId(String(tmpl?.exerciseId ?? ''))
      } catch (e) {
        if (!cancelled) setError('Не удалось загрузить цикл.')
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, cycleId])

  useEffect(() => {
    if (!open) return
    setSubmitting(false)
    setBusyAction('')
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (cycleId == null) return
    const titleTrim = cycleTitle.trim()
    if (!titleTrim) {
      setError('Укажите название.')
      return
    }
    setSubmitting(true)
    try {
      await workoutService.updateCycleTitle(cycleId, titleTrim)
      if (!isScheduledProgram) {
        const mg = Number(muscleGroupId)
        const ex = Number(exerciseId)
        if (!mg || !ex) {
          setError('Выберите мышечную группу и упражнение.')
          setSubmitting(false)
          return
        }
        await workoutService.applyUniformExerciseToCycle(cycleId, mg, ex)
      }
      onSaved?.()
      onClose?.()
    } catch (err) {
      if (err?.message === 'PROGRAM_CYCLE') {
        setError('Для составной программы используйте правку отдельных блоков.')
      } else if (err?.message === 'EMPTY_TITLE') {
        setError('Укажите название.')
      } else {
        setError(err?.message ?? 'Не удалось сохранить.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!onDuplicate) return
    setBusyAction('dup')
    setError('')
    try {
      const ok = await onDuplicate()
      if (ok) onClose?.()
    } catch (err) {
      console.error(err)
      setError('Не удалось дублировать.')
    } finally {
      setBusyAction('')
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setBusyAction('del')
    setError('')
    try {
      const ok = await onDelete()
      if (ok) onClose?.()
    } catch (err) {
      console.error(err)
      setError('Не удалось удалить.')
    } finally {
      setBusyAction('')
    }
  }

  if (!open) return null

  const mgNum = Number(muscleGroupId)
  const exList = exercisesForGroup(muscleGroupId)
  const heading = isScheduledProgram ? 'Программа' : 'Цикл'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center lg:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-cycle-title"
      >
        <h2
          id="edit-cycle-title"
          className={`text-lg font-semibold ${THEME_COLORS.heading}`}
        >
          Редактировать {heading.toLowerCase()}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {isScheduledProgram
            ? 'Название программы. Упражнения и подходы настраиваются в каждом блоке отдельно.'
            : 'Название цикла и одно упражнение на все тренировки; веса в % от ПМ пересчитываются по новому ПМ.'}
        </p>

        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Загрузка…</p>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-400">
            Название
            <input
              type="text"
              value={cycleTitle}
              onChange={(e) => setCycleTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100"
              placeholder={isScheduledProgram ? 'Название программы' : 'Название цикла'}
              autoComplete="off"
            />
          </label>

          {!isScheduledProgram ? (
            <>
              <label className="block text-xs font-medium text-zinc-400">
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
              <label className="block text-xs font-medium text-zinc-400">
                Упражнение
                <select
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  disabled={!mgNum}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 disabled:opacity-50"
                >
                  <option value="">
                    {mgNum ? 'Выберите…' : 'Сначала группа'}
                  </option>
                  {exList.map((x) => (
                    <option key={x.exerciseId} value={x.exerciseId}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[6rem] flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                muscleGroups === undefined ||
                (isScheduledProgram ? false : allExercises === undefined)
              }
              className="min-w-[6rem] flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>

        {onDuplicate || onDelete ? (
          <div className="mt-6 border-t border-zinc-800 pt-4">
            <p className="mb-2 text-xs font-medium text-zinc-500">
              Дополнительно
            </p>
            <div className="flex flex-wrap gap-2">
              {onDuplicate ? (
                <button
                  type="button"
                  disabled={busyAction !== ''}
                  onClick={() => void handleDuplicate()}
                  className="rounded-xl border border-zinc-600/80 bg-zinc-900/50 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800/80 disabled:opacity-50"
                >
                  {busyAction === 'dup' ? 'Копирование…' : 'Дублировать'}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  disabled={busyAction !== ''}
                  onClick={() => void handleDelete()}
                  className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50"
                >
                  {busyAction === 'del' ? 'Удаление…' : 'Удалить'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
