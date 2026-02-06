import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchTodaysPick, fetchWeatherSummary, regenerateTodaysPick } from "../api"
import type { DailyWeather, TodaysPick } from "../api/types"
import { useAuth } from "../hooks/useAuth"

export default function Home() {
  const { } = useAuth()
  const [weather, setWeather] = useState<DailyWeather | null>(null)
  const [todaysPick, setTodaysPick] = useState<TodaysPick | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

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
        console.error("Home loading error:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [coords])

  const handleRegenerate = async () => {
    if (!coords || regenerating) return
    try {
      setRegenerating(true)
      const pickData = await regenerateTodaysPick(coords.lat, coords.lon)
      setTodaysPick(pickData)
    } catch (error) {
      console.error("Regenerate error:", error)
    } finally {
      setRegenerating(false)
    }
  }

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }
    return new Date().toLocaleDateString('en-US', options).toUpperCase()
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Weather Widget Section */}
      <section className="relative overflow-hidden rounded-3xl glass-card bg-gradient-to-br from-violet-500/10 via-primary/5 to-indigo-500/10 p-8 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 p-12 opacity-20 -mr-10 -mt-10">
          <span className="material-symbols-outlined text-9xl text-white">partly_cloudy_day</span>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-white mb-1 drop-shadow-md">
              {weather?.message?.split("\n")[0] ?? "Today's Weather"}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-3 text-white/90">
              <span className="material-symbols-outlined text-xl">location_on</span>
              <span className="font-medium">{weather?.region ?? "Searching..."}</span>
            </div>
            {todaysPick?.reasoning && (
              <p className="text-white/80 text-sm mt-4 max-w-lg font-light italic leading-relaxed">
                "{todaysPick.reasoning.length > 80 ? todaysPick.reasoning.substring(0, 80) + '...' : todaysPick.reasoning}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-8 bg-white/20 backdrop-blur-md rounded-2xl px-8 py-4 shadow-inner border border-white/30">
            <div className="text-center">
              <p className="text-xs font-bold text-white/80 uppercase mb-1">Low</p>
              <p className="text-2xl font-bold text-white">{weather?.min_temp != null ? `${Math.round(weather.min_temp)}` : "--"}°</p>
            </div>
            <div className="w-px h-10 bg-white/30"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-white/80 uppercase mb-1">High</p>
              <p className="text-2xl font-bold text-white">{weather?.max_temp != null ? `${Math.round(weather.max_temp)}` : "--"}°</p>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Pick Hero Section */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="font-serif text-4xl text-white font-bold">Today's Pick</h2>
              <p className="text-white/50 text-sm mt-1 tracking-wide">CURATED BY AI STYLIST • {formatDate()}</p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className={`
                group relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300
                ${regenerating
                  ? "bg-white/5 text-white/50 cursor-not-allowed"
                  : "bg-white text-black hover:bg-primary hover:text-white shadow-lg hover:shadow-primary/50"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${regenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>
                  refresh
                </span>
                <span>{regenerating ? "Styling..." : "New Style"}</span>
              </div>
            </button>
          </div>

          <div className="relative group w-full rounded-[2rem] overflow-hidden shadow-2xl bg-white/5" style={{ aspectRatio: '3/4' }}>
            {loading || regenerating ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-pulse text-white/20 text-xl italic">
                  {regenerating ? "Creating your new outfit..." : "Styling in progress..."}
                </div>
              </div>
            ) : todaysPick?.outfit ? (
              <>
                <img
                  src={todaysPick.image_url ?? todaysPick.outfit.top.image_url ?? "https://via.placeholder.com/800x1200?text=Premium+Outfit"}
                  alt="Main outfit pick"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-4 right-4 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowInfo(!showInfo);
                    }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg"
                    title="Toggle Details"
                  >
                    <span className="material-symbols-outlined">{showInfo ? 'visibility_off' : 'info'}</span>
                  </button>
                </div>

                <div className={`absolute bottom-8 left-8 right-8 transition-all duration-500 transform ${showInfo ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
                  <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center shadow-2xl border-white/20 backdrop-blur-xl bg-black/40">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-xl">colors_spark</span>
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">AI Stylist Note</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {todaysPick.outfit.style_description ?? "Sophisticated Ensemble"}
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
                        We selected this centered around your {todaysPick.outfit.top.attributes?.category?.sub} and {todaysPick.outfit.bottom.attributes?.category?.sub} to match the current vibe.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <Link
                        to={`/outfits/${todaysPick.pick_id ?? "today"}`}
                        state={{ outfit: todaysPick.outfit, reasoning: todaysPick.reasoning }}
                        className="flex-1 md:flex-none px-8 py-4 bg-primary text-white text-center font-bold rounded-xl hover:shadow-[0_0_20px_rgba(140,43,238,0.4)] transition-all"
                      >
                        Wear This Today
                      </Link>
                      <button className="p-4 glass-card rounded-xl hover:bg-white/10 transition-all">
                        <span className="material-symbols-outlined">bookmark</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center flex-col gap-4">
                <p className="text-white/40 italic">Not enough items in your wardrobe yet.</p>
                <Link to="/wardrobe/new" className="px-6 py-3 bg-primary text-white rounded-xl font-bold">Add Your First Item</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-white">Quick Access</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Stats Card */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Wardrobe Value</span>
                <span className="text-2xl font-bold text-white">$14,250</span>
              </div>
              <div className="size-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
            </div>

            {/* Placeholder Items */}
            <div className="glass-card rounded-2xl p-3 flex gap-4 hover:bg-white/5 transition-all cursor-pointer group">
              <div className="size-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                <span className="w-full h-full flex items-center justify-center material-symbols-outlined text-white/10 text-3xl">checkroom</span>
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-bold text-white">Prada Navy Blazer</h4>
                <p className="text-xs text-white/50 mt-1">Recently Dry Cleaned</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold w-fit uppercase">Active</span>
              </div>
            </div>
          </div>

          {/* Calendar Mini-View */}
          <div className="glass-card rounded-3xl p-6 flex-1 flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Upcoming Events</h4>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center justify-center bg-primary/20 text-primary rounded-xl px-3 py-1 shrink-0 h-fit">
                  <span className="text-sm font-bold">14</span>
                  <span className="text-[10px] font-bold">OCT</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Gallery Opening</p>
                  <p className="text-xs text-white/40">2:00 PM • Chelsea District</p>
                </div>
              </div>
              <div className="flex gap-4 opacity-50">
                <div className="flex flex-col items-center justify-center bg-white/10 text-white/60 rounded-xl px-3 py-1 shrink-0 h-fit">
                  <span className="text-sm font-bold">16</span>
                  <span className="text-[10px] font-bold">OCT</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Executive Dinner</p>
                  <p className="text-xs text-white/40">7:30 PM • The Nomad</p>
                </div>
              </div>
            </div>
            <button className="mt-auto py-2 text-xs font-bold text-white/50 hover:text-white transition-colors border-t border-white/5 pt-4">
              Open Stylist Calendar
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
