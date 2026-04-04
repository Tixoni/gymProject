import React from 'react'
import { THEME_COLORS } from '../theme'

function NavButton({ icon, label, isActive, onClick }) {
  const baseClasses =
    'flex min-h-10 min-w-0 flex-1 max-w-full items-center justify-center rounded-xl shadow-md transition sm:min-h-11 sm:rounded-2xl lg:min-h-14 lg:rounded-2xl xl:min-h-[3.75rem]'
  const stateClasses = isActive
    ? THEME_COLORS.navButtonActive
    : THEME_COLORS.navButtonInactive

  const className = `${baseClasses} ${stateClasses}`

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
    >
      <img
        src={icon}
        alt=""
        aria-hidden
        className="h-6 w-6 max-h-[28px] max-w-[28px] object-contain sm:h-7 sm:w-7 lg:h-9 lg:w-9 lg:max-h-none lg:max-w-none xl:h-10 xl:w-10"
      />
    </button>
  )
}

export default NavButton
