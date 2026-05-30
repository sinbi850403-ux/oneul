import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/input',    label: '입력',   icon: '✏️' },
  { to: '/calendar', label: '달력',   icon: '📅' },
  { to: '/history',  label: '내역',   icon: '📋' },
  { to: '/tax',      label: '세금',   icon: '💰' },
  { to: '/board',    label: '게시판', icon: '💬' },
  { to: '/settings', label: '설정',   icon: '⚙️' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              isActive ? 'text-brand font-semibold' : 'text-gray-400'
            }`
          }
        >
          <span className="text-lg leading-none">{icon}</span>
          <span className="text-[10px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
