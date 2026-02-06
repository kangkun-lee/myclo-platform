import { NavLink } from "react-router-dom"

const mobileNavItems = [
  { label: "Home", to: "/", icon: "dashboard" },
  { label: "Wardrobe", to: "/wardrobe", icon: "styler" },
  { label: "Stylist", to: "/chat", icon: "auto_awesome" },
  { label: "Profile", to: "/profile", icon: "person" },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-background-dark/80 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-around px-2 py-4">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all ${isActive ? "text-primary scale-110" : "text-white/40"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined ${isActive ? "fill-1" : ""}`}>{item.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
