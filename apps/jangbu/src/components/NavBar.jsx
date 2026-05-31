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
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex">
      {tabs.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 transition-colors ${
              isActive ? 'text-brand font-semibold' : 'text-gray-400'
            }`
          }
        >
          <span className="text-[11px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
