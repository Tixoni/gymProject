/** Локальный ключ даты YYYY-MM-DD (без UTC-сдвига при парсинге). */
export function getDateKey(value: Date | string | number | null | undefined): string | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKeyLocal(dateKey: string | null | undefined): Date | null {
  if (!dateKey || typeof dateKey !== 'string') return null
  const parts = dateKey.split('-').map((p) => Number(p))
  if (parts.length !== 3) return null
  const [y, m, d] = parts
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKeyLocal(dateKey)
  if (!d) return dateKey
  d.setDate(d.getDate() + deltaDays)
  return getDateKey(d) ?? dateKey
}

export function formatCommaNum(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Реальная дата для календаря (не пустая строка и парсится локально). */
export function isValidCalendarDateKey(
  s: string | null | undefined,
): boolean {
  if (s == null || typeof s !== 'string') return false
  const t = s.trim()
  if (!DATE_KEY_RE.test(t)) return false
  const d = parseDateKeyLocal(t)
  return d != null && !Number.isNaN(d.getTime())
}

/**
 * Ближайший ключ даты для дня недели: Пн = 1 … Вс = 7 (как `dayOfTheWeek` в БД).
 * Отсчёт с `from` включительно.
 */
export function nextDateKeyForWeekday(
  weekday1to7: number,
  from: Date = new Date(),
): string | null {
  if (weekday1to7 < 1 || weekday1to7 > 7) return null
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let add = 0; add < 14; add += 1) {
    const d = new Date(base)
    d.setDate(base.getDate() + add)
    const js = d.getDay()
    const dow = js === 0 ? 7 : js
    if (dow === weekday1to7) return getDateKey(d)
  }
  return null
}
