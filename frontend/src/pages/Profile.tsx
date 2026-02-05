import { useState } from "react"
import { Calendar, Settings } from "lucide-react"
import { useAuth } from "../hooks/useAuth"

const tabs = [
  { key: "profile", label: "Body Profile" },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "settings", label: "Settings", icon: Settings },
]

export default function Profile() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState("profile")
  const initial = user?.username?.[0]?.toUpperCase() ?? "U"

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-bg">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{user?.username ?? "User"}</h1>
          <p className="text-sm text-muted">Premium Member</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm ${
              active === tab.key
                ? "bg-primary text-bg"
                : "bg-white/5 text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "profile" && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Height", value: user?.height ?? "-", unit: "cm" },
            { label: "Weight", value: user?.weight ?? "-", unit: "kg" },
            { label: "Gender", value: user?.gender ?? "-", unit: "" },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-muted">
                {stat.label}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {stat.value} {stat.unit}
              </p>
            </div>
          ))}
        </div>
      )}

      {active === "calendar" && (
        <div className="glass-panel rounded-2xl p-6 text-sm text-muted">
          Calendar view will land here.
        </div>
      )}

      {active === "settings" && (
        <div className="glass-panel rounded-2xl p-6">
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-red-400/40 px-4 py-2 text-sm text-red-300"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
