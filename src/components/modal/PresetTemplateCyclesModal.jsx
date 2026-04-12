import { useEffect, useState } from 'react'
import { STRENGTH_PROGRAM_PRESETS } from '../../trainingBuilder/strengthPresetPrograms'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'

export default function PresetTemplateCyclesModal({ open, onClose, onCreated }) {
  const [selectedId, setSelectedId] = useState(STRENGTH_PROGRAM_PRESETS[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSelectedId(STRENGTH_PROGRAM_PRESETS[0]?.id ?? '')
    setSaving(false)
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleCreate = async () => {
    if (!selectedId) return
    setError('')
    setSaving(true)
    try {
      await workoutService.createPresetStrengthCycle(selectedId)
      onCreated?.()
      onClose?.()
    } catch (e) {
      const code = e?.message
      if (code === 'PM_REQUIRED') {
        setError(
          'Для выбранного упражнения нет записи ПМ. Добавьте личный рекорд на вкладке «Статистика».',
        )
      } else {
        setError(e?.message ?? 'Не удалось создать цикл.')
      }
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
        className={`relative max-h-[min(90dvh,640px)] w-full max-w-lg overflow-hidden overflow-y-auto rounded-2xl border ${THEME_COLORS.modalBorder} ${THEME_COLORS.modalPanel} shadow-2xl lg:max-w-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-cycles-title"
      >
        <div
          className={`sticky top-0 z-[1] border-b ${THEME_COLORS.modalSectionBorder} px-5 py-4 lg:px-6 lg:py-5`}
        >
          <div
            className={`text-[11px] font-semibold tracking-wide ${THEME_COLORS.successHintText} lg:text-xs`}
          >
            ШАБЛОНЫ ЦИКЛОВ
          </div>
          <h2
            id="preset-cycles-title"
            className={`mt-2 text-lg font-semibold lg:text-xl ${THEME_COLORS.heading}`}
          >
            Добавить цикл из шаблона
          </h2>
          <p className={`mt-1 text-xs lg:text-sm ${THEME_COLORS.dateTextSecondary}`}>
            Выберите программу — цикл сохранится в базе и появится в списке «Циклы (база
            данных)».
          </p>
        </div>

        <div className="px-5 py-4 lg:px-6 lg:py-5">
          {error ? (
            <div
              className={`mb-4 rounded-xl border ${THEME_COLORS.errorBorder} ${THEME_COLORS.errorBg} px-3 py-2 text-sm ${THEME_COLORS.errorText}`}
            >
              {error}
            </div>
          ) : null}

          <ul className="list-none space-y-2 p-0">
            {STRENGTH_PROGRAM_PRESETS.map((p) => {
              const checked = p.id === selectedId
              return (
                <li key={p.id}>
                  <label
                    className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition ${
                      checked
                        ? `border-orange-500/50 bg-orange-950/25 ${THEME_COLORS.contentText}`
                        : `${THEME_COLORS.chromeBorder} bg-zinc-950/30 hover:border-zinc-600/80`
                    }`}
                  >
                    <input
                      type="radio"
                      name="preset-cycle"
                      value={p.id}
                      checked={checked}
                      onChange={() => setSelectedId(p.id)}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-zinc-100">
                        {p.title}
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-relaxed ${THEME_COLORS.contentMuted}`}
                      >
                        {p.description}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-8 lg:gap-4">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border ${THEME_COLORS.buttonGhostBorder} ${THEME_COLORS.buttonGhostBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonGhostText} transition ${THEME_COLORS.buttonGhostHover} lg:rounded-2xl lg:py-4 lg:text-base`}
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={saving || !selectedId}
              onClick={() => void handleCreate()}
              className={`rounded-xl ${THEME_COLORS.accentBg} px-4 py-3 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} transition enabled:hover:opacity-95 disabled:opacity-50 ${THEME_COLORS.accentBgHover} lg:rounded-2xl lg:py-4 lg:text-base`}
            >
              {saving ? 'Создание…' : 'Создать цикл'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
