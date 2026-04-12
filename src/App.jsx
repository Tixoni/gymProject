import { useState } from 'react'
import CalendarTab from './components/CalendarTab'
import NavButton from './components/NavButton'
import TrainingProgramsTab from './components/TrainingProgramsTab'
import StatisticsTab from './components/StatisticsTab'
import SettingsTab, { getResolvedThemeVars } from './components/SettingsTab'
import TodayTab from './components/TodayTab'

import { ReactComponent as iconToday } from './assets/today.svg?react'
import { ReactComponent as iconCallendary } from './assets/callendary_v2.svg?react'
import { ReactComponent as iconPrograms } from './assets/trainingPrograms.svg?react'
import { ReactComponent as iconStatistics } from './assets/statistics.svg?react'
import { ReactComponent as iconSettings } from './assets/gear.svg?react'
import { THEME_COLORS, THEME_LAYOUT } from './theme'
import './App.css'

/** Отступы под фиксированные шапку и таббар (синхрон с высотой header/footer на lg+) */
const MAIN_INSETS =
  'pt-[4.25rem] pb-28 sm:pt-24 sm:pb-32 lg:pt-28 lg:pb-36 xl:pt-32 xl:pb-40'

function App() {
  const [activeTab, setActiveTab] = useState('today')
  const [programCycles, setProgramCycles] = useState([])

  const handleRefreshPrograms = async () => {
    if (!programCycles?.length) return
    setProgramCycles((prev) => prev ?? [])
  }

  const handleRemoveProgramCycle = (id) => {
    if (!id) return
    setProgramCycles((prev) => (prev ?? []).filter((c) => c?.id !== id))
  }
  const themeVars = getResolvedThemeVars()

  return (
    <div
      style={themeVars}
      className={`flex min-h-dvh min-h-full flex-1 flex-col ${THEME_LAYOUT.maxContentWidth} ${THEME_COLORS.appBackground}`}
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
        {activeTab === 'statistics' && (
          <h1 className={`text-left ${THEME_LAYOUT.headerTitle}`}>Статистика</h1>
        )}
        {activeTab === 'settings' && (
          <h1 className={`text-left ${THEME_LAYOUT.headerTitle}`}>Настройки</h1>
        )}
      </header>

      <main
        className={`min-h-0 min-w-0 flex-1 overflow-y-auto text-left ${MAIN_INSETS} ${THEME_LAYOUT.mainPadding} ${THEME_COLORS.contentText}`}
      >
        {activeTab === 'today' && (
          <TodayTab />
        )}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'trainingPrograms' && (
          <TrainingProgramsTab
            cycles={programCycles}
            onRefresh={handleRefreshPrograms}
            onRemoveCycle={handleRemoveProgramCycle}
          />
        )}
        {activeTab === 'statistics' && <StatisticsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <footer
        className={`fixed bottom-0 left-0 right-0 shrink-0 border-t ${THEME_COLORS.chromeBorder} ${THEME_COLORS.chrome} ${THEME_LAYOUT.footerPadding} pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
      >
        <nav className="flex w-full items-stretch justify-center gap-1 sm:gap-2 md:gap-3 lg:gap-4">
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
          <NavButton
            icon={iconStatistics}
            label="Статистика"
            isActive={activeTab === 'statistics'}
            onClick={() => setActiveTab('statistics')}
          />
          <NavButton
            icon={iconSettings}
            label="Настройки"
            isActive={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>
      </footer>
    </div>
  )
}

export default App
