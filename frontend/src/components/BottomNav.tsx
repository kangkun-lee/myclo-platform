import { NavLink } from "react-router-dom"
import { navItems } from "./navigation"

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-bg/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
