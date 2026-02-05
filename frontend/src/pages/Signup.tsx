import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

const steps = ["Account", "Physical", "Gender", "Body Shape"]

export default function Signup() {
  const navigate = useNavigate()
  const { signup, isLoading, error } = useAuth()
  const [step, setStep] = useState(0)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [age, setAge] = useState("")
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [gender, setGender] = useState<string | null>(null)
  const [bodyShape, setBodyShape] = useState<string | null>(null)

  const bodyShapes = useMemo(() => {
    if (gender === "man") {
      return ["slim", "round", "normal", "skinny", "athletic"]
    }
    if (gender === "woman") {
      return ["slim", "normal", "round", "curvy", "average"]
    }
    return []
  }, [gender])

  const next = () => {
    if (step === 0) {
      if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
        return
      }
      if (password !== confirmPassword) return
    }
    if (step === 1) {
      if (!age || !height || !weight) return
    }
    if (step === 2 && !gender) return
    setStep((prev) => Math.min(prev + 1, steps.length - 1))
    if (step === 2 && !bodyShape && bodyShapes[0]) {
      setBodyShape(bodyShapes[0])
    }
  }

  const back = () => setStep((prev) => Math.max(prev - 1, 0))

  const handleSubmit = async () => {
    if (!bodyShape || !gender) return
    await signup({
      username: username.trim(),
      password: password.trim(),
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      gender,
      body_shape: bodyShape,
    })
    navigate("/")
  }

  return (
    <div className="auth-gradient min-h-screen text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-primary">회원가입</h1>
          <p className="text-sm text-muted">
            계정 정보를 입력하고 나에게 맞는 스타일을 설정하세요.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium ${
                index <= step ? "bg-primary text-bg" : "bg-white/5 text-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="glass-panel flex-1 rounded-2xl p-6">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <label className="text-sm text-muted">
                아이디
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                  placeholder="아이디를 입력하세요"
                />
              </label>
              <label className="text-sm text-muted">
                비밀번호
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                />
              </label>
              <label className="text-sm text-muted">
                비밀번호 확인
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                />
              </label>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-muted">
                나이
                <input
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                />
              </label>
              <label className="text-sm text-muted">
                키(cm)
                <input
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                />
              </label>
              <label className="text-sm text-muted">
                몸무게(kg)
                <input
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">성별을 선택해주세요.</p>
              <div className="flex gap-3">
                {[
                  { label: "남성", value: "man" },
                  { label: "여성", value: "woman" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm ${
                      gender === option.value
                        ? "border-primary bg-primary text-bg"
                        : "border-white/10 bg-white/5 text-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">체형을 선택해주세요.</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {bodyShapes.map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setBodyShape(shape)}
                    className={`rounded-xl border px-4 py-3 text-sm uppercase tracking-wide ${
                      bodyShape === shape
                        ? "border-primary bg-primary text-bg"
                        : "border-white/10 bg-white/5 text-muted"
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-center text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 0 ? () => navigate("/login") : back}
            className="text-sm text-muted"
          >
            {step === 0 ? "로그인으로" : "이전"}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-bg"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-bg disabled:opacity-60"
            >
              {isLoading ? "가입 중..." : "완료"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
