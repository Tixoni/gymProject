import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { workoutService } from '../../storage/workoutService'
import { THEME_COLORS } from '../../theme'
import { getDateKey } from '../../utils/dateKeys'

const WEEKDAYS = [
  { dow: 1, label: 'Пн' },
  { dow: 2, label: 'Вт' },
  { dow: 3, label: 'Ср' },
  { dow: 4, label: 'Чт' },
  { dow: 5, label: 'Пт' },
  { dow: 6, label: 'Сб' },
  { dow: 7, label: 'Вс' },
]

export default function ComposeProgramModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [startDateKey, setStartDateKey] = useState(() => getDateKey(new Date()) ?? '')
  const [repeatRounds, setRepeatRounds] = useState(1)
  const [orderedCycleIds, setOrderedCycleIds] = useState([])
  const [addCycleId, setAddCycleId] = useState('')
  const [weekdays, setWeekdays] = useState(() => new Set())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cycles = useLiveQuery(() => workoutService.listCyclesForComposer(), [])

  useEffect(() => {
    if (!open) return
    setTitle('')
    setStartDateKey(getDateKey(new Date()) ?? '')
    setRepeatRounds(1)
    setOrderedCycleIds([])
    setAddCycleId('')
    setWeekdays(new Set())
    setError('')
    setSubmitting(false)
  }, [open])

  const cyclesList = cycles ?? []

  const cycleLabel = useCallback(
    (id) => cyclesList.find((c) => c.cycleId === id)?.title ?? `Цикл #${id}`,
    [cyclesList],
  )

  const appendCycle = () => {
    const id = Number(addCycleId)
    if (!id) return
    setOrderedCycleIds((prev) => [...prev, id])
    setAddCycleId('')
  }

  const removeAt = (index) => {
    setOrderedCycleIds((prev) => prev.filter((_, i) => i !== index))
  }

  const moveUp = (index) => {
    if (index <= 0) return
    setOrderedCycleIds((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (index) => {
    setOrderedCycleIds((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const toggleWeekday = (dow) => {
    setWeekdays((prev) => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const t = title.trim()
    if (!t) {
      setError('Введите название программы.')
      return
    }
    const sk = String(startDateKey || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sk)) {
      setError('Укажите дату начала (ГГГГ-ММ-ДД).')
      return
    }
    if (!orderedCycleIds.length) {
      setError('Добавьте в программу хотя бы один цикл.')
      return
    }
    const dows = [...weekdays].sort((a, b) => a - b)
    if (!dows.length) {
      setError('Выберите хотя бы один день недели.')
      return
    }

    setSubmitting(true)
    try {
      const result = await workoutService.createComposedProgram({
        title: t,
        sourceCycleIds: orderedCycleIds,
        weekdays: dows,
        startDateKey: sk,
        repeatRounds,
      })
      onCreated?.(result)
      onClose?.()
    } catch (err) {
      const m = err?.message
      if (m === 'BAD_START_DATE') {
        setError('Некорректная дата начала.')
      } else if (m === 'DATE_EXHAUSTED') {
        setError(
          'Не хватило слотов дат: уменьшите число раундов или добавьте дни недели.',
        )
      } else if (m === 'EMPTY_CYCLE') {
        setError('Один из циклов без тренировок в базе — проверьте цикл.')
      } else {
        setError(m ?? 'Не удалось сохранить программу.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const ready = useMemo(() => cycles !== undefined, [cycles])

  if (!open) return null

  return (
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
        aria-labelledby="compose-program-title"
      >
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 lg:px-6 lg:py-5">
          <div className="text-[11px] font-semibold tracking-wide text-orange-300/90 lg:text-xs">
            ПРОГРАММА
          </div>
          <h2
            id="compose-program-title"
            className="mt-2 text-lg font-semibold text-zinc-50 lg:text-xl"
          >
            Составить программу
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Циклы в списке объединяются в <strong>одну тренировку в день</strong>: 1-й
            день программы = 1-я тренировка из цикла A + 1-я из B подряд (например
            грудь и бицепс вместе), 2-й день = 2-я + 2-я и т.д. Слоты календаря — по
            выбранным дням недели от даты начала. Раунды повторяют весь такой блок
            дней.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 lg:px-6 lg:py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <label className="block text-xs font-medium text-zinc-400 lg:text-sm">
            Название программы <span className="text-red-400">*</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-orange-500/30 focus:ring-2 lg:py-3"
              placeholder="Например, силовой мезоцикл"
              required
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-zinc-400 lg:text-sm">
            Дата начала тренировок <span className="text-red-400">*</span>
            <input
              type="date"
              value={startDateKey}
              onChange={(e) => setStartDateKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 outline-none ring-orange-500/30 focus:ring-2 lg:py-3"
              required
            />
            <span className="mt-1 block text-[11px] text-zinc-600">
              Первая тренировка попадёт на ближайший выбранный день недели не раньше
              этой даты.
            </span>
          </label>

          <label className="mt-4 block text-xs font-medium text-zinc-400 lg:text-sm">
            Сколько раз повторить весь блок дней (все «дни программы»)
            <input
              type="number"
              min={1}
              max={52}
              step={1}
              value={repeatRounds}
              onChange={(e) =>
                setRepeatRounds(
                  Math.min(52, Math.max(1, Math.floor(Number(e.target.value)) || 1)),
                )
              }
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-zinc-100 lg:py-3"
            />
            <span className="mt-1 block text-[11px] text-zinc-600">
              Если в циклах по 2 тренировки, один проход = 2 дня в календаре (каждый
              день — совмещённая сессия). Раунд 2 повторяет эти дни с новыми датами.
            </span>
          </label>

          <div className="mt-5 space-y-3">
            <div className="text-sm font-semibold text-zinc-200">
              Циклы (порядок = порядок блоков в одной тренировке: сначала первый цикл,
              затем второй…)
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={addCycleId}
                onChange={(e) => setAddCycleId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-100"
              >
                <option value="">Выберите цикл…</option>
                {cyclesList.map((c) => (
                  <option key={c.cycleId} value={c.cycleId}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={appendCycle}
                disabled={!addCycleId}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 disabled:opacity-40 hover:bg-zinc-800"
              >
                Добавить
              </button>
            </div>
            {orderedCycleIds.length ? (
              <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-300">
                {orderedCycleIds.map((id, index) => (
                  <li key={`${id}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/40 py-2 pl-2 pr-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>{cycleLabel(id)}</span>
                      <span className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="rounded border border-zinc-700 px-2 py-0.5 text-xs disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === orderedCycleIds.length - 1}
                          className="rounded border border-zinc-700 px-2 py-0.5 text-xs disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAt(index)}
                          className="rounded border border-red-900/50 px-2 py-0.5 text-xs text-red-300"
                        >
                          Убрать
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-zinc-500">
                Список пуст — добавьте один или несколько циклов (один цикл можно
                добавить дважды).
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-zinc-200">
              Дни недели для тренировок <span className="text-red-400">*</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Подряд назначаются только эти дни; лишние дни недели пропускаются.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAYS.map(({ dow, label }) => (
                <label
                  key={dow}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    weekdays.has(dow)
                      ? `${THEME_COLORS.accentBg} border-transparent text-white`
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300'
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

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || !ready}
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600 enabled:hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? 'Сохранение…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
