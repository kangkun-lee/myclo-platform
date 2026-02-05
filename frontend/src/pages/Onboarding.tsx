import { useNavigate } from "react-router-dom"

export default function Onboarding() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-12 text-center">
        <h1 className="text-3xl font-semibold text-primary">Welcome to MyClo</h1>
        <p className="mt-4 text-sm text-muted">
          당신의 스타일, 날씨, 라이프스타일을 기반으로 맞춤 코디를 추천해 드립니다.
        </p>
        <div className="mt-10 rounded-2xl border border-white/10 bg-card/70 p-6 text-left">
          <ul className="space-y-3 text-sm text-muted">
            <li>• 옷장 아이템을 등록하고 AI 추천을 받아보세요.</li>
            <li>• 오늘의 날씨에 맞춘 코디를 확인하세요.</li>
            <li>• 스타일리스트 챗과 대화해 보세요.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mx-auto mt-10 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-bg"
        >
          시작하기
        </button>
      </div>
    </div>
  )
}
