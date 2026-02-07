import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchWardrobe, deleteWardrobeItem } from "../api"
import type { WardrobeItem } from "../api/types"

const tabs = [
  { label: "All", value: undefined },
  { label: "Tops", value: "top" },
  { label: "Bottoms", value: "bottom" },
  { label: "Outerwear", value: "outer" },
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
        console.log('[Wardrobe Page] Fetched items:', response.items)
        console.log('[Wardrobe Page] Total count from response:', response.total_count)
        console.log('[Wardrobe Page] Items length:', response.items.length)
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

  const handleItemSelect = (item: WardrobeItem) => {
    // Navigate to item detail or show modal
    window.location.href = `/wardrobe/${item.id}`
  }

  const getItemTitle = (item: WardrobeItem) =>
    item.attributes?.category?.sub || "unknown"

  const getMainCategory = (item: WardrobeItem) => {
    const raw = (item.attributes?.category?.main || "unknown").toLowerCase()
    if (raw === "top") return "Tops"
    if (raw === "bottom") return "Bottoms"
    if (raw === "outer" || raw === "outerwear") return "Outerwear"
    if (raw === "shoes") return "Shoes"
    return "Unknown"
  }

  const getItemTags = (item: WardrobeItem) => {
    const sub = item.attributes?.category?.sub
    const material = item.attributes?.material?.guess
    const seasons = item.attributes?.scores?.season
    const style = item.attributes?.style_tags?.[0]

    const tags = [
      sub || null,
      material || null,
      seasons && seasons.length > 0 ? seasons[0] : null,
      style || null,
    ].filter(Boolean) as string[]

    return tags.slice(0, 3)
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">My Virtual Wardrobe</h2>
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

      {loading && items.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-white/50">Organizing your virtual wardrobe...</p>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Link
            to="/wardrobe/new"
            className="glass-card rounded-xl overflow-hidden border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center p-12 text-slate-500 hover:text-primary cursor-pointer max-w-md"
          >
            <span className="material-symbols-outlined text-6xl mb-4">add_circle</span>
            <p className="font-semibold text-xl mb-2">Start Your Virtual Wardrobe</p>
            <p className="text-sm text-center opacity-70">Upload your first clothing item and let MyClo AI organize it beautifully</p>
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-xl overflow-hidden group relative cursor-pointer"
              onClick={() => handleItemSelect(item)}
            >
              <div className="aspect-[3/4] overflow-hidden bg-slate-800/50">
                <img
                  src={item.image_url ?? "https://via.placeholder.com/800x1000?text=No+Image"}
                  alt={getItemTitle(item)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              <button
                className="absolute top-3 right-3 size-9 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors flex items-center justify-center z-20"
                onClick={(e) => handleDelete(e, item.id)}
                aria-label="Delete item"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>

              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-100 truncate pr-3">
                    {getMainCategory(item)}
                  </h3>
                  <span className="material-symbols-outlined text-slate-500 text-lg group-hover:text-primary transition-colors">
                    favorite
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getItemTags(item).map((tag) => (
                    <span
                      key={tag}
                      className="bg-primary/15 border border-primary/30 text-[10px] uppercase tracking-wider font-bold text-primary px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 capitalize truncate">
                  {getItemTitle(item)}
                </p>
              </div>
            </div>
          ))}

          <Link
            to="/wardrobe/new"
            className="glass-card rounded-xl overflow-hidden border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center p-8 text-slate-500 hover:text-primary cursor-pointer min-h-[420px]"
          >
            <span className="material-symbols-outlined text-5xl mb-4">add_circle</span>
            <p className="font-semibold text-lg">Add New Item</p>
            <p className="text-xs mt-2 text-center text-slate-500">
              Let MyClo AI scan your new acquisition
            </p>
          </Link>
        </div>
      )}
    </div>
  )
}
