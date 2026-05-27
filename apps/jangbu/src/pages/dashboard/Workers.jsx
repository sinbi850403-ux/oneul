import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function calcMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60 // 야간근무
  return diff
}

function fmtHours(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}

// 월요일 기준 주차 키
function weekKey(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().slice(0, 10)
}

// 주휴수당: 주 15시간 이상 근무 시 (주근무시간 / 40) × 8 × 시급
function calcWeeklyAllowance(logs, hourlyWage) {
  const weekMap = {}
  for (const log of logs) {
    const key = weekKey(log.work_date)
    const mins = calcMinutes(log.start_time, log.end_time) - (log.break_minutes || 0)
    weekMap[key] = (weekMap[key] || 0) + Math.max(0, mins)
  }
  let total = 0
  for (const mins of Object.values(weekMap)) {
    const hours = mins / 60
    if (hours >= 15) {
      total += Math.round((Math.min(hours, 40) / 40) * 8 * hourlyWage)
    }
  }
  return total
}

function won(n) {
  return '₩' + Math.round(n ?? 0).toLocaleString('ko-KR')
}

const MIN_WAGE_2026 = 10320

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function Workers() {
  const [workers, setWorkers]           = useState([])
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [tab, setTab]                   = useState('log') // 'log' | 'pay'

  // 알바생 추가 폼
  const [newName, setNewName]   = useState('')
  const [newWage, setNewWage]   = useState(MIN_WAGE_2026)
  const [adding, setAdding]     = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // 근무 입력 폼
  const today = new Date().toISOString().slice(0, 10)
  const [workDate, setWorkDate]   = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime]     = useState('18:00')
  const [breakMins, setBreakMins] = useState(60)
  const [workNote, setWorkNote]   = useState('')
  const [savingLog, setSavingLog] = useState(false)
  const [logSuccess, setLogSuccess] = useState('')

  // 근무 기록 목록
  const [workLogs, setWorkLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // 급여 계산 월 선택
  const now = new Date()
  const [payYear, setPayYear]   = useState(now.getFullYear())
  const [payMonth, setPayMonth] = useState(now.getMonth() + 1)

  // 알바생 삭제 확인
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { loadWorkers() }, [])

  useEffect(() => {
    if (selectedWorker) loadWorkLogs()
    else setWorkLogs([])
  }, [selectedWorker, payYear, payMonth])

  async function loadWorkers() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('workers')
      .select('*').eq('user_id', user.id).order('created_at')
    setWorkers(data ?? [])
  }

  async function loadWorkLogs() {
    setLogsLoading(true)
    const pad = n => String(n).padStart(2, '0')
    const start = `${payYear}-${pad(payMonth)}-01`
    const end   = `${payYear}-${pad(payMonth)}-${pad(new Date(payYear, payMonth, 0).getDate())}`
    const { data } = await supabase.from('work_logs')
      .select('*')
      .eq('worker_id', selectedWorker.id)
      .gte('work_date', start)
      .lte('work_date', end)
      .order('work_date')
    setWorkLogs(data ?? [])
    setLogsLoading(false)
  }

  async function handleAddWorker(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('workers').insert({
      user_id: user.id,
      name: newName.trim(),
      hourly_wage: Number(newWage) || MIN_WAGE_2026,
    }).select().single()
    if (data) {
      setWorkers(prev => [...prev, data])
      setSelectedWorker(data)
      setTab('log')
    }
    setNewName('')
    setNewWage(MIN_WAGE_2026)
    setAdding(false)
    setShowAddForm(false)
  }

  async function handleDeleteWorker(id) {
    if (!window.confirm('알바생과 모든 근무 기록이 삭제됩니다. 계속할까요?')) return
    setDeletingId(id)
    await supabase.from('workers').delete().eq('id', id)
    setWorkers(prev => prev.filter(w => w.id !== id))
    if (selectedWorker?.id === id) setSelectedWorker(null)
    setDeletingId(null)
  }

  async function handleAddLog(e) {
    e.preventDefault()
    if (!selectedWorker) return
    const netMins = calcMinutes(startTime, endTime) - Number(breakMins)
    if (netMins <= 0) {
      alert('근무 시간이 0 이하입니다. 시간을 확인해주세요.')
      return
    }
    setSavingLog(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('work_logs').insert({
      user_id:       user.id,
      worker_id:     selectedWorker.id,
      work_date:     workDate,
      start_time:    startTime,
      end_time:      endTime,
      break_minutes: Number(breakMins),
      note:          workNote || null,
    })
    await loadWorkLogs()
    setSavingLog(false)
    setLogSuccess(`${workDate} 근무 기록 저장됐어요!`)
    setWorkNote('')
    setTimeout(() => setLogSuccess(''), 3000)
  }

  async function handleDeleteLog(id) {
    await supabase.from('work_logs').delete().eq('id', id)
    setWorkLogs(prev => prev.filter(l => l.id !== id))
  }

  // ── 급여 계산 ────────────────────────────────────────────────────────────
  const totalWorkMins = workLogs.reduce((a, l) => {
    return a + Math.max(0, calcMinutes(l.start_time, l.end_time) - (l.break_minutes || 0))
  }, 0)
  const totalHours      = totalWorkMins / 60
  const hourlyWage      = selectedWorker?.hourly_wage ?? 0
  const basePay         = Math.round(totalHours * hourlyWage)
  const weeklyAllowance = calcWeeklyAllowance(workLogs, hourlyWage)
  const totalPay        = basePay + weeklyAllowance

  // 이번달 입력한 근무일 수 (총 log 수)
  const workDays = workLogs.length

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  const inputCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand w-full'
  const months   = Array.from({ length: 12 }, (_, i) => i + 1)
  const years    = [now.getFullYear() - 1, now.getFullYear()]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">알바 급여 관리</h2>

      <div className="flex gap-6 items-start">

        {/* ── 왼쪽: 알바생 목록 ── */}
        <div className="w-60 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">알바생</span>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="text-xs text-brand font-semibold hover:underline"
              >
                + 추가
              </button>
            </div>

            {/* 추가 폼 */}
            {showAddForm && (
              <form onSubmit={handleAddWorker} className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <input
                  className={inputCls + ' mb-2'}
                  placeholder="이름"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="flex items-center gap-1 mb-2">
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="시급"
                    value={newWage}
                    onChange={e => setNewWage(e.target.value)}
                    min={MIN_WAGE_2026}
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">원/h</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">2026 최저시급 {MIN_WAGE_2026.toLocaleString()}원</p>
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-1.5 bg-brand text-white text-xs font-semibold rounded-lg"
                >
                  {adding ? '추가 중...' : '등록'}
                </button>
              </form>
            )}

            {/* 알바생 목록 */}
            {workers.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                알바생을 추가해주세요
              </div>
            ) : (
              workers.map(w => (
                <div
                  key={w.id}
                  onClick={() => { setSelectedWorker(w); setTab('log') }}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    selectedWorker?.id === w.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${selectedWorker?.id === w.id ? 'text-brand' : 'text-gray-800'}`}>
                      {w.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      시급 {w.hourly_wage.toLocaleString()}원
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteWorker(w.id) }}
                    disabled={deletingId === w.id}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 오른쪽: 콘텐츠 ── */}
        <div className="flex-1 min-w-0">
          {!selectedWorker ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="text-4xl mb-4">👷</div>
              <p className="text-gray-500 text-sm">왼쪽에서 알바생을 선택하거나 추가해주세요</p>
            </div>
          ) : (
            <>
              {/* 탭 */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                {[['log', '📝 근무 입력'], ['pay', '💰 급여 정산']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── 탭: 근무 입력 ── */}
              {tab === 'log' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* 입력 폼 */}
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-4">
                      {selectedWorker.name} 근무 기록
                    </p>
                    <form onSubmit={handleAddLog} className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">날짜</label>
                        <input type="date" className={inputCls} value={workDate}
                          onChange={e => setWorkDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">출근</label>
                          <input type="time" className={inputCls} value={startTime}
                            onChange={e => setStartTime(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">퇴근</label>
                          <input type="time" className={inputCls} value={endTime}
                            onChange={e => setEndTime(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">휴게 시간 (분)</label>
                        <input type="number" className={inputCls} value={breakMins} min={0}
                          onChange={e => setBreakMins(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">메모 (선택)</label>
                        <input type="text" className={inputCls} placeholder="특이사항..."
                          value={workNote} onChange={e => setWorkNote(e.target.value)} />
                      </div>

                      {/* 미리보기 */}
                      {(() => {
                        const net = calcMinutes(startTime, endTime) - Number(breakMins)
                        const pay = Math.round((net / 60) * hourlyWage)
                        return net > 0 ? (
                          <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-sm">
                            <span className="text-gray-500">실 근무 </span>
                            <span className="font-semibold text-gray-800">{fmtHours(net)}</span>
                            <span className="text-gray-400 mx-2">·</span>
                            <span className="text-gray-500">이날 급여 </span>
                            <span className="font-bold text-brand">{won(pay)}</span>
                          </div>
                        ) : null
                      })()}

                      {logSuccess && (
                        <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-2 font-medium">
                          ✓ {logSuccess}
                        </div>
                      )}

                      <button type="submit" disabled={savingLog}
                        className="w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                        {savingLog ? '저장 중...' : '근무 기록 저장'}
                      </button>
                    </form>
                  </div>

                  {/* 이달 기록 목록 */}
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">
                        {payMonth}월 근무 기록
                      </span>
                      <div className="flex gap-1">
                        <select value={payYear} onChange={e => setPayYear(Number(e.target.value))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none">
                          {years.map(y => <option key={y} value={y}>{y}년</option>)}
                        </select>
                        <select value={payMonth} onChange={e => setPayMonth(Number(e.target.value))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none">
                          {months.map(m => <option key={m} value={m}>{m}월</option>)}
                        </select>
                      </div>
                    </div>
                    {logsLoading ? (
                      <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
                    ) : workLogs.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-400">근무 기록이 없습니다</div>
                    ) : (
                      <div className="overflow-y-auto max-h-80">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">날짜</th>
                              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">출근</th>
                              <th className="text-center px-3 py-2 text-xs text-gray-500 font-medium">퇴근</th>
                              <th className="text-right px-3 py-2 text-xs text-gray-500 font-medium">실 근무</th>
                              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">급여</th>
                              <th className="px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {workLogs.map(log => {
                              const net  = Math.max(0, calcMinutes(log.start_time, log.end_time) - log.break_minutes)
                              const pay  = Math.round((net / 60) * hourlyWage)
                              return (
                                <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700 font-medium">{log.work_date.slice(5)}</td>
                                  <td className="px-3 py-2 text-center text-gray-500">{log.start_time.slice(0,5)}</td>
                                  <td className="px-3 py-2 text-center text-gray-500">{log.end_time.slice(0,5)}</td>
                                  <td className="px-3 py-2 text-right text-gray-700">{fmtHours(net)}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-brand">{won(pay)}</td>
                                  <td className="px-2 py-2">
                                    <button onClick={() => handleDeleteLog(log.id)}
                                      className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 탭: 급여 정산 ── */}
              {tab === 'pay' && (
                <div>
                  {/* 월 선택 */}
                  <div className="flex gap-2 mb-4">
                    <select value={payYear} onChange={e => setPayYear(Number(e.target.value))}
                      className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand">
                      {years.map(y => <option key={y} value={y}>{y}년</option>)}
                    </select>
                    <select value={payMonth} onChange={e => setPayMonth(Number(e.target.value))}
                      className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand">
                      {months.map(m => <option key={m} value={m}>{m}월</option>)}
                    </select>
                  </div>

                  {workLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400 text-sm">
                      {payMonth}월 근무 기록이 없습니다
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* 급여 요약 카드 */}
                      <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                          <span className="text-2xl">💰</span>
                          <div>
                            <p className="font-bold text-gray-800">{selectedWorker.name}</p>
                            <p className="text-xs text-gray-400">{payYear}년 {payMonth}월 급여 명세</p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-5">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-500">근무 일수</span>
                            <span className="font-semibold text-gray-800">{workDays}일</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-500">총 근무 시간</span>
                            <span className="font-semibold text-gray-800">{fmtHours(totalWorkMins)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-500">시급</span>
                            <span className="font-semibold text-gray-800">{won(hourlyWage)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm text-gray-500">기본급</span>
                            <span className="font-semibold text-gray-800">{won(basePay)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <span className="text-sm text-gray-500">주휴수당</span>
                              <span className="text-xs text-gray-400 ml-1">(주 15h↑ 시 자동 적용)</span>
                            </div>
                            <span className={`font-semibold ${weeklyAllowance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {weeklyAllowance > 0 ? `+ ${won(weeklyAllowance)}` : '해당 없음'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-brand/5 rounded-xl px-4 py-3 flex justify-between items-center">
                          <span className="font-bold text-gray-800">이달 총 급여</span>
                          <span className="text-2xl font-bold text-brand">{won(totalPay)}</span>
                        </div>

                        {/* 공유 버튼 */}
                        <button
                          onClick={async () => {
                            const text = [
                              `📋 ${payYear}년 ${payMonth}월 급여 명세서`,
                              ``,
                              `👷 ${selectedWorker.name}`,
                              `근무 일수: ${workDays}일`,
                              `총 근무: ${fmtHours(totalWorkMins)}`,
                              `시급: ${won(hourlyWage)}`,
                              `기본급: ${won(basePay)}`,
                              weeklyAllowance > 0 ? `주휴수당: + ${won(weeklyAllowance)}` : null,
                              ``,
                              `💰 총 급여: ${won(totalPay)}`,
                              `— 오늘장부`,
                            ].filter(Boolean).join('\n')
                            try {
                              if (navigator.share) await navigator.share({ text })
                              else { await navigator.clipboard.writeText(text); alert('클립보드에 복사됐어요!') }
                            } catch {}
                          }}
                          className="w-full mt-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
                        >
                          ↗ 급여 명세 공유
                        </button>
                      </div>

                      {/* 주차별 주휴수당 내역 */}
                      <div className="bg-white rounded-2xl shadow-sm p-5">
                        <p className="text-sm font-semibold text-gray-700 mb-4">주차별 근무 현황</p>
                        {(() => {
                          const weekMap = {}
                          for (const log of workLogs) {
                            const key = weekKey(log.work_date)
                            const mins = Math.max(0, calcMinutes(log.start_time, log.end_time) - log.break_minutes)
                            if (!weekMap[key]) weekMap[key] = { mins: 0, days: 0 }
                            weekMap[key].mins += mins
                            weekMap[key].days += 1
                          }
                          return Object.entries(weekMap)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([monday, { mins, days }], i) => {
                              const hours = mins / 60
                              const hasAllowance = hours >= 15
                              const allowance = hasAllowance
                                ? Math.round((Math.min(hours, 40) / 40) * 8 * hourlyWage)
                                : 0
                              return (
                                <div key={monday} className={`rounded-xl p-3 mb-2 ${hasAllowance ? 'bg-green-50' : 'bg-gray-50'}`}>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="text-sm font-semibold text-gray-700">{i + 1}주차</span>
                                      <span className="text-xs text-gray-400 ml-2">{days}일 근무 · {fmtHours(mins)}</span>
                                    </div>
                                    <div className="text-right">
                                      {hasAllowance ? (
                                        <span className="text-xs font-semibold text-green-600">
                                          주휴수당 +{won(allowance)}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">주 15h 미만</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
