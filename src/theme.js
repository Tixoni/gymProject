/**
 * Цвета и визуальные токены приложения.
 * Значения — классы Tailwind; правьте здесь, чтобы менять тему в одном месте.
 */
export const THEME_COLORS = {
  // Оболочка приложения
  appBackground: 'bg-zinc-950',

  // Верхняя и нижняя панели (хром)
  chrome: 'bg-black',
  chromeText: 'text-zinc-50',
  chromeBorder: 'border-zinc-800',

  // Шапка
  headerShadow: 'shadow-lg',

  // Контент
  contentText: 'text-zinc-200',
  contentMuted: 'text-zinc-400',
  heading: 'text-zinc-50',

  // Нижняя навигация — кнопки
  navButtonActive: 'bg-zinc-900',
  navButtonInactive: 'bg-zinc-800 opacity-70',

  // Списки / акценты (дальнейшие экраны)
  sectionBackground: 'bg-zinc-900',
  sectionItemBackground: 'bg-zinc-900',
  accentBg: 'bg-orange-500',
  accentBgHover: 'hover:bg-orange-600',
  accentText: 'text-orange-500',
  accentCheckbox: 'text-orange-500',
  dateTextPrimary: 'text-zinc-400',
  dateTextSecondary: 'text-zinc-500',

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
  buttonPrimaryText: 'text-zinc-950',
  errorBg: 'bg-red-950/40',
  errorBorder: 'border-red-900/50',
  errorText: 'text-red-200',
  dangerBorder: 'border-red-900/60',
  dangerBg: 'bg-red-950/40',
  dangerText: 'text-red-200',
  dangerHover: 'hover:bg-red-950/70',
  successHintText: 'text-emerald-300/90',

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
