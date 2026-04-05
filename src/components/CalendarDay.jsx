import { THEME_COLORS } from '../theme'

function CalendarDay({ date, isToday, isSelected, isOtherMonth, hasPending, onSelect }) {
  if (!date) {
    return <div className="h-12" />;
  }

  const dayNumber = date.getDate();

  const baseCircle =
    'w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors';

  let circleClasses = isOtherMonth ? 'text-zinc-600 opacity-60' : 'text-zinc-300';
  if (isSelected) {
    circleClasses = `${THEME_COLORS.accentBg} text-white opacity-100`;
  } else if (isToday) {
    circleClasses = 'border border-white text-white opacity-100';
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className="flex flex-col items-center justify-center gap-1 h-12"
    >
      <div className={`${baseCircle} ${circleClasses}`}>
        {dayNumber}
      </div>
      {hasPending && (
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      )}
    </button>
  );
}

export default CalendarDay

