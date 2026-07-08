import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { todayKST, getMonthRange } from '../lib/date.js'
import DayCell from '../components/DayCell.jsx'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar() {
  const today = todayKST()
  const [year, setYear] = useState(parseInt(today.slice(0, 4)))
  const [month, setMonth] = useState(parseInt(today.slice(5, 7)))
  const [salesMap, setSalesMap] = useState({})
  const navigate = useNavigate()

  const todayYear = parseInt(today.slice(0, 4))
  const todayMonth = parseInt(today.slice(5, 7))
  const minYear = todayYear - 1
  const minMonth = todayMonth
  const isAtMin = year < minYear || (year === minYear && month <= minMonth)
  const isAtMax = year === todayYear && month === todayMonth

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { start, end } = getMonthRange(year, month)
      const { data } = await supabase
        .from('sales')
        .select('sale_date, total')
        .eq('user_id', user.id)
        .gte('sale_date', start)
        .lte('sale_date', end)

      const map = {}
      data?.forEach(row => { map[row.sale_date] = row.total })
      setSalesMap(map)
    }
    load()
  }, [year, month])

  function prevMonth() {
    if (isAtMin) return
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isAtMax) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const monthTotal = Object.values(salesMap).reduce((a, b) => a + b, 0)
  const salesDays = Object.values(salesMap).filter(v => v > 0).length
  const avg = salesDays > 0 ? Math.round(monthTotal / salesDays) : 0

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          disabled={isAtMin}
          className="text-2xl px-2 text-stone-400 disabled:opacity-20"
        >
          ‹
        </button>
        <span className="text-lg font-bold text-stone-800">{year}년 {month}월</span>
        <button
          onClick={nextMonth}
          disabled={isAtMax}
          className="text-2xl px-2 text-stone-400 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      <div className="bg-orange-50 rounded-2xl px-5 py-4 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-stone-500">이번달 누계</span>
          <span className="text-2xl font-bold text-brand">₩ {monthTotal.toLocaleString('ko-KR')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-stone-500">일평균</span>
          <span className="text-base font-semibold text-stone-700">₩ {avg.toLocaleString('ko-KR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          const dateStr = day ? `${year}-${pad(month)}-${pad(day)}` : null
          return (
            <DayCell
              key={i}
              day={day}
              total={dateStr ? (salesMap[dateStr] ?? 0) : 0}
              isToday={dateStr === today}
              onClick={() => dateStr && navigate(`/input?date=${dateStr}`)}
            />
          )
        })}
      </div>
    </div>
  )
}
