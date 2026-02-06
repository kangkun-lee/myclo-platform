import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchWardrobe, deleteWardrobeItem } from "../api"
import type { WardrobeItem } from "../api/types"

const tabs = [
  { label: "All", value: undefined },
  { label: "Tops", value: "top" },
  { label: "Bottoms", value: "bottom" },
  { label: "Outerwear", value: "outerwear" },
  { label: "Shoes", value: "shoes" },
]

export default function Wardrobe() {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const loadItems = useCallback(
    async () => {
      setLoading(true)
      try {
        const response = await fetchWardrobe({
          category: activeTab.value,
          skip: 0,
          limit: 100, // Load enough for initial view
        })
        setItems(response.items)
        setTotalCount(response.total_count ?? response.items.length)
      } finally {
        setLoading(false)
      }
    },
    [activeTab.value]
  )

  useEffect(() => {
    loadItems()
  }, [activeTab, loadItems])

  const handleDelete = async (e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm("Delete this item?")) return

    try {
      const res = await deleteWardrobeItem(itemId)
      if (res.success) {
        setItems(prev => prev.filter(item => item.id !== itemId))
        setTotalCount(prev => prev - 1)
      }
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">My Wardrobe</h2>
          <p className="text-white/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
            {totalCount} premium items curated by AI
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab.label === tab.label
                ? "bg-primary text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              {tab.label}
            </button>
          ))}
          <button className="px-5 py-2 rounded-full text-sm font-medium bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
            <span className="material-symbols-outlined text-lg leading-none align-middle">tune</span>
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Add New Item Card */}
        <Link
          to="/wardrobe/new"
          className="glass-card rounded-xl overflow-hidden border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center p-8 text-slate-500 hover:text-primary cursor-pointer min-h-[400px]"
        >
          <span className="material-symbols-outlined text-5xl mb-4">add_circle</span>
          <p className="font-semibold text-lg">Add New Item</p>
          <p className="text-xs mt-2 text-center opacity-70">Let MyClo AI scan your new acquisition</p>
        </Link>

        {/* Real Items */}
        {items.map((item) => (
          <div key={item.id} className="glass-card rounded-xl overflow-hidden group relative min-h-[400px]">
            <div className="aspect-[3/4] overflow-hidden bg-white/5">
              <img
                src={item.image_url ?? "https://via.placeholder.com/300x400?text=No+Image"}
                alt={item.attributes?.category?.sub ?? "Wardrobe Item"}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>

            {/* Hover AI Tags & Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 backdrop-blur-[2px]">
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="absolute top-4 right-4 size-10 bg-black/40 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>

              <div className="flex flex-wrap gap-2 mb-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span className="bg-primary/20 border border-primary/30 text-[10px] uppercase tracking-wider font-bold text-primary px-3 py-1 rounded-full">
                  {item.attributes?.category?.main}
                </span>
                {item.attributes?.scores?.season?.slice(0, 2).map((s: string) => (
                  <span key={s} className="bg-white/10 text-[10px] uppercase tracking-wider font-bold text-white/80 px-3 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
              <Link
                to={`/wardrobe/${item.id}`}
                className="w-full py-2.5 bg-white text-black text-center text-sm font-bold rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Quick View
              </Link>
            </div>

            <div className="p-4 flex justify-between items-center">
              <h3 className="font-medium text-slate-200">
                {item.attributes?.category?.sub ?? "Wardrobe Item"}
              </h3>
              <span className="material-symbols-outlined text-slate-500 text-lg group-hover:text-primary transition-colors cursor-pointer">favorite</span>
            </div>
          </div>
        ))}
      </div>

      {loading && items.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl aspect-[3/4] animate-pulse"></div>
          ))}
        </div>
      )}
    </div>
  )
}
