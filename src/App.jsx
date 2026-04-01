import { useState } from 'react'
import NavButton from './components/NavButton'
import TrainingProgramsTab from './components/TrainingProgramsTab'
import iconToday from './assets/today.svg'
import iconCallendary from './assets/callendary_v2.svg'
import iconPrograms from './assets/trainingPrograms.svg'
import { THEME_COLORS, THEME_LAYOUT } from './theme'
import './App.css'

/** Отступы под фиксированные шапку и таббар */
const MAIN_INSETS = 'pt-[4.25rem] pb-28 sm:pt-24 sm:pb-32'

function App() {
  const [activeTab, setActiveTab] = useState('today')
  const [programCycles, setProgramCycles] = useState([])

  const computeTemplateCycles = async () => {
    const startDate = new Date().toISOString().slice(0, 10)
    return createAllTemplateCycles(startDate, {
      personalMaximums: DEFAULT_PERSONAL_MAXIMUMS,
      exercises: DEFAULT_EXERCISES,
    })
  }

  const handleSeedPrograms = async () => {
    const cycles = await computeTemplateCycles()
    setProgramCycles(cycles)
  }

  const handleRebuildPrograms = async () => {
    setProgramCycles((prev) => {
      const prevById = Object.fromEntries((prev ?? []).map((c) => [c.id, c]))
      return TRAINING_CYCLE_TEMPLATE_BLUEPRINTS.map((bp) => {
        const old = prevById[bp.id]
        return createCycleFromBlueprint(bp, {
          startDate: old?.startDate ?? new Date().toISOString().slice(0, 10),
          currentWeek: old?.currentWeek ?? 1,
          personalMaximums: DEFAULT_PERSONAL_MAXIMUMS,
          exercises: DEFAULT_EXERCISES,
        })
      })
    })
  }

  const handleRefreshPrograms = async () => {
    // Если циклы уже показаны — пересчитаем их от текущих данных в хранилище.
    // Если их нет — просто оставим пусто.
    if (!programCycles?.length) return
    await handleRebuildPrograms()
  }

  const handleRemoveProgramCycle = (id) => {
    if (!id) return
    setProgramCycles((prev) => (prev ?? []).filter((c) => c?.id !== id))
  }

  return (
    <div
      className={`flex min-h-dvh w-full flex-col ${THEME_LAYOUT.maxContentWidth} ${THEME_COLORS.appBackground}`}
    >
      <header
        className={`fixed left-0 right-0 top-0 z-10 w-full shrink-0 border-b ${THEME_COLORS.chromeBorder} ${THEME_COLORS.chrome} ${THEME_COLORS.chromeText} ${THEME_COLORS.headerShadow} ${THEME_LAYOUT.headerPadding}`}
      >
        {activeTab === 'today' && (
          <h1 className={`text-left ${THEME_LAYOUT.headerTitle}`}>Сегодня</h1>
        )}
        {activeTab === 'calendar' && (
          <h1 className={`text-left ${THEME_LAYOUT.headerTitle}`}>Календарь</h1>
        )}
        {activeTab === 'trainingPrograms' && (
          <h1 className={`text-left ${THEME_LAYOUT.headerTitle}`}>Программы</h1>
        )}
      </header>

      <main
        className={`min-h-0 flex-1 overflow-y-auto text-left ${MAIN_INSETS} ${THEME_LAYOUT.mainPadding} ${THEME_COLORS.contentText}`}
      >
        {activeTab === 'today' && (
          <div>
            <p className={THEME_COLORS.contentMuted}>
              Вкладка «Сегодня» — заглушка. Данные профиля и истории тренировок
              пока не подключены.
            </p>
          </div>
        )}
        {activeTab === 'calendar' && (
          <div>
            <h2 className={`text-base font-medium ${THEME_COLORS.heading}`}>
              Расписание
            </h2>
            <p className={`mt-2 text-sm ${THEME_COLORS.contentMuted}`}>
              Здесь позже отобразим расписание.
            </p>
          </div>
        )}
        {activeTab === 'trainingPrograms' && (
          <TrainingProgramsTab
            cycles={programCycles}
            onSeed={handleSeedPrograms}
            onRebuild={handleRebuildPrograms}
            onRefresh={handleRefreshPrograms}
            onRemoveCycle={handleRemoveProgramCycle}
          />
        )}
      </main>

      <footer
        className={`fixed bottom-0 left-0 right-0 shrink-0 border-t ${THEME_COLORS.chromeBorder} ${THEME_COLORS.chrome} ${THEME_LAYOUT.footerPadding} pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
      >
        <nav className="flex w-full items-stretch justify-center gap-1 sm:gap-2 md:gap-3">
          <NavButton
            icon={iconToday}
            label="Сегодня"
            isActive={activeTab === 'today'}
            onClick={() => setActiveTab('today')}
          />
          <NavButton
            icon={iconCallendary}
            label="Календарь"
            isActive={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
          />
          <NavButton
            icon={iconPrograms}
            label="Программы"
            isActive={activeTab === 'trainingPrograms'}
            onClick={() => setActiveTab('trainingPrograms')}
          />
        </nav>
      </footer>
    </div>
  )
}

export default App
