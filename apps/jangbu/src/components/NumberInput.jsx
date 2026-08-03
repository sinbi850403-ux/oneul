import { useEffect, useRef } from 'react'

// 매출 입력 한 줄. 평소엔 항목명과 금액만 보이고, 탭하면 바로 아래에
// 전체 폭 입력창이 열린다.
//
// 예전엔 한 줄 안에서 오른쪽에 입력창을 붙였는데, flex 자식인 input 은
// min-width 가 auto 라 고유 폭(기본 size=20, 약 238px) 아래로 줄지 않았다.
// 라벨 폭까지 더하면 360px 폰에서 62px 이 넘쳤고, 탭하면 브라우저가 포커스된
// 입력창을 보여주려고 가로로 스크롤해 화면이 통째로 밀렸다.
// 지금은 입력창이 flex 자식이 아니라 w-full 블록이라 넘칠 수가 없다.
export default function NumberInput({ label, value, onChange, open, onToggle, onNext }) {
  const inputRef = useRef(null)

  // 탭해서 열면 바로 숫자를 칠 수 있게 포커스를 준다. 기존 값은 전체 선택해서
  // 새 금액을 치면 덮어쓰이게 한다 — 선택하지 않으면 커서가 끝에 붙어
  // 123,000 에 450,000 을 치면 123,000,450,000 이 된다.
  // 고칠 때는 입력창 안을 한 번 더 탭하면 커서가 그 자리로 간다.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    onChange(raw === '' ? 0 : parseInt(raw, 10))
  }

  // 한 화면에 입력창이 하나뿐이라 키보드의 '다음'이 원래 하던 항목 이동이
  // 사라진다. Enter 로 다음 항목을 열어 연속 입력 흐름을 유지한다.
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onNext?.()
    }
  }

  const display = value === 0 ? '' : value.toLocaleString('ko-KR')

  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 py-4 text-left"
      >
        <span className="text-stone-500 text-base font-medium truncate">{label}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className={`text-lg font-semibold ${value ? 'text-stone-900' : 'text-stone-300'}`}>
            {value ? value.toLocaleString('ko-KR') : '0'}
          </span>
          <svg
            viewBox="0 0 20 20" aria-hidden="true"
            className={`w-4 h-4 text-stone-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="pb-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="0"
            aria-label={label}
            className="w-full bg-stone-50 rounded-xl px-4 py-4 text-right text-2xl font-bold text-stone-900 outline-none focus:bg-white focus:ring-4 focus:ring-orange-100 transition-all placeholder-stone-300"
          />
        </div>
      )}
    </div>
  )
}
