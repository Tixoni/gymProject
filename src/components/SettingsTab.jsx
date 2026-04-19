import { useEffect, useState } from 'react'
import { THEME_COLORS } from '../theme'
import {
  getOverdueHandlingMode,
  OVERDUE_MODE_AUTO,
  OVERDUE_MODE_MANUAL,
  setOverdueHandlingMode,
  UI_THEME_STORAGE_KEY,
} from '../utils/appSettings'

const DEFAULT_THEME = {
  '--app-bg': '#09090b',
  '--chrome-text': '#fafafa',
  '--chrome-border': '#27272a',
  '--content-text': '#e4e4e7',
  '--content-muted': '#a1a1aa',
  '--heading-text': '#fafafa',
  '--section-bg': '#18181b',
  '--section-item-bg': '#18181b',
  '--nav-active-bg': '#18181b',
  '--nav-inactive-bg': '#27272a',
  '--accent-bg': '#f97316',
  '--accent-bg-hover': '#ea580c',
  '--accent-text': '#fb923c',
  '--date-text-primary': '#a1a1aa',
  '--date-text-secondary': '#71717a',
  '--button-primary-text': '#09090b',
  '--icon-active': '#fb923c',
  '--icon-inactive': '#a1a1aa',
}

export function readThemeOverrides() {
  try {
    const raw = localStorage.getItem(UI_THEME_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getResolvedThemeVars() {
  return { ...DEFAULT_THEME, ...readThemeOverrides() }
}

export default function SettingsTab() {
  const [form, setForm] = useState(getResolvedThemeVars())
  const [overdueMode, setOverdueMode] = useState(getOverdueHandlingMode())

  useEffect(() => {
    setForm(getResolvedThemeVars())
  }, [])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = () => {
    const payload = {}
    for (const [k, v] of Object.entries(form)) {
      if (v && v !== DEFAULT_THEME[k]) payload[k] = v
    }
    localStorage.setItem(UI_THEME_STORAGE_KEY, JSON.stringify(payload))
    setOverdueHandlingMode(overdueMode)
    window.location.reload()
  }

  const reset = () => {
    localStorage.removeItem(UI_THEME_STORAGE_KEY)
    setOverdueHandlingMode(OVERDUE_MODE_AUTO)
    window.location.reload()
  }

  return (
    <div className="mt-6 space-y-4 lg:mt-8">
      <section className={`rounded-2xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4`}>
        <h2 className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}>
          Настройки темы
        </h2>
        <p className={`mt-1 text-sm ${THEME_COLORS.contentMuted}`}>
          Меняйте базовые цвета интерфейса.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['--accent-bg', 'Основной цвет'],
            ['--accent-bg-hover', 'Цвет при наведении'],
            ['--app-bg', 'Фон приложения'],
            ['--section-bg', 'Фон карточек тренировок'],
            ['--content-text', 'Основной текст'],
          ].map(([k, label]) => (
            <label key={k} className={`block text-xs font-medium ${THEME_COLORS.contentMuted}`}>
              {label}
              <input
                type="color"
                value={form[k]}
                onChange={(e) => setField(k, e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-1"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={save}
            className={`rounded-xl ${THEME_COLORS.accentBg} px-4 py-2.5 text-sm font-semibold ${THEME_COLORS.buttonPrimaryText} ${THEME_COLORS.accentBgHover}`}
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={reset}
            className={`rounded-xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground} px-4 py-2.5 text-sm font-semibold ${THEME_COLORS.contentText}`}
          >
            Сбросить
          </button>
        </div>
      </section>

      <section className={`rounded-2xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground} p-4`}>
        <h2 className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}>
          Просроченные тренировки
        </h2>
        <p className={`mt-1 text-sm ${THEME_COLORS.contentMuted}`}>
          Выберите, как обрабатывать пропущенные дни в календаре.
        </p>
        <div className="mt-4 grid gap-2">
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground}`}>
            <input
              type="radio"
              name="overdueMode"
              checked={overdueMode === OVERDUE_MODE_AUTO}
              onChange={() => setOverdueMode(OVERDUE_MODE_AUTO)}
            />
            <span className={`text-sm ${THEME_COLORS.contentText}`}>
              Автоматический перенос
            </span>
          </label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionItemBackground}`}>
            <input
              type="radio"
              name="overdueMode"
              checked={overdueMode === OVERDUE_MODE_MANUAL}
              onChange={() => setOverdueMode(OVERDUE_MODE_MANUAL)}
            />
            <span className={`text-sm ${THEME_COLORS.contentText}`}>
              Ручной перенос (кнопка в календаре)
            </span>
          </label>
        </div>
      </section>
    </div>
  )
}

