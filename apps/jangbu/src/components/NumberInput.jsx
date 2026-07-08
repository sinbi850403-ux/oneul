export default function NumberInput({ label, value, onChange }) {
  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    onChange(raw === '' ? 0 : parseInt(raw, 10))
  }

  const display = value === 0 ? '' : value.toLocaleString('ko-KR')

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-stone-100 last:border-b-0">
      <span className="text-stone-500 text-base font-medium w-28 shrink-0">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder="0"
        className="text-right text-lg font-semibold text-stone-900 flex-1 outline-none placeholder-stone-300"
      />
    </div>
  )
}
