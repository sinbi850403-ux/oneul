export default function DayCell({ day, total, isToday, onClick }) {
  if (!day) return <div />

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2.5 rounded-2xl transition-colors active:bg-orange-50 ${
        isToday ? 'bg-orange-50' : ''
      }`}
    >
      <span className={`text-sm font-medium mb-1 ${isToday ? 'text-brand font-bold' : 'text-stone-700'}`}>
        {day}
      </span>
      {total > 0 ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-brand mb-0.5" />
          <span className="text-[11px] text-stone-500 leading-tight">
            {total >= 10000
              ? `${Math.round(total / 10000)}만`
              : total.toLocaleString()}
          </span>
        </>
      ) : (
        <span className="w-1.5 h-1.5" />
      )}
    </button>
  )
}
