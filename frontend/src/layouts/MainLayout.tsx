import { Outlet, useLocation } from "react-router-dom"
import BottomNav from "../components/BottomNav"
import SideNav from "../components/SideNav"

const authRoutes = new Set(["/login", "/signup", "/onboarding"])

export default function MainLayout() {
  const location = useLocation()
  const isAuthRoute = authRoutes.has(location.pathname)

  if (isAuthRoute) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex min-h-screen">
        <SideNav />
        <main className="flex-1 px-6 pb-24 pt-10 md:px-10 md:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
