export const UI_THEME_STORAGE_KEY = 'ui-theme-overrides-v1'
export const OVERDUE_MODE_STORAGE_KEY = 'overdue-workout-mode-v1'

export const OVERDUE_MODE_AUTO = 'auto'
export const OVERDUE_MODE_MANUAL = 'manual'

export function getOverdueHandlingMode() {
  try {
    const raw = localStorage.getItem(OVERDUE_MODE_STORAGE_KEY)
    if (raw === OVERDUE_MODE_AUTO || raw === OVERDUE_MODE_MANUAL) return raw
  } catch {
    // noop
  }
  return OVERDUE_MODE_AUTO
}

export function setOverdueHandlingMode(mode) {
  const value =
    mode === OVERDUE_MODE_MANUAL ? OVERDUE_MODE_MANUAL : OVERDUE_MODE_AUTO
  localStorage.setItem(OVERDUE_MODE_STORAGE_KEY, value)
}
