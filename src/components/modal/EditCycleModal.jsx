import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { SCHEDULED_PROGRAM_CYCLE_KIND, db } from '../../storage/db'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'

const WEEKDAYS = [
  { dow: 1, label: 'Пн' },
  { dow: 2, label: 'Вт' },
  { dow: 3, label: 'Ср' },
  { dow: 4, label: 'Чт' },
  { dow: 5, label: 'Пт' },
  { dow: 6, label: 'Сб' },
  { dow: 7, label: 'Вс' },
]

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
  const [weekdays, setWeekdays] = useState(() => new Set())
  const [cycleTrainings, setCycleTrainings] = useState([])
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

  const refreshCycleTrainings = useCallback(async () => {
    if (cycleId == null || isScheduledProgram) {
      setCycleTrainings([])
      return
    }
    const rows = await workoutService.listCycleTrainingTemplates(cycleId)
    setCycleTrainings(rows)
  }, [cycleId, isScheduledProgram])

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
        const dows = trainings
          .map((t) => Number(t.dayOfTheWeek))
          .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
        setWeekdays(new Set(dows))
        await refreshCycleTrainings()
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
  }, [open, cycleId, refreshCycleTrainings])

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
      if (isScheduledProgram) {
        const dows = [...weekdays].sort((a, b) => a - b)
        if (!dows.length) {
          setError('Выберите хотя бы один день недели.')
          setSubmitting(false)
          return
        }
        await workoutService.rescheduleProgramTrainings(cycleId, dows)
      } else {
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

  const toggleWeekday = (dow) => {
    setWeekdays((prev) => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
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

  const handleAddTraining = async () => {
    if (cycleId == null) return
    setBusyAction('add-training')
    setError('')
    try {
      await workoutService.addTrainingToCycle(cycleId)
      await refreshCycleTrainings()
    } catch (err) {
      setError(err?.message ?? 'Не удалось добавить тренировку.')
    } finally {
      setBusyAction('')
    }
  }

  const handleDeleteTraining = async (templateId) => {
    if (!window.confirm('Удалить выбранную тренировку?')) return
    setBusyAction(`del-training-${templateId}`)
    setError('')
    try {
      await workoutService.deleteTrainingByTemplate(templateId)
      await refreshCycleTrainings()
    } catch (err) {
      setError(err?.message ?? 'Не удалось удалить тренировку.')
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
  const headingText = isScheduledProgram
    ? 'Редактирование программы'
    : 'Редактирование цикла'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center lg:p-6">
      <button
        type="button"
        className={`absolute inset-0 ${THEME_COLORS.modalBackdrop}`}
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border ${THEME_COLORS.modalBorder} ${THEME_COLORS.modalPanel} p-5 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-cycle-title"
      >
        <h2
          id="edit-cycle-title"
          className={`text-lg font-semibold ${THEME_COLORS.heading}`}
        >
          {headingText}
        </h2>
        <p className={`mt-1 text-xs ${THEME_COLORS.dateTextSecondary}`}>
          {isScheduledProgram
            ? 'Название программы. Упражнения и подходы настраиваются в каждом блоке отдельно.'
            : 'Название цикла и одно упражнение на все тренировки; веса в % от ПМ пересчитываются по последней записи ПМ.'}
        </p>

        {loading ? (
          <p className={`mt-3 text-sm ${THEME_COLORS.dateTextSecondary}`}>Загрузка…</p>
        ) : null}
        {error ? (
          <div className={`mt-3 rounded-lg border ${THEME_COLORS.errorBorder} ${THEME_COLORS.errorBg} px-3 py-2 text-sm ${THEME_COLORS.errorText}`}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className={`block text-xs font-medium ${THEME_COLORS.labelText}`}>
            Название
            <input
              type="text"
              value={cycleTitle}
              onChange={(e) => setCycleTitle(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText}`}
              placeholder={isScheduledProgram ? 'Название программы' : 'Название цикла'}
              autoComplete="off"
            />
          </label>

          {!isScheduledProgram ? (
            <>
              <label className={`block text-xs font-medium ${THEME_COLORS.labelText}`}>
                Мышечная группа
                <select
                  value={muscleGroupId}
                  onChange={(e) => {
                    setMuscleGroupId(e.target.value)
                    setExerciseId('')
                  }}
                  className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText}`}
                >
                  <option value="">Выберите…</option>
                  {(muscleGroups ?? []).map((g) => (
                    <option key={g.muscleGroupId} value={g.muscleGroupId}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`block text-xs font-medium ${THEME_COLORS.labelText}`}>
                Упражнение
                <select
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  disabled={!mgNum}
                  className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} ${THEME_COLORS.inputDisabled}`}
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
          ) : (
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-3">
              <div className={`text-xs font-medium ${THEME_COLORS.labelText}`}>
                Дни недели программы
              </div>
              <p className={`mt-1 text-[11px] ${THEME_COLORS.dateTextSecondary}`}>
                Все тренировки программы будут заново распределены по выбранным дням.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map(({ dow, label }) => (
                  <label
                    key={dow}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                      weekdays.has(dow)
                        ? `${THEME_COLORS.accentBg} border-transparent text-white`
                        : `border-zinc-700 bg-zinc-900 ${THEME_COLORS.buttonGhostText}`
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={weekdays.has(dow)}
                      onChange={() => toggleWeekday(dow)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isScheduledProgram ? (
            <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-3">
              <div className={`text-xs font-medium ${THEME_COLORS.labelText}`}>
                Тренировки цикла
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleAddTraining()}
                  disabled={busyAction !== ''}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 disabled:opacity-50"
                >
                  Добавить тренировку
                </button>
              </div>
              <ul className="mt-2 list-none space-y-2 p-0">
                {cycleTrainings.map((t) => (
                  <li
                    key={t.templateId}
                    className="flex items-center justify-between gap-2 rounded border border-zinc-800 bg-zinc-900/30 px-2 py-1.5"
                  >
                    <span className="text-xs text-zinc-300">
                      {t.title}
                      {t.dayOfTheWeek ? ` · день ${t.dayOfTheWeek}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTraining(t.templateId)}
                      disabled={busyAction !== ''}
                      className="rounded border border-red-900/60 bg-red-950/30 px-2 py-0.5 text-[11px] text-red-200 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
                {!cycleTrainings.length ? (
                  <li className="text-xs text-zinc-500">Тренировок пока нет.</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`min-w-[6rem] flex-1 rounded-xl border ${THEME_COLORS.buttonGhostBorder} py-2.5 text-sm font-semibold ${THEME_COLORS.buttonGhostText}`}
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
              className={`min-w-[6rem] flex-1 rounded-xl ${THEME_COLORS.accentBg} py-2.5 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} disabled:opacity-50 ${THEME_COLORS.accentBgHover}`}
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>

        {onDuplicate || onDelete ? (
          <div className={`mt-6 border-t ${THEME_COLORS.modalSectionBorder} pt-4`}>
            <p className={`mb-2 text-xs font-medium ${THEME_COLORS.dateTextSecondary}`}>
              Дополнительно
            </p>
            <div className="flex flex-wrap gap-2">
              {onDuplicate ? (
                <button
                  type="button"
                  disabled={busyAction !== ''}
                  onClick={() => void handleDuplicate()}
                  className={`rounded-xl border ${THEME_COLORS.buttonGhostBorder} ${THEME_COLORS.buttonGhostBg} px-3 py-2 text-sm font-medium ${THEME_COLORS.buttonGhostText} ${THEME_COLORS.buttonGhostHover} disabled:opacity-50`}
                >
                  {busyAction === 'dup' ? 'Копирование…' : 'Дублировать'}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  disabled={busyAction !== ''}
                  onClick={() => void handleDelete()}
                  className={`rounded-xl border ${THEME_COLORS.dangerBorder} ${THEME_COLORS.dangerBg} px-3 py-2 text-sm font-medium ${THEME_COLORS.dangerText} ${THEME_COLORS.dangerHover} disabled:opacity-50`}
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
