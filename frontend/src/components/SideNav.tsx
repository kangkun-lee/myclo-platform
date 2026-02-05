import { NavLink } from "react-router-dom"
import { navItems } from "./navigation"

export default function SideNav() {
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:gap-2 md:border-r md:border-white/10 md:bg-bg md:px-4 md:py-8">
      <div className="px-2 pb-6">
        <div className="text-lg font-semibold tracking-wide text-primary">
          MyClo
        </div>
        <p className="text-xs text-muted">Your AI stylist</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-white/5 text-primary"
                  : "text-muted hover:bg-white/5 hover:text-text"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
