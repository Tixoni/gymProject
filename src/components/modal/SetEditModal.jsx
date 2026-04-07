import { useEffect, useMemo, useState } from 'react'
import PartialRepsStepper from './PartialRepsStepper'

function OptionCard({ active, title, subtitle, tone, icon, onClick }) {
  const toneClasses = useMemo(() => {
    switch (tone) {
      case 'green':
        return active
          ? 'border-orange-500/50 bg-orange-500/70 text-zinc-950'
          : 'border-zinc-800 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-900/25'
      case 'red':
        return active
          ? 'border-red-500/50 bg-red-950/60 text-red-100'
          : 'border-zinc-800 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-900/25'
      case 'muted':
        return active
          ? 'border-zinc-700 bg-zinc-800/70 text-zinc-50'
          : 'border-zinc-800 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-900/25'
      default:
        return active
          ? 'border-orange-500/50 bg-orange-950/45 text-orange-100'
          : 'border-zinc-800 bg-zinc-950/20 text-zinc-200 hover:bg-zinc-900/25'
    }
  }, [active, tone])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 ${toneClasses}`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:h-11 lg:w-11 ${
          active ? 'border-white/20 bg-white/10' : 'border-zinc-800 bg-zinc-900/10'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <div className="text-sm font-semibold lg:text-base">{title}</div>
        <div
          className={`mt-0.5 text-xs lg:text-sm ${active ? 'text-black/70' : 'text-zinc-500'}`}
        >
          {subtitle}
        </div>
      </span>
    </button>
  )
}

export default function SetEditModal({
  open,
  set,
  exerciseTitle,
  onClose,
  onSave,
}) {
  const [status, setStatus] = useState(set?.status ?? 'not_completed')
  const [partialReps, setPartialReps] = useState(0)

  const targetReps = useMemo(() => {
    const n = Number(set?.reps)
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }, [set])

  useEffect(() => {
    if (!open) return
    const s = set?.status ?? 'not_completed'
    setStatus(s)
    const max = Math.max(0, targetReps - 1)
    const saved = set?.actualReps
    if (saved != null && Number.isFinite(Number(saved))) {
      setPartialReps(Math.min(max, Math.max(0, Math.floor(Number(saved)))))
    } else {
      setPartialReps(max)
    }
  }, [open, set, targetReps])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const wNum = set?.weight
  const weightStr =
    wNum != null && Number.isFinite(Number(wNum))
      ? String(Number(wNum)).replace('.', ',')
      : '—'
  const pm = set?.percentageOfPM
  const pmPart =
    pm != null && Number.isFinite(Number(pm)) && Number(pm) > 0
      ? ` (${String(Number(pm)).replace('.', ',')}% ПМ)`
      : ''
  const weightLine = `${weightStr} кг${pmPart}`
  const reps = set?.reps ?? '—'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center lg:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Закрыть модальное окно"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl lg:max-w-lg xl:max-w-xl">
        <div className="border-b border-zinc-800 px-5 py-4 lg:px-6 lg:py-5">
          <div className="text-[11px] font-semibold tracking-wide text-orange-300/90 lg:text-xs">
            РЕДАКТИРОВАНИЕ ПОДХОДА
          </div>
          <div className="mt-2 text-lg font-semibold text-zinc-50 lg:text-xl">
            {exerciseTitle ?? 'Упражнение'}
          </div>
        </div>

        <div className="px-5 py-4 lg:px-6 lg:py-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 lg:rounded-2xl lg:p-5">
            <div className="text-base font-semibold text-zinc-100 lg:text-lg">
              {weightLine} × {reps}
            </div>
            <div className="mt-1 text-xs text-zinc-500 lg:text-sm">Целевые повторения</div>
          </div>

          <div className="mt-4 space-y-2 lg:mt-5 lg:space-y-3">
            <OptionCard
              active={status === 'completed'}
              tone="green"
              icon="✓"
              title="Выполнено"
              subtitle="Все повторения сделаны"
              onClick={() => setStatus('completed')}
            />
            <OptionCard
              active={status === 'partial'}
              tone="orange"
              icon="½"
              title="Частично"
              subtitle="Сделал меньше повторений"
              onClick={() => {
                setStatus('partial')
                setPartialReps((v) => {
                  const max = Math.max(0, targetReps - 1)
                  if (v > max || v < 0) return Math.min(max, Math.max(0, max))
                  return v
                })
              }}
            />
            <OptionCard
              active={status === 'failed'}
              tone="red"
              icon="✕"
              title="Неудачная попытка"
              subtitle="Подход начат, но цель не достигнута"
              onClick={() => setStatus('failed')}
            />
            <OptionCard
              active={status === 'skipped'}
              tone="muted"
              icon="≫"
              title="Пропущен"
              subtitle="Подход не выполнялся"
              onClick={() => setStatus('skipped')}
            />
            <button
              type="button"
              onClick={() => setStatus('not_completed')}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/20 px-4 py-3 text-left text-zinc-200 transition hover:bg-zinc-900/25 lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 lg:h-11 lg:w-11">
                ↺
              </span>
              <span className="min-w-0">
                <div className="text-sm font-semibold lg:text-base">Сбросить</div>
                <div className="mt-0.5 text-xs text-zinc-500 lg:text-sm">
                  Вернуть в исходное состояние
                </div>
              </span>
            </button>
          </div>

          {status === 'partial' ? (
            <div className="mt-4">
              <PartialRepsStepper
                value={partialReps}
                targetReps={targetReps}
                onChange={setPartialReps}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-zinc-800 px-5 py-4 lg:px-6 lg:py-5">
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900/25 lg:rounded-2xl lg:px-5 lg:py-4 lg:text-base"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() =>
                onSave?.({
                  ...set,
                  status,
                  actualReps: status === 'partial' ? partialReps : undefined,
                })
              }
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600 lg:rounded-2xl lg:px-5 lg:py-4 lg:text-base"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
