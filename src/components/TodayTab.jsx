import { useMemo } from 'react'
import WeekTemplate from './WeekTemplate'

export default function TodayTab() {
  // В дальнейшем сюда подключим реальные данные из storage/workoutService.
  const weeks = useMemo(
    () => [
      {
        weekNumber: 1,
        trainings: [
          { id: 1, title: 'Пн — Грудь / Трицепс' },
          { id: 2, title: 'Ср — Спина / Бицепс' },
          { id: 3, title: 'Пт — Ноги' },
        ],
      },
      {
        weekNumber: 2,
        trainings: [
          { id: 4, title: 'Пн — Грудь / Трицепс' },
          { id: 5, title: 'Ср — Спина / Бицепс' },
          { id: 6, title: 'Пт — Ноги' },
        ],
      },
    ],
    [],
  )

  return (
    <div className="mt-6 space-y-3">
      {weeks.map((w) => (
        <WeekTemplate key={w.weekNumber} weekNumber={w.weekNumber} trainings={w.trainings} />
      ))}
    </div>
  )
}

