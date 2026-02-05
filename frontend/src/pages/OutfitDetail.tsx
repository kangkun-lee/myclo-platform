import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import type { WardrobeItem } from "../api/types"

type OutfitState = {
  outfit?: {
    top: WardrobeItem
    bottom: WardrobeItem
    score: number
    reasoning?: string | null
    style_description?: string | null
  }
  reasoning?: string | null
}

export default function OutfitDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as OutfitState | undefined
  const outfit = state?.outfit

  if (!outfit) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-white/10 p-2 text-muted"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-muted">No outfit data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="rounded-full border border-white/10 p-2 text-muted"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {outfit.top.image_url ? (
          <img
            src={outfit.top.image_url}
            alt="Top"
            className="h-[280px] w-full object-cover"
          />
        ) : (
          <div className="flex h-[280px] items-center justify-center bg-card">
            🧥
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted">Today’s Pick</p>
        <h1 className="text-3xl font-semibold">
          {outfit.style_description ?? "Stylish Combination"}
        </h1>
        {outfit.reasoning && (
          <p className="mt-3 text-sm text-muted">{outfit.reasoning}</p>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-muted">Constituent Items</p>
        <div className="mt-4 space-y-4">
          {[outfit.top, outfit.bottom].map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt="Item"
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-card">
                  👕
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">
                  {item.attributes?.category?.sub ?? "Item"}
                </p>
                <p className="text-xs text-muted">
                  {item.attributes?.color?.primary ?? "Unknown"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-bg"
      >
        Save to Calendar
      </button>
    </div>
  )
}
