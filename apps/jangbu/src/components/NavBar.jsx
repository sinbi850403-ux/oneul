import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/input',    label: '입력' },
  { to: '/calendar', label: '달력' },
  { to: '/history',  label: '내역' },
  { to: '/tax',      label: '세금' },
  { to: '/board',    label: '게시판' },
  { to: '/settings', label: '설정' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-stone-100 shadow-[0_-6px_20px_-8px_rgba(41,33,26,0.08)] flex px-2 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 my-1.5 mx-0.5 rounded-2xl transition-colors ${
              isActive ? 'text-brand bg-orange-50 font-semibold' : 'text-stone-400'
            }`
          }
        >
          <span className="text-[11px] tracking-tight">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
