import { useEffect, useMemo, useState } from 'react'

function OptionCard({ active, title, subtitle, tone, icon, onClick }) {
  const toneClasses = useMemo(() => {
    switch (tone) {
      case 'green':
        return active
          ? 'border-green-500/50 bg-green-500/70 text-zinc-950'
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
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${toneClasses}`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
          active ? 'border-white/20 bg-white/10' : 'border-zinc-800 bg-zinc-900/10'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className={`mt-0.5 text-xs ${active ? 'text-black/70' : 'text-zinc-500'}`}>
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

  useEffect(() => {
    if (!open) return
    setStatus(set?.status ?? 'not_completed')
  }, [open, set])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const weight = set?.weight ?? '—'
  const reps = set?.reps ?? '—'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Закрыть модальное окно"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="text-[11px] font-semibold tracking-wide text-emerald-300/90">
            РЕДАКТИРОВАНИЕ ПОДХОДА
          </div>
          <div className="mt-2 text-lg font-semibold text-zinc-50">
            {exerciseTitle ?? 'Упражнение'}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
            <div className="text-base font-semibold text-zinc-100">
              {String(weight).toString().replace('.', ',')} кг × {reps}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Целевые повторения</div>
          </div>

          <div className="mt-4 space-y-2">
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
              onClick={() => setStatus('partial')}
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
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/20 px-4 py-3 text-left text-zinc-200 transition hover:bg-zinc-900/25"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10">
                ↺
              </span>
              <span className="min-w-0">
                <div className="text-sm font-semibold">Сбросить</div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Вернуть в исходное состояние
                </div>
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900/25"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onSave?.({ ...set, status })}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-950 transition"
              style={{
                background:
                  'linear-gradient(90deg, rgba(16,185,129,0.95), rgba(249,115,22,0.9))',
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
