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
