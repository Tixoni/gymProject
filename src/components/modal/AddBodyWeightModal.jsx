import { useEffect, useMemo, useState } from 'react'
import useBodyScrollLock from '../../hooks/useBodyScrollLock'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'
import { getDateKey } from '../../utils/dateKeys'

export default function AddBodyWeightModal({ open, onClose, onSaved }) {
  useBodyScrollLock(open)
  const today = useMemo(() => getDateKey(new Date()) ?? '', [])
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(today)
    setWeight('')
    setSaving(false)
    setError('')
  }, [open, today])

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
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      setError('Укажите корректную дату.')
      return
    }
    if (!Number.isFinite(w) || w <= 0) {
      setError('Укажите вес больше 0.')
      return
    }
    setSaving(true)
    try {
      await workoutService.saveBodyWeight(date, w)
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err?.message ?? 'Не удалось сохранить вес.')
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
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${THEME_COLORS.modalBorder} ${THEME_COLORS.modalPanel} shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bw-modal-title"
      >
        <div className={`border-b ${THEME_COLORS.modalSectionBorder} px-5 py-4`}>
          <div className={`text-[11px] font-semibold tracking-wide ${THEME_COLORS.accentText}`}>
            ВЕС ТЕЛА
          </div>
          <h2 id="bw-modal-title" className={`mt-2 text-lg font-semibold ${THEME_COLORS.heading}`}>
            Добавить запись веса
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4">
          {error ? (
            <div className={`mb-4 rounded-xl border ${THEME_COLORS.errorBorder} ${THEME_COLORS.errorBg} px-3 py-2 text-sm ${THEME_COLORS.errorText}`}>
              {error}
            </div>
          ) : null}
          <label className={`block text-xs font-medium ${THEME_COLORS.labelText}`}>
            Дата
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText}`}
              required
            />
          </label>
          <label className={`mt-3 block text-xs font-medium ${THEME_COLORS.labelText}`}>
            Вес, кг
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={`mt-1 w-full rounded-xl border ${THEME_COLORS.inputBorder} ${THEME_COLORS.inputBg} px-3 py-2.5 ${THEME_COLORS.inputText} ${THEME_COLORS.inputPlaceholder}`}
              placeholder="например 82.5"
              required
            />
          </label>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border ${THEME_COLORS.buttonGhostBorder} ${THEME_COLORS.buttonGhostBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonGhostText} ${THEME_COLORS.buttonGhostHover}`}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl ${THEME_COLORS.accentBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} disabled:opacity-50 ${THEME_COLORS.accentBgHover}`}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
