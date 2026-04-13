import { useEffect, useState } from 'react'
import { THEME_COLORS } from '../theme'

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

const STORAGE_KEY = 'ui-theme-overrides-v1'

export function readThemeOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    window.location.reload()
  }

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
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
    </div>
  )
}

