import { useEffect, useRef, useState } from "react"
import { sendChatMessage } from "../api"
import type { TodaysPick } from "../api/types"
import { useAuth } from "../hooks/useAuth"

type Message = {
  text: string
  isUser: boolean
  outfit?: TodaysPick["outfit"]
  timestamp: string
}

export default function Chat() {
  const { } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "안녕하세요! 오늘 어떤 스타일을 찾으시나요? 제가 완벽한 코디를 도와드릴게요.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  const send = async () => {
    if (!input.trim()) return
    const text = input.trim()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setInput("")
    setMessages((prev) => [...prev, { text, isUser: true, timestamp: now }])
    setLoading(true)

    try {
      const response = await sendChatMessage(text)
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setMessages((prev) => [
        ...prev,
        {
          text: response.response ?? "No response",
          isUser: false,
          timestamp: aiTime,
          outfit: response.todays_pick?.outfit
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: error instanceof Error ? error.message : "Chat error",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 h-[calc(100vh-160px)] overflow-hidden animate-fade-in">
      {/* Sidebar - Recent Consultations */}
      <aside className="w-[30%] min-w-[320px] hidden xl:flex flex-col border-r border-white/10 bg-white/5 rounded-l-3xl">
        <div className="p-6 pb-2">
          <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">add_circle</span>
            <span>New Style Session</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="px-2 pt-4 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Consultations</h3>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 cursor-pointer">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-bold text-primary">Daily Styling</h4>
              <span className="text-[10px] opacity-50 font-medium">Just now</span>
            </div>
            <p className="text-xs opacity-70 line-clamp-1 italic">"Looking for something dramatic..."</p>
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="bg-gradient-to-br from-primary/20 to-transparent p-4 rounded-xl border border-primary/30">
            <p className="text-xs font-bold text-primary uppercase mb-1">MyClo Pro</p>
            <p className="text-[11px] opacity-70 leading-relaxed">Unlock unlimited AI styling and closet synchronization.</p>
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col relative bg-background-dark/20 rounded-r-3xl border-l border-white/5">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth pb-32"
        >
          {messages.map((message, index) => (
            <div key={index} className={`flex flex-col gap-2 ${message.isUser ? "items-end" : "items-start"}`}>
              <div className={`flex gap-4 ${message.isUser ? "flex-row-reverse" : "flex-row"}`}>
                {!message.isUser && (
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-white">auto_awesome</span>
                  </div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl ${message.isUser
                  ? "bg-primary text-white rounded-tr-none shadow-lg"
                  : "glass-card rounded-tl-none border border-white/10"
                  }`}>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className={`text-[10px] mt-2 opacity-50 ${message.isUser ? "text-right" : "text-left"}`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>

              {/* Rich Outfit Card if available */}
              {!message.isUser && message.outfit && (
                <div className="ml-14 max-w-xl w-full glass-card rounded-2xl overflow-hidden border border-white/20 group animate-in zoom-in-95 duration-500">
                  <div className="relative h-48 bg-slate-900 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                    <img
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      src={message.outfit.top.image_url ?? ""}
                      alt="Outfit recommendation"
                    />
                    <div className="absolute bottom-4 left-6 z-20">
                      <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white mb-2 inline-block">Recommended Look</span>
                      <h3 className="text-xl font-bold text-white">{message.outfit.style_description ?? "Modern Elegance"}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <div className="aspect-square rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center">
                          <img src={message.outfit.top.image_url ?? ""} className="max-w-full max-h-full object-contain" alt="Top" />
                        </div>
                        <p className="text-[10px] font-bold text-center uppercase opacity-70">{message.outfit.top.attributes?.category?.sub}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="aspect-square rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center">
                          <img src={message.outfit.bottom.image_url ?? ""} className="max-w-full max-h-full object-contain" alt="Bottom" />
                        </div>
                        <p className="text-[10px] font-bold text-center uppercase opacity-70">{message.outfit.bottom.attributes?.category?.sub}</p>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-white text-background-dark font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-wider">
                      Add to My Calendar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-primary/50">auto_awesome</span>
              </div>
              <div className="glass-card p-4 rounded-2xl rounded-tl-none border border-white/10 italic text-white/40 text-sm">
                AI Stylist is thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none">
          <div className="max-w-3xl mx-auto w-full glass-card rounded-2xl p-2 flex items-center gap-2 pointer-events-auto shadow-2xl">
            <button className="p-3 rounded-xl hover:bg-white/10 text-slate-400 hover:text-primary transition-all flex items-center justify-center">
              <span className="material-symbols-outlined">add_a_photo</span>
            </button>
            <div className="h-8 w-px bg-white/10 mx-1"></div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 placeholder:text-slate-500 text-white"
              placeholder="Ask your stylist anything... 'Find me a party look'"
              type="text"
            />
            <button
              onClick={send}
              className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center shadow-lg shadow-primary/40 group active:scale-95"
            >
              <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform">send</span>
            </button>
          </div>
          <p className="text-[10px] text-center mt-3 opacity-30 font-medium uppercase tracking-widest">MyClo AI Stylist • Secure Closet Sync Active</p>
        </div>
      </section>
    </div>
  )
}
