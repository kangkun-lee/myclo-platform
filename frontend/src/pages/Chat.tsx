import { useEffect, useRef, useState } from "react"
import { sendChatMessage } from "../api"

type Message = {
  text: string
  isUser: boolean
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "안녕하세요! 오늘 어떤 스타일을 찾으시나요? 제가 완벽한 코디를 도와드릴게요.",
      isUser: false,
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  const send = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { text, isUser: true }])
    setLoading(true)
    try {
      const response = await sendChatMessage(text)
      setMessages((prev) => [
        ...prev,
        { text: response.response ?? "No response", isUser: false },
      ])
      if (response.is_pick_updated) {
        setNotice("Today's Pick has been updated!")
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: error instanceof Error ? error.message : "Chat error",
          isUser: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {notice && (
        <div className="mb-4 rounded-xl bg-primary/20 px-4 py-3 text-sm text-primary">
          {notice}
        </div>
      )}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-auto rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.isUser}-${index}`}
            className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                message.isUser
                  ? "bg-primary text-bg"
                  : "border border-white/10 bg-white text-black"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-muted">Thinking...</div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send()
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-white/10 bg-card px-4 py-3 text-sm text-text"
        />
        <button
          type="button"
          onClick={send}
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-bg"
        >
          Send
        </button>
      </div>
    </div>
  )
}
