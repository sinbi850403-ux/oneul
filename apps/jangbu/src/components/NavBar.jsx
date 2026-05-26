import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/input',    icon: '✏️', label: '입력' },
  { to: '/calendar', icon: '📅', label: '달력' },
  { to: '/tax',      icon: '💰', label: '세금' },
  { to: '/settings', icon: '⚙️', label: '설정' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex">
      {tabs.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
              isActive ? 'text-brand font-semibold' : 'text-gray-400'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
