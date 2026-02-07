import { NavLink } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

interface NavItemProps {
  to: string
  icon: string
  label: string
}

const NavItem = ({ to, icon, label }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
        ? "bg-primary/10 text-primary border border-primary/20"
        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
      }`
    }
  >
    <span className={`material-symbols-outlined ${to === "/" ? "fill-1" : ""}`}>{icon}</span>
    <span className="text-sm font-semibold">{label}</span>
  </NavLink>
)

export default function SideNav() {
  const { user } = useAuth()

  return (
    <aside className="w-72 glass-sidebar hidden lg:flex flex-col justify-between p-6 z-50">
      <div className="flex flex-col gap-8">
        {/* User Profile Section */}
        <div className="flex items-center gap-4 p-2">
          <div className="relative">
            <div className="size-12 rounded-full border-2 border-primary p-0.5">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.username ?? "User"}&background=8c2bee&color=fff`}
                alt="User profile"
                className="rounded-full w-full h-full object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background-dark rounded-full"></span>
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide uppercase text-white/90 truncate w-32">
              {user?.username ?? "User"}
            </h2>
            <p className="text-xs text-primary/80 font-medium">Elite Member</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2">
          <NavItem to="/" icon="dashboard" label="Dashboard" />
          <NavItem to="/wardrobe" icon="styler" label="Virtual Closet" />
          <NavItem to="/profile" icon="settings" label="Settings" />
        </nav>
      </div>

      {/* Upgrade Banner */}
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col gap-3">
        <p className="text-xs text-center text-white/70">
          Elevate your experience with more wardrobe insights.
        </p>
        <button className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-primary/20">
          Upgrade to Pro
        </button>
      </div>
    </aside>
  )
}
