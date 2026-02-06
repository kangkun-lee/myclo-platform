import { Outlet, useLocation, useNavigate } from "react-router-dom"
import SideNav from "../components/SideNav"
import BottomNav from "../components/BottomNav"
import { useAuth } from "../hooks/useAuth"
import { LogOut, User as UserIcon, Settings, ChevronDown } from "lucide-react"

const authRoutes = new Set(["/login", "/signup", "/onboarding"])

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isAuthRoute = authRoutes.has(location.pathname)

  if (isAuthRoute) {
    return <Outlet />
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      {/* Sidebar */}
      <SideNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {/* Header/Top Nav */}
        <header className="sticky top-0 z-40 px-8 py-4 bg-background-dark/30 backdrop-blur-md flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-3xl font-bold italic tracking-tight text-white">MyClo.</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative max-w-md hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xl">search</span>
              <input
                type="text"
                placeholder="Search your closet..."
                className="bg-white/5 border-none rounded-full pl-10 pr-4 py-2 w-64 text-sm text-white focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-white/5 text-white/70 relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-primary rounded-full"></span>
              </button>

              <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

              {/* User Profile / Logout Dropdown */}
              <div className="group relative">
                <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 transition-all">
                  <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                    <UserIcon size={16} />
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-white leading-none">{user?.username || "Account"}</p>
                    <p className="text-[10px] text-white/40 font-medium">Premium Member</p>
                  </div>
                  <ChevronDown size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-50">
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                    <Settings size={16} /> Settings
                  </button>
                  <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 pb-32 md:pb-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
          <Outlet />
        </div>

        {/* Mobile Nav */}
        <BottomNav />
      </main>
    </div>
  )
}
