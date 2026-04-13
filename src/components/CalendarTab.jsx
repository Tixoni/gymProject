import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '../storage/db'
import { workoutService } from '../storage/workoutService'
import { THEME_COLORS } from '../theme'
import {
  getDateKey,
  parseDateKeyLocal,
} from '../utils/dateKeys'
import CalendarDay from './CalendarDay'
import TrainingTemplate from './TrainingTemplate'

const DEFAULT_SET_STATUS = 'not_completed'

export default function CalendarTab() {
  const todayKey = useMemo(() => getDateKey(new Date()) ?? '', [])
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  const [calendarView, setCalendarView] = useState('month')
  const [calendarSlideDir, setCalendarSlideDir] = useState(0)

  const exercises = useLiveQuery(() => db.exercisesTable.toArray(), [])
  const exercisesById = useMemo(() => {
    const map = {}
    for (const e of exercises ?? []) {
      if (e.exerciseId != null) {
        map[e.exerciseId] = { title: e.title, imgTitle: e.imgTitle }
      }
    }
    return map
  }, [exercises])

  const trainingDateKeys = useLiveQuery(
    () => workoutService.listDateKeysWithPlannedTrainings(),
    [],
  )
  const trainingKeySet = useMemo(
    () => new Set(trainingDateKeys ?? []),
    [trainingDateKeys],
  )

  const dayTrainings = useLiveQuery(
    () =>
      selectedDateKey
        ? workoutService.getTrainingsOnDateKey(selectedDateKey)
        : Promise.resolve([]),
    [selectedDateKey],
  )

  const selectedDate = parseDateKeyLocal(selectedDateKey) || new Date()
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()

  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastOfMonth.getDate()
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7

  const calendarCells = []
  const prevMonthLastDate = new Date(year, month, 0).getDate()
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthLastDate - i
    calendarCells.push({
      date: new Date(year, month - 1, day),
      isOtherMonth: true,
    })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({
      date: new Date(year, month, day),
      isOtherMonth: false,
    })
  }
  const nextMonthStart = new Date(year, month + 1, 1)
  let nextDay = 1
  while (calendarCells.length % 7 !== 0 || calendarCells.length < 42) {
    calendarCells.push({
      date: new Date(
        nextMonthStart.getFullYear(),
        nextMonthStart.getMonth(),
        nextDay,
      ),
      isOtherMonth: true,
    })
    nextDay += 1
  }

  const selectedWeekStart = (() => {
    const d = parseDateKeyLocal(selectedDateKey) || new Date()
    const weekday = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - weekday)
    return d
  })()
  const weekCells = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(
      selectedWeekStart.getFullYear(),
      selectedWeekStart.getMonth(),
      selectedWeekStart.getDate() + i,
    )
    return {
      date,
      isOtherMonth: date.getMonth() !== month,
    }
  })

  const hasTrainingForDay = useCallback(
    (dateKey) => Boolean(dateKey && trainingKeySet.has(dateKey)),
    [trainingKeySet],
  )

  const changeMonth = (delta) => {
    const d = parseDateKeyLocal(selectedDateKey) || new Date()
    d.setMonth(d.getMonth() + delta)
    const nk = getDateKey(d)
    if (nk) setSelectedDateKey(nk)
    setCalendarSlideDir(delta > 0 ? 1 : -1)
    window.setTimeout(() => setCalendarSlideDir(0), 320)
  }

  const handleUpdateSet = useCallback(async (updated) => {
    if (updated?.setId == null) return
    const { setId, ...rest } = updated
    await workoutService.updateSetById(setId, rest)
  }, [])

  const markTrainingAllSets = useCallback(async (trainingId, status) => {
    const list = (dayTrainings ?? []).find(
      (b) => b.training.trainingId === trainingId,
    )?.sets
    if (!list?.length) return
    await Promise.all(
      list
        .filter((s) => s.setId != null)
        .map((s) => workoutService.updateSetById(s.setId, { status })),
    )
  }, [dayTrainings])

  useEffect(() => {
    if (todayKey && !selectedDateKey) setSelectedDateKey(todayKey)
  }, [todayKey, selectedDateKey])

  return (
    <div className={`min-h-0 ${THEME_COLORS.contentText}`}>
      <div className="sticky top-0 z-[5] -mx-4 border-b border-zinc-800/80 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div>
          <h2 className={`text-lg font-bold tracking-tight sm:text-xl ${THEME_COLORS.heading}`}>
            {selectedDate.toLocaleDateString('ru-RU', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <p className={`mt-1 text-sm ${THEME_COLORS.dateTextPrimary}`}>
            {selectedDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-xs text-zinc-500">
          <span>Пн</span>
          <span>Вт</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span>Сб</span>
          <span>Вс</span>
        </div>
      </div>

      <div className="mt-4 space-y-6 pb-8">
        <div
          className={`space-y-4 ${
            calendarSlideDir === 1
              ? 'calendar-slide-left'
              : calendarSlideDir === -1
                ? 'calendar-slide-right'
                : ''
          }`}
        >
          <div className={`rounded-2xl ${THEME_COLORS.sectionBackground} p-4`}>
            <div className="overflow-hidden">
              <div
                className={`grid grid-cols-7 gap-y-2 transition-all duration-300 ${
                  calendarView === 'month'
                    ? 'max-h-[520px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                {calendarCells.map((cell) => {
                  const key = getDateKey(cell.date)
                  return (
                    <CalendarDay
                      key={key ?? String(cell.date?.getTime())}
                      date={cell.date}
                      isToday={key === todayKey}
                      isSelected={key === selectedDateKey}
                      isOtherMonth={cell.isOtherMonth}
                      hasPending={hasTrainingForDay(key)}
                      onSelect={(d) => {
                        const k = getDateKey(d)
                        if (k) setSelectedDateKey(k)
                      }}
                    />
                  )
                })}
              </div>

              <div
                className={`grid grid-cols-7 gap-y-2 transition-all duration-300 ${
                  calendarView === 'week'
                    ? 'mt-0 max-h-[80px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                {weekCells.map((cell) => {
                  const key = getDateKey(cell.date)
                  return (
                    <CalendarDay
                      key={`w-${key ?? cell.date?.getTime()}`}
                      date={cell.date}
                      isToday={key === todayKey}
                      isSelected={key === selectedDateKey}
                      isOtherMonth={cell.isOtherMonth}
                      hasPending={hasTrainingForDay(key)}
                      onSelect={(d) => {
                        // В режиме "Неделя" не перелистываем месяц кликом по крайним дням.
                        if (cell.isOtherMonth) return
                        const k = getDateKey(d)
                        if (k) setSelectedDateKey(k)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDateKey(todayKey)
                  setCalendarView('month')
                }}
                className={`rounded-full border border-transparent px-3 py-2 text-sm text-white transition active:scale-[0.98] ${THEME_COLORS.accentBg} ${THEME_COLORS.accentBgHover}`}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                Предыдущий месяц
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-full bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                Следующий месяц
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarView('month')}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  calendarView === 'month'
                    ? `${THEME_COLORS.accentBg} border-transparent text-white`
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                Месяц
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('week')}
                className={`rounded-full border px-3 py-2 text-sm transition ${
                  calendarView === 'week'
                    ? `${THEME_COLORS.accentBg} border-transparent text-white`
                    : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                Неделя
              </button>
            </div>
          </div>
        </div>

        <section>
          <h3 className={`mb-3 text-base font-semibold ${THEME_COLORS.heading}`}>
            Тренировки на выбранный день
          </h3>
          {dayTrainings === undefined ? (
            <p className="text-sm text-zinc-500">Загрузка…</p>
          ) : !dayTrainings.length ? (
            <p className="text-sm text-zinc-500">
              Нет запланированных тренировок. Маркер под днём означает, что
              тренировка в базе.
            </p>
          ) : (
            <ul className="list-none space-y-3 p-0">
              {dayTrainings.map(({ training, sets }) => {
                const tid = training.trainingId
                if (tid == null) return null
                const dow = training.dayOfTheWeek
                const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                const dayLabel =
                  dow != null && dow >= 1 && dow <= 7
                    ? labels[dow - 1]
                    : 'Тренировка'
                return (
                  <li key={tid}>
                    <TrainingTemplate
                      training={{
                        trainingId: tid,
                        dayLabel,
                        date: selectedDateKey,
                      }}
                      sets={sets}
                      exercisesById={exercisesById}
                      onUpdateSet={handleUpdateSet}
                      onMarkTrainingCompleted={() =>
                        markTrainingAllSets(tid, 'completed')
                      }
                      onMarkTrainingNotCompleted={() =>
                        markTrainingAllSets(tid, DEFAULT_SET_STATUS)
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
