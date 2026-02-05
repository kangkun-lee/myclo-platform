import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Sparkles } from "lucide-react"
import { useAuth } from "../hooks/useAuth"

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password.trim()) return
    await login(username.trim(), password.trim())
  }

  return (
    <div className="auth-gradient min-h-screen text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <Sparkles className="text-primary" size={40} />
          </div>
          <h1 className="text-3xl font-semibold tracking-widest text-primary">
            MyClo
          </h1>
          <p className="mt-2 text-sm text-muted">당신만의 AI 스타일리스트</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-muted">
            아이디
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ID를 입력하세요"
              className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-text outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-text outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-xl bg-primary py-3 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          계정이 없으신가요?{" "}
          <Link to="/signup" className="font-semibold text-primary">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}
