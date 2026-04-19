import { useEffect, useState } from 'react'
import useBodyScrollLock from '../../hooks/useBodyScrollLock'
import { db } from '../../storage/db'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'
import { useLiveQuery } from 'dexie-react-hooks'

export default function AddPersonalMaximumModal({
  open,
  exerciseId,
  exerciseTitle,
  onClose,
  onSaved,
}) {
  useBodyScrollLock(open)
  const muscleGroups = useLiveQuery(() => db.muscleGroupsTable.toArray(), [])
  const allExercises = useLiveQuery(() => db.exercisesTable.toArray(), [])
  const [muscleGroupId, setMuscleGroupId] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const initialEx = exerciseId != null ? String(exerciseId) : ''
    setSelectedExerciseId(initialEx)
    if (initialEx) {
      const ex = (allExercises ?? []).find((x) => x.exerciseId === Number(initialEx))
      setMuscleGroupId(ex?.muscleGroupId != null ? String(ex.muscleGroupId) : '')
    } else {
      setMuscleGroupId('')
    }
    setWeight('')
    setReps('')
    setComment('')
    setError('')
    setSaving(false)
  }, [open, exerciseId, allExercises])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const w = Number(String(weight).replace(',', '.'))
    const r = Number(String(reps).replace(',', '.'))
    if (!Number.isFinite(w) || w <= 0) {
      setError('Укажите вес больше 0.')
      return
    }
    if (!Number.isFinite(r) || r < 1 || !Number.isInteger(r)) {
      setError('Укажите целое число повторений не меньше 1.')
      return
    }
    const selectedEx = Number(selectedExerciseId || exerciseId)
    if (!selectedEx) {
      setError('Не выбрано упражнение.')
      return
    }
    setSaving(true)
    try {
      await workoutService.addPersonalMaximum(
        selectedEx,
        w,
        r,
        comment.trim(),
      )
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Не удалось сохранить запись.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center lg:p-6">
      <button
        type="button"
        className={`absolute inset-0 ${THEME_COLORS.modalBackdrop}`}
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${THEME_COLORS.modalBorder} ${THEME_COLORS.modalPanel} shadow-2xl lg:max-w-lg`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-modal-title"
      >
        <div className={`border-b ${THEME_COLORS.modalSectionBorder} px-5 py-4 lg:px-6 lg:py-5`}>
          <div className={`text-[11px] font-semibold tracking-wide ${THEME_COLORS.successHintText} lg:text-xs`}>
            ЛИЧНЫЙ РЕКОРД (ПМ)
          </div>
          <h2
            id="pm-modal-title"
            className={`mt-2 text-lg font-semibold lg:text-xl ${THEME_COLORS.heading}`}
          >
            {exerciseTitle ?? 'Упражнение'}
          </h2>
          <p className={`mt-1 text-xs lg:text-sm ${THEME_COLORS.dateTextSecondary}`}>
            Укажите вес и повторения рекорда. Дробные значения веса можно вводить через "," или ".".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 lg:px-6 lg:py-5">
          {error ? (
            <div className={`mb-4 rounded-xl border ${THEME_COLORS.errorBorder} ${THEME_COLORS.errorBg} px-3 py-2 text-sm ${THEME_COLORS.errorText}`}>
              {error}
            </div>
          ) : null}

          <label className={`block text-xs font-medium lg:text-sm ${THEME_COLORS.labelText}`}>
            Мышечная группа
            <select
              value={muscleGroupId}
              onChange={(e) => {
                setMuscleGroupId(e.target.value)
                setSelectedExerciseId('')
              }}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} outline-none focus:ring-2 focus:ring-orange-500/30 lg:py-3`}
            >
              <option value="">Выберите…</option>
              {(muscleGroups ?? []).map((g) => (
                <option key={g.muscleGroupId} value={g.muscleGroupId}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>

          <label className={`mt-3 block text-xs font-medium lg:text-sm ${THEME_COLORS.labelText}`}>
            Упражнение
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              disabled={!muscleGroupId}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} outline-none focus:ring-2 focus:ring-orange-500/30 lg:py-3`}
            >
              <option value="">{muscleGroupId ? 'Выберите…' : 'Сначала группа'}</option>
              {(allExercises ?? [])
                .filter((x) => x.muscleGroupId === Number(muscleGroupId))
                .map((x) => (
                  <option key={x.exerciseId} value={x.exerciseId}>
                    {x.title}
                  </option>
                ))}
            </select>
          </label>

          <label className={`block text-xs font-medium lg:text-sm ${THEME_COLORS.labelText}`}>
            Вес, кг
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} ${THEME_COLORS.inputPlaceholder} outline-none focus:ring-2 focus:ring-orange-500/30 lg:py-3`}
              placeholder="например 100"
              required
            />
          </label>

          <label className={`mt-3 block text-xs font-medium lg:mt-4 lg:text-sm ${THEME_COLORS.labelText}`}>
            Повторения
            <input
              type="number"
              min={1}
              step={1}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} outline-none focus:ring-2 focus:ring-orange-500/30 lg:py-3`}
              placeholder="1"
              required
            />
          </label>

          <label className={`mt-3 block text-xs font-medium lg:mt-4 lg:text-sm ${THEME_COLORS.labelText}`}>
            Комментарий (необязательно)
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} outline-none focus:ring-2 focus:ring-orange-500/30 lg:py-3`}
            />
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:mt-6 lg:gap-4">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border ${THEME_COLORS.buttonGhostBorder} ${THEME_COLORS.buttonGhostBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonGhostText} transition ${THEME_COLORS.buttonGhostHover} lg:rounded-2xl lg:py-4 lg:text-base`}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl ${THEME_COLORS.accentBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} transition enabled:hover:opacity-95 disabled:opacity-50 ${THEME_COLORS.accentBgHover} lg:rounded-2xl lg:py-4 lg:text-base`}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
