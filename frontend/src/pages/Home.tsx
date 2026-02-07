import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  createChatSession,
  fetchChatSessionMessages,
  fetchChatSessions,
  fetchTodaysPick,
  regenerateTodaysPick,
  sendChatMessage,
} from "../api"
import type {
  ChatHistoryMessage,
  ChatSessionSummary,
  DailyWeather,
  TodaysPick,
} from "../api/types"
import { useAuth } from "../hooks/useAuth"

type ChatMessage = {
  text: string
  isUser: boolean
  timestamp: string
}

const DEFAULT_CHAT_MESSAGE: ChatMessage = {
  text: "AI Stylist here. Ask me anything about today's outfit.",
  isUser: false,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
}

export default function Home() {
  const {} = useAuth()
  const [weather, setWeather] = useState<DailyWeather | null>(null)
  const [todaysPick, setTodaysPick] = useState<TodaysPick | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([DEFAULT_CHAT_MESSAGE])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const chatListRef = useRef<HTMLDivElement | null>(null)

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
        const pickData = await fetchTodaysPick(coords.lat, coords.lon)
        setWeather({
          date_id: new Date().toISOString().slice(0, 10),
          rain_type: 0,
          message: pickData.weather_summary ?? "Today's Weather",
          min_temp: pickData.temp_min,
          max_temp: pickData.temp_max,
          region: (pickData.weather as { region?: string } | null)?.region ?? null,
        })
        setTodaysPick(pickData)
      } catch (error) {
        console.error("Home loading error:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [coords])

  useEffect(() => {
    if (!chatListRef.current) return
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight
  }, [chatMessages, chatLoading])

  const loadChatSessions = async () => {
    try {
      const res = await fetchChatSessions(20)
      setChatSessions(res.items ?? [])
    } catch (error) {
      console.error("Load chat sessions error:", error)
    }
  }

  useEffect(() => {
    loadChatSessions()
  }, [])

  const handleCreateNewChat = async () => {
    if (sessionLoading || chatLoading) return
    try {
      setSessionLoading(true)
      const created = await createChatSession()
      setChatSessionId(created.session_id)
      setChatMessages([DEFAULT_CHAT_MESSAGE])
      setHistoryOpen(false)
      await loadChatSessions()
    } catch (error) {
      console.error("Create chat session error:", error)
    } finally {
      setSessionLoading(false)
    }
  }

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId) return
    if (sessionId === chatSessionId) return
    try {
      setSessionLoading(true)
      const res = await fetchChatSessionMessages(sessionId, 120)
      const mapped: ChatMessage[] = (res.items ?? []).map((m) => ({
        text: m.content,
        isUser: m.role === "user",
        timestamp: m.created_at
          ? new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      }))
      setChatSessionId(sessionId)
      setChatMessages(mapped.length > 0 ? mapped : [DEFAULT_CHAT_MESSAGE])
      setHistoryOpen(false)
    } catch (error) {
      console.error("Load chat messages error:", error)
    } finally {
      setSessionLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!coords || regenerating) return
    try {
      setRegenerating(true)
      const pickData = await regenerateTodaysPick(coords.lat, coords.lon)
      setWeather({
        date_id: new Date().toISOString().slice(0, 10),
        rain_type: 0,
        message: pickData.weather_summary ?? "Today's Weather",
        min_temp: pickData.temp_min,
        max_temp: pickData.temp_max,
        region: (pickData.weather as { region?: string } | null)?.region ?? null,
      })
      setTodaysPick(pickData)
    } catch (error) {
      console.error("Regenerate error:", error)
    } finally {
      setRegenerating(false)
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const text = chatInput.trim()
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    setChatInput("")
    setChatMessages((prev) => [...prev, { text, isUser: true, timestamp: now }])
    setChatLoading(true)

    try {
      const history: ChatHistoryMessage[] = chatMessages
        .map((m) => ({
          role: m.isUser ? "user" : "assistant",
          content: m.text,
        }))
        .slice(-10)

      const response = await sendChatMessage(
        text,
        coords?.lat,
        coords?.lon,
        history,
        chatSessionId
      )
      if (response.session_id) {
        setChatSessionId(response.session_id)
      }
      await loadChatSessions()
      setChatMessages((prev) => [
        ...prev,
        {
          text: response.response ?? "No response.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          text: error instanceof Error ? error.message : "Chat request failed.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }
    return new Date().toLocaleDateString("en-US", options).toUpperCase()
  }

  const formatSessionTime = (value?: string | null) => {
    if (!value) return "No time"
    const date = new Date(value)
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const activeSession = chatSessions.find((s) => s.session_id === chatSessionId)
  const topItem = todaysPick?.outfit?.top
  const bottomItem = todaysPick?.outfit?.bottom

  const makeItemTags = (item: TodaysPick["outfit"]["top"] | undefined) => {
    if (!item?.attributes) return []
    const categoryMain = item.attributes?.category?.main
    const categorySub = item.attributes?.category?.sub
    const material = item.attributes?.material?.guess
    const color = item.attributes?.color?.primary
    return [categoryMain, categorySub, material, color]
      .filter((v): v is string => Boolean(v && String(v).trim()))
      .slice(0, 4)
  }

  const topTags = makeItemTags(topItem)
  const bottomTags = makeItemTags(bottomItem)

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
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
          </div>

          <div className="flex items-center gap-8 bg-white/20 backdrop-blur-md rounded-2xl px-8 py-4 shadow-inner border border-white/30">
            <div className="text-center">
              <p className="text-xs font-bold text-white/80 uppercase mb-1">Low</p>
              <p className="text-2xl font-bold text-white">
                {weather?.min_temp != null ? `${Math.round(weather.min_temp)}C` : "--"}
              </p>
            </div>
            <div className="w-px h-10 bg-white/30"></div>
            <div className="text-center">
              <p className="text-xs font-bold text-white/80 uppercase mb-1">High</p>
              <p className="text-2xl font-bold text-white">
                {weather?.max_temp != null ? `${Math.round(weather.max_temp)}C` : "--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="font-serif text-4xl text-white font-bold">Today's Pick</h2>
              <p className="text-white/50 text-sm mt-1 tracking-wide">CURATED BY AI STYLIST - {formatDate()}</p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className={`
                group relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300
                ${
                  regenerating
                    ? "bg-white/5 text-white/50 cursor-not-allowed"
                    : "bg-white text-black hover:bg-primary hover:text-white shadow-lg hover:shadow-primary/50"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-lg ${
                    regenerating ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"
                  }`}
                >
                  refresh
                </span>
                <span>{regenerating ? "Styling..." : "New Style"}</span>
              </div>
            </button>
          </div>

          <div className="relative group w-full rounded-[2rem] overflow-hidden shadow-2xl bg-white/5" style={{ aspectRatio: "3/4" }}>
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
                <div className="absolute z-20 right-[52px] top-[20%] w-[340px] max-w-[88%] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none space-y-3">
                  {topItem && (
                    <div className="rounded-2xl border border-white/20 bg-black/50 backdrop-blur-xl p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 overflow-hidden shrink-0">
                          <img src={topItem.image_url ?? ""} alt="Top item" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs uppercase tracking-wider text-white/70 mb-1">TOP</div>
                          <div className="text-sm font-bold text-white truncate">
                            {topItem.attributes?.category?.sub ?? topItem.attributes?.category?.main ?? "Upper Item"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {topTags.map((tag) => (
                              <span
                                key={`top-${tag}`}
                                className="px-2.5 py-1 rounded-full text-xs border border-white/25 bg-white/10 text-white/85"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {bottomItem && (
                    <div className="rounded-2xl border border-white/20 bg-black/50 backdrop-blur-xl p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 overflow-hidden shrink-0">
                          <img src={bottomItem.image_url ?? ""} alt="Bottom item" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs uppercase tracking-wider text-white/70 mb-1">BOTTOM</div>
                          <div className="text-sm font-bold text-white truncate">
                            {bottomItem.attributes?.category?.sub ?? bottomItem.attributes?.category?.main ?? "Lower Item"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {bottomTags.map((tag) => (
                              <span
                                key={`bottom-${tag}`}
                                className="px-2.5 py-1 rounded-full text-xs border border-white/25 bg-white/10 text-white/85"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 right-4 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowInfo(!showInfo)
                    }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg"
                    title="Toggle Details"
                  >
                    <span className="material-symbols-outlined">{showInfo ? "visibility_off" : "info"}</span>
                  </button>
                </div>

                <div
                  className={`absolute bottom-8 left-8 right-8 transition-all duration-500 transform ${
                    showInfo ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
                  }`}
                >
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
                        We selected this centered around your {todaysPick.outfit.top.attributes?.category?.sub} and {" "}
                        {todaysPick.outfit.bottom.attributes?.category?.sub} to match the current vibe.
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
                <Link to="/wardrobe/new" className="px-6 py-3 bg-primary text-white rounded-xl font-bold">
                  Add Your First Item
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 xl:h-[calc(100vh-220px)]">
          <section className="glass-card rounded-3xl border border-white/10 h-[70vh] xl:h-full min-h-0 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-white font-bold text-lg whitespace-nowrap">AI Stylist Chat</h3>
                <span className="text-[11px] text-white/50 uppercase tracking-widest">Live</span>
              </div>
              <div className="relative flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setHistoryOpen((prev) => !prev)}
                  disabled={sessionLoading || chatLoading}
                  className={`max-w-[160px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors truncate ${
                    sessionLoading || chatLoading
                      ? "bg-white/10 text-white/40 border-white/10 cursor-not-allowed"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                  }`}
                  title="Open chat history"
                >
                  {activeSession?.title ?? "History"}
                </button>
                <button
                  onClick={handleCreateNewChat}
                  disabled={sessionLoading || chatLoading}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    sessionLoading || chatLoading
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  New
                </button>
                {historyOpen && (
                  <div className="absolute right-0 top-11 z-30 w-[270px] max-w-[80vw] rounded-xl border border-white/15 bg-[#121224] shadow-2xl">
                    <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-widest text-white/60">Recent Chats</span>
                      <span className="text-[10px] text-white/40">{chatSessions.length}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {chatSessions.length === 0 && (
                        <div className="px-2 py-3 text-xs text-white/50">No chat history yet.</div>
                      )}
                      {chatSessions.map((s) => (
                        <button
                          key={s.session_id}
                          onClick={() => handleSelectSession(s.session_id)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                            s.session_id === chatSessionId
                              ? "bg-primary/20 border-primary/40"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="text-xs text-white font-medium truncate">{s.title || "New chat"}</div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
                            <span>{formatSessionTime(s.updated_at || s.created_at)}</span>
                            <span>{s.message_count} msgs</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div ref={chatListRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`${msg.isUser ? "bg-primary text-white" : "bg-white/5 text-white"} max-w-[90%] rounded-2xl px-4 py-3`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[10px] opacity-60 mt-2">{msg.timestamp}</p>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 text-white/70 max-w-[90%] rounded-2xl px-4 py-3 text-sm italic">
                    AI stylist is thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-2 py-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendChat()
                  }}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 text-white placeholder:text-white/40"
                  placeholder="Example: Recommend a clean office look for today"
                  type="text"
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatLoading}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    chatLoading ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
