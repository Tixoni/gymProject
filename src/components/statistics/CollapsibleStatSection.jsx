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
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left lg:px-5 lg:py-5"
        aria-expanded={open}
      >
        <h2
          className={`text-base font-semibold lg:text-lg ${THEME_COLORS.heading}`}
        >
          {title}
        </h2>
        <span
          className={`mt-0.5 shrink-0 text-sm ${THEME_COLORS.contentMuted}`}
          aria-hidden
        >
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open ? (
        <div
          className={`border-t px-4 pb-4 pt-3 lg:px-5 lg:pb-5 ${THEME_COLORS.chromeBorder}`}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
