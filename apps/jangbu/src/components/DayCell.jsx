export default function DayCell({ day, total, isToday, onClick }) {
  if (!day) return <div />

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-2 rounded-xl active:bg-orange-50 ${
        isToday ? 'bg-orange-50' : ''
      }`}
    >
      <span className={`text-sm font-medium mb-1 ${isToday ? 'text-brand font-bold' : 'text-gray-700'}`}>
        {day}
      </span>
      {total > 0 ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-brand mb-0.5" />
          <span className="text-xs text-gray-500 leading-tight">
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
