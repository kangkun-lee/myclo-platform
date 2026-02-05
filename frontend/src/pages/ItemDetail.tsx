import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"
import { fetchWardrobeItem } from "../api"
import type { WardrobeItem } from "../api/types"

export default function ItemDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState<WardrobeItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await fetchWardrobeItem(id)
        setItem(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (!id) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-white/10 p-2 text-muted"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold">Item Detail</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {item?.image_url ? (
          <img
            src={item.image_url}
            alt={item.attributes?.category?.sub ?? "Item"}
            className="h-[320px] w-full object-cover"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center bg-card">
            👔
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            {item?.attributes?.category?.main ?? "Category"}
          </p>
          <p className="text-2xl font-semibold">
            {item?.attributes?.category?.sub ?? "Item"}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-muted"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted">Stats</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Worn</span>
              <span>12 times</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Last worn</span>
              <span>2 days ago</span>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted">Details</p>
          {loading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Color</span>
                <span>{item?.attributes?.color?.primary ?? "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Material</span>
                <span>{item?.attributes?.material?.guess ?? "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Pattern</span>
                <span>{item?.attributes?.pattern?.type ?? "Unknown"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
