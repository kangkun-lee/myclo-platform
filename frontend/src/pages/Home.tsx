import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CloudRain, CloudSun, Snowflake, Sun } from "lucide-react"
import { fetchTodaysPick, fetchWeatherSummary } from "../api"
import type { DailyWeather, TodaysPick } from "../api/types"
import { useAuth } from "../hooks/useAuth"

const weatherIcon = (rainType: number) => {
  switch (rainType) {
    case 0:
      return <Sun className="text-primary" size={20} />
    case 1:
    case 4:
      return <CloudRain className="text-primary" size={20} />
    case 2:
    case 3:
      return <Snowflake className="text-primary" size={20} />
    default:
      return <CloudSun className="text-primary" size={20} />
  }
}

const weatherLabel = (rainType: number) => {
  switch (rainType) {
    case 0:
      return "Sunny day"
    case 1:
    case 4:
      return "Rainy day"
    case 2:
    case 3:
      return "Snowy day"
    default:
      return "Cloudy day"
  }
}

export default function Home() {
  const { user } = useAuth()
  const [weather, setWeather] = useState<DailyWeather | null>(null)
  const [todaysPick, setTodaysPick] = useState<TodaysPick | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fallback = { lat: 37.5665, lon: 126.978 }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      () => setCoords(fallback)
    )
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!coords) return
      try {
        setLoading(true)
        const [weatherData, pickData] = await Promise.all([
          fetchWeatherSummary(coords.lat, coords.lon),
          fetchTodaysPick(coords.lat, coords.lon),
        ])
        setWeather(weatherData)
        setTodaysPick(pickData)
      } catch (error) {
        setWeather(null)
        setTodaysPick(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [coords])

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-muted">Good Morning,</p>
        <h1 className="text-3xl font-semibold">
          <span>{user?.username ?? "User"}</span>
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Ready to conquer the rain today?
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Today</p>
            {weather && weatherIcon(weather.rain_type)}
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold">
              {weather ? weatherLabel(weather.rain_type) : "No data"}
            </p>
            <p className="text-sm text-muted">
              {weather?.region ?? weather?.message ?? ""}
            </p>
          </div>
          <div className="mt-6 text-sm text-muted">
            {weather?.min_temp !== undefined && weather?.max_temp !== undefined
              ? `${Math.round(weather.min_temp)}° / ${Math.round(
                  weather.max_temp
                )}°`
              : ""}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-sm text-muted">Today’s Pick</p>
          {loading ? (
            <p className="mt-6 text-sm text-muted">Loading...</p>
          ) : todaysPick?.outfit ? (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold">
                {todaysPick.outfit.style_description ?? "Stylish Combination"}
              </p>
              {todaysPick.reasoning && (
                <p className="text-sm text-muted">{todaysPick.reasoning}</p>
              )}
              <div className="flex gap-3">
                {[todaysPick.outfit.top, todaysPick.outfit.bottom].map((item) => (
                  <div
                    key={item.id}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <p className="text-xs text-muted">{item.attributes?.category?.main}</p>
                    <p className="text-sm font-semibold">{item.attributes?.category?.sub ?? "Item"}</p>
                  </div>
                ))}
              </div>
              <Link
                to={`/outfits/${todaysPick.pick_id ?? "today"}`}
                state={{ outfit: todaysPick.outfit, reasoning: todaysPick.reasoning }}
                className="inline-flex items-center text-sm font-semibold text-primary"
              >
                View details
              </Link>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              No recommendations yet. Add wardrobe items first.
            </p>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Stylist Chat</p>
            <p className="text-lg font-semibold">Need a quick suggestion?</p>
          </div>
          <Link
            to="/chat"
            className="rounded-xl border border-primary/40 px-4 py-2 text-sm text-primary"
          >
            Open Chat
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          "안녕하세요! 오늘 어떤 스타일을 찾으시나요?"
        </p>
      </section>
    </div>
  )
}
