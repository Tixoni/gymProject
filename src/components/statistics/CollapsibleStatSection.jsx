import { THEME_COLORS } from '../../theme'

/**
 * Секция статистики с заголовком-кнопкой и треугольником справа.
 */
export default function CollapsibleStatSection({
  title,
  open,
  onToggle,
  children,
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border ${THEME_COLORS.chromeBorder} ${THEME_COLORS.sectionBackground}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-zinc-900/25 lg:gap-4 lg:px-5 lg:py-4"
        aria-expanded={open}
      >
        <h2
          className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
        >
          {title}
        </h2>
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 text-zinc-300 transition lg:h-8 lg:w-8 lg:text-lg ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t px-4 pb-4 pt-3 lg:px-5 lg:pb-5 ${THEME_COLORS.chromeBorder}`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
