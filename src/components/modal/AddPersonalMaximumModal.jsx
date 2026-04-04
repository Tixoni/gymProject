import { useEffect, useState } from 'react'
import { workoutService } from '../../storage/workoutService'

export default function AddPersonalMaximumModal({
  open,
  exerciseId,
  exerciseTitle,
  onClose,
  onSaved,
}) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setWeight('')
    setReps('')
    setComment('')
    setError('')
    setSaving(false)
  }, [open, exerciseId])

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
    if (exerciseId == null) {
      setError('Не выбрано упражнение.')
      return
    }
    setSaving(true)
    try {
      await workoutService.addPersonalMaximum(
        exerciseId,
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
        className="absolute inset-0 bg-black/70"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl lg:max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-modal-title"
      >
        <div className="border-b border-zinc-800 px-5 py-4 lg:px-6 lg:py-5">
          <div className="text-[11px] font-semibold tracking-wide text-emerald-300/90 lg:text-xs">
            ЛИЧНЫЙ РЕКОРД (ПМ)
          </div>
          <h2
            id="pm-modal-title"
            className="mt-2 text-lg font-semibold text-zinc-50 lg:text-xl"
          >
            {exerciseTitle ?? 'Упражнение'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 lg:text-sm">
            Упражнение выбрано из формы цикла — укажите вес и повторения рекорда.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 lg:px-6 lg:py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <label className="block text-xs font-medium text-zinc-400 lg:text-sm">
            Вес, кг
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
              placeholder="например 100"
              required
            />
          </label>

          <label className="mt-3 block text-xs font-medium text-zinc-400 lg:mt-4 lg:text-sm">
            Повторения
            <input
              type="number"
              min={1}
              step={1}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
              placeholder="1"
              required
            />
          </label>

          <label className="mt-3 block text-xs font-medium text-zinc-400 lg:mt-4 lg:text-sm">
            Комментарий (необязательно)
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-emerald-500/30 focus:ring-2 lg:py-3"
            />
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:mt-6 lg:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900/25 lg:rounded-2xl lg:py-4 lg:text-base"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 transition enabled:hover:opacity-95 disabled:opacity-50 lg:rounded-2xl lg:py-4 lg:text-base"
              style={{
                background:
                  'linear-gradient(90deg, rgba(16,185,129,0.95), rgba(249,115,22,0.9))',
              }}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
