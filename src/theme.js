/**
 * Цвета и визуальные токены приложения.
 * Значения — классы Tailwind; правьте здесь, чтобы менять тему в одном месте.
 */
export const THEME_COLORS = {
  // Оболочка приложения
  appBackground: 'bg-[var(--app-bg)]',

  // Верхняя и нижняя панели (хром)
  chrome: 'bg-[var(--chrome-bg)]',
  chromeText: 'text-[var(--chrome-text)]',
  chromeBorder: 'border-[var(--chrome-border)]',

  // Шапка
  headerShadow: 'shadow-lg',

  // Контент
  contentText: 'text-[var(--content-text)]',
  contentMuted: 'text-[var(--content-muted)]',
  heading: 'text-[var(--heading-text)]',

  // Нижняя навигация — кнопки
  navButtonActive: 'bg-[var(--nav-active-bg)]',
  navButtonInactive: 'bg-[var(--nav-inactive-bg)] opacity-70',

  // Списки / акценты (дальнейшие экраны)
  sectionBackground: 'bg-[var(--section-bg)]',
  sectionItemBackground: 'bg-[var(--section-item-bg)]',
  accentBg: 'bg-[var(--accent-bg)]',
  accentBgHover: 'hover:bg-[var(--accent-bg-hover)]',
  accentText: 'text-[var(--accent-text)]',
  accentCheckbox: 'text-[var(--accent-text)]',
  dateTextPrimary: 'text-[var(--date-text-primary)]',
  dateTextSecondary: 'text-[var(--date-text-secondary)]',

  // Модальные окна и формы
  modalBackdrop: 'bg-black/70',
  modalPanel: 'bg-zinc-950/95',
  modalBorder: 'border-zinc-800',
  modalSectionBorder: 'border-zinc-800',
  inputBorder: 'border-zinc-800',
  inputBg: 'bg-zinc-900/40',
  inputText: 'text-zinc-100',
  inputPlaceholder: 'placeholder:text-zinc-500',
  inputDisabled: 'disabled:opacity-50',
  buttonGhostBorder: 'border-zinc-700',
  buttonGhostBg: 'bg-zinc-950/40',
  buttonGhostText: 'text-zinc-200',
  buttonGhostHover: 'hover:bg-zinc-900/25',
  buttonPrimaryText: 'text-[var(--button-primary-text)]',
  errorBg: 'bg-red-950/40',
  errorBorder: 'border-red-900/50',
  errorText: 'text-red-200',
  dangerBorder: 'border-red-900/60',
  dangerBg: 'bg-red-950/40',
  dangerText: 'text-red-200',
  dangerHover: 'hover:bg-red-950/70',
  successHintText: 'text-[var(--accent-text)]',

  // Карточки статистики
  cardSubtleBg: 'bg-zinc-950/30',
  cardSubtleBorder: 'border-zinc-800',
  labelText: 'text-zinc-400',
  valueText: 'text-zinc-100',

  // Радио-кнопки статуса (тренировка/чекбоксы состояния)
  statusDoneOn: 'border-green-500/60 bg-green-950/40 text-green-300',
  statusDoneOff: 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600',
  statusNotDoneOn: 'border-red-500/60 bg-red-950/40 text-red-300',
  statusNotDoneOff: 'border-zinc-700/70 bg-zinc-900/20 text-zinc-600',
}

/** Адаптивные классы вёрстки (отступы, типографика) */
export const THEME_LAYOUT = {
  /** Внешние отступы контента */
  pagePadding: 'px-4 sm:px-6 lg:px-10 xl:px-12',
  /** Шапка */
  headerPadding: 'px-4 py-3 sm:px-6 sm:py-4 lg:px-10 lg:py-5 xl:px-12',
  headerTitle:
    'text-lg font-bold tracking-tight sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl',
  /** Основная область */
  mainPadding: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8 xl:px-12 xl:py-10',
  /** Подвал + навигация */
  footerPadding: 'px-2 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-4 xl:px-10',
  /** Оболочка на всю ширину вьюпорта; при необходимости узкий блок — внутри main */
  maxContentWidth: 'w-full min-w-0 max-w-none',
}
