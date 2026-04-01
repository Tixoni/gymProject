import { useMemo } from 'react'
import { THEME_COLORS } from '../theme'
import CycleTemplate from './CycleTemplate'

export default function TrainingProgramsTab({
  cycles = [],
  onSeed,
  onRebuild,
  onRefresh,
  onRemoveCycle,
}) {
  const sorted = useMemo(
    () =>
      [...cycles].sort((a, b) =>
        (a.muscleGroup || '').localeCompare(b.muscleGroup || '', 'ru'),
      ),
    [cycles],
  )

  return (
    <div className='mt-6'>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onSeed}
          className={`rounded-xl px-4 py-3 text-sm font-semibold text-white ${THEME_COLORS.accentBg} ${THEME_COLORS.accentBgHover}`}
        >
          Добавить шаблоны (грудь, бицепс, спина, ноги)
        </button>
        <button
          type="button"
          onClick={onRebuild}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-zinc-200`}
        >
          Пересчитать циклы по рекордам
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} text-zinc-200`}
        >
          Обновить
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className={THEME_COLORS.contentMuted}>
          Циклов пока нет. Нажмите «Добавить шаблоны», чтобы создать 4 цикла и
          пример расписания (пн / ср / пт).
        </p>
      ) : (
        <ul className="list-none space-y-0 p-0">
          {sorted.map((c) => (
            <CycleTemplate key={c.id} cycle={c} onRemove={onRemoveCycle} />
          ))}
        </ul>
      )}
    </div>
  )
}
