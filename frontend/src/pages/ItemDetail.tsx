import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft, Pencil, TrendingUp, Thermometer, Box,
  Map, Scissors, Layers, Wind, Droplets, Sparkles,
  Calendar, Heart, Trash2
} from "lucide-react"
import { fetchWardrobeItem, deleteWardrobeItem } from "../api"
import type { WardrobeItem } from "../api/types"

export default function ItemDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [item, setItem] = useState<WardrobeItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await fetchWardrobeItem(id)
        setItem(data)
      } catch (err) {
        console.error("Failed to load item:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this item? This action is permanent.")) return

    try {
      const res = await deleteWardrobeItem(id)
      if (res.success) {
        navigate("/wardrobe")
      }
    } catch (err) {
      console.error("Delete failed:", err)
      alert("Failed to delete item.")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Retrieving AI Profile...</p>
      </div>
    )
  }

  if (!item) return <div className="text-center py-20">Item not found.</div>

  const attr = item.attributes

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="size-12 glass-card rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-white/40 text-xs font-black uppercase tracking-widest">
              <span className="text-primary">Premium Scan</span>
              <span className="size-1 rounded-full bg-white/20"></span>
              <span>ID: {item.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="size-12 glass-card rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Delete Item"
          >
            <Trash2 size={20} />
          </button>
          <button className="size-12 glass-card rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all">
            <Heart size={20} />
          </button>
          <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold flex items-center gap-2 transition-all">
            <Pencil size={16} /> Edit Details
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Aspect: Hero Image */}
        <div className="space-y-6">
          <div className="glass-card rounded-[40px] overflow-hidden aspect-[3/4] shadow-2xl relative group">
            <img
              src={item.image_url ?? "https://via.placeholder.com/600x800?text=No+Image"}
              alt={attr.category?.sub ?? "Item"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            />

            {/* Confidence Badge */}
            <div className="absolute bottom-8 left-8 glass-card bg-black/40 backdrop-blur-xl border-white/10 p-5 rounded-3xl flex items-center gap-4">
              <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-tighter text-white/40">AI Confidence</p>
                <p className="text-xl font-black text-white">{((attr.confidence || 0.95) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Aspect: Attribute Grid */}
        <div className="space-y-10">
          {/* Main Title & Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-md">
                {attr.category?.main}
              </span>
              <span className="text-white/20">/</span>
              <span className="text-white/60 text-sm font-medium">{attr.material?.guess}</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight capitalize">
              {attr.category?.sub || "Wardrobe Item"}
            </h1>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <TrendingUp size={20} />, label: 'Formality', value: attr.scores?.formality },
              { icon: <Thermometer size={20} />, label: 'Warmth', value: attr.scores?.warmth },
              { icon: <Box size={20} />, label: 'Versatility', value: attr.scores?.versatility },
            ].map((metric) => (
              <div key={metric.label} className="glass-card p-4 rounded-2xl border-white/5">
                <div className="text-primary mb-3">{metric.icon}</div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{metric.label}</p>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(metric.value || 0.5) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Specs */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-1">Extracted Specs</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Map size={18} />, label: 'Tone', value: attr.color?.tone },
                { icon: <Droplets size={18} />, label: 'Primary', value: attr.color?.primary },
                { icon: <Wind size={18} />, label: 'Fit', value: attr.fit?.type },
                { icon: <Scissors size={18} />, label: 'Neckline', value: attr.details?.neckline },
                { icon: <Layers size={18} />, label: 'Sleeve', value: attr.details?.sleeve },
                { icon: <ArrowLeft size={18} />, label: 'Length', value: attr.details?.length },
              ].map((spec) => (
                <div key={spec.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.07]">
                  <div className="text-slate-500">{spec.icon}</div>
                  <div>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-tight">{spec.label}</p>
                    <p className="text-sm font-bold capitalize text-slate-200">{spec.value || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seasons & Style Tags */}
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {attr.scores?.season?.map((s) => (
                <div key={s} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border-white/10 text-xs font-bold text-white/70">
                  <Calendar size={14} className="text-primary" />
                  {s.toUpperCase()}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {attr.style_tags?.map((tag) => (
                <span key={tag} className="text-[11px] font-black text-primary hover:text-white transition-colors cursor-default">
                  #{tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Notes area */}
          {attr.meta?.notes && (
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 italic text-sm text-white/40 leading-relaxed">
              &quot;{attr.meta.notes}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
