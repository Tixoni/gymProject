/**
 * Иконки упражнений: в БД в `imgTitle` хранится имя файла (например `приседания.png`)
 * или относительный путь внутри `src/assets/exercisesIcon` (например `ноги/файл.png`).
 */
const iconModules = import.meta.glob('../assets/exercisesIcon/**/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})

let basenameCache

function getBasenameMap() {
  if (basenameCache) return basenameCache
  basenameCache = {}
  for (const path of Object.keys(iconModules)) {
    const base = path.split(/[/\\]/).pop()
    if (base && basenameCache[base] == null) basenameCache[base] = iconModules[path]
  }
  return basenameCache
}

/**
 * @param {string | undefined | null} imgTitle
 * @returns {string | null}
 */
export function getExerciseIconSrc(imgTitle) {
  if (imgTitle == null || String(imgTitle).trim() === '') return null
  const raw = String(imgTitle).trim()
  const normalized = raw.replace(/\\/g, '/')

  const byBase = getBasenameMap()[raw]
  if (byBase) return byBase

  const entry = Object.entries(iconModules).find(([p]) => {
    const u = p.replace(/\\/g, '/')
    return u.endsWith(normalized) || u.endsWith(`/${normalized}`)
  })
  return entry ? entry[1] : null
}
