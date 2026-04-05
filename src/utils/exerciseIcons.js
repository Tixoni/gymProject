/**
 * Иконки упражнений: в БД в `imgTitle` хранится имя файла (например `приседания.png`)
 * или относительный путь внутри `src/assets/exercisesIcon` (например `ноги/файл.png`).
 * Если `imgTitle` нет, подбирается файл по совпадению с названием упражнения.
 */
const iconModules = import.meta.glob('../assets/exercisesIcon/**/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})

let basenameCache
let candidatesCache

function getBasenameMap() {
  if (basenameCache) return basenameCache
  basenameCache = {}
  for (const path of Object.keys(iconModules)) {
    const base = path.split(/[/\\]/).pop()
    if (base && basenameCache[base] == null) basenameCache[base] = iconModules[path]
  }
  return basenameCache
}

function normalizeSpaced(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, ' ')
}

function normalizeCompact(s) {
  return normalizeSpaced(s).replace(/\s/g, '')
}

function getIconCandidates() {
  if (candidatesCache) return candidatesCache
  candidatesCache = Object.entries(iconModules).map(([p, url]) => {
    const base = p.split(/[/\\]/).pop() || ''
    const name = base.replace(/\.(png|svg|jpe?g|webp)$/i, '')
    const spaced = normalizeSpaced(name)
    const compact = normalizeCompact(name)
    return { spaced, compact, url, len: spaced.length }
  })
  candidatesCache.sort((a, b) => b.len - a.len)
  return candidatesCache
}

function findUrlByExerciseTitle(exerciseTitle) {
  if (exerciseTitle == null || String(exerciseTitle).trim() === '') return null
  const t = normalizeSpaced(exerciseTitle)
  const tCompact = normalizeCompact(exerciseTitle)
  if (!t) return null
  const cands = getIconCandidates()
  if (!cands.length) return null

  for (const c of cands) {
    if (c.spaced === t) return c.url
  }
  for (const c of cands) {
    if (c.compact === tCompact) return c.url
  }
  for (const c of cands) {
    if (c.spaced.startsWith(t + ' ') || t.startsWith(c.spaced + ' ')) return c.url
  }
  if (t.length >= 8) {
    for (const c of cands) {
      if (c.spaced.includes(t) || t.includes(c.spaced)) return c.url
    }
  }
  return null
}

/**
 * @param {string | undefined | null} imgTitle
 * @param {string | undefined | null} exerciseTitle — если нет imgTitle, поиск файла по названию
 * @returns {string | null}
 */
export function getExerciseIconSrc(imgTitle, exerciseTitle) {
  if (imgTitle != null && String(imgTitle).trim() !== '') {
    const raw = String(imgTitle).trim()
    const normalizedPath = raw.replace(/\\/g, '/')
    const baseKey = normalizedPath.split('/').pop()

    const map = getBasenameMap()
    const byBase = (baseKey && map[baseKey]) || map[raw]
    if (byBase) return byBase

    const entry = Object.entries(iconModules).find(([p]) => {
      const u = p.replace(/\\/g, '/')
      return u.endsWith(normalizedPath) || u.endsWith(`/${normalizedPath}`)
    })
    if (entry) return entry[1]
  }

  return findUrlByExerciseTitle(exerciseTitle)
}
