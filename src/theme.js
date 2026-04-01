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
}

/** Адаптивные классы вёрстки (отступы, типографика) */
export const THEME_LAYOUT = {
  /** Внешние отступы контента */
  pagePadding: 'px-4 sm:px-6 lg:px-8',
  /** Шапка */
  headerPadding: 'px-4 py-3 sm:px-6 sm:py-4',
  headerTitle: 'text-lg font-bold tracking-tight sm:text-xl md:text-2xl',
  /** Основная область */
  mainPadding: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8',
  /** Подвал + навигация */
  footerPadding: 'px-2 py-2 sm:px-4 sm:py-3',
  /** Ограничение ширины на очень широких экранах (остаётся «резиновым» до лимита) */
  maxContentWidth: 'w-full max-w-full min-[1800px]:max-w-[90rem] min-[1800px]:mx-auto',
}
