import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchWardrobe, deleteWardrobeItem } from "../api"
import type { WardrobeItem } from "../api/types"
import VirtualWardrobe from "../components/VirtualWardrobe/VirtualWardrobe"
import "../components/VirtualWardrobe/VirtualWardrobe.css"
import "../components/VirtualWardrobe/VirtualWardrobeWrapper.css"

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

  const handleItemSelect = (item: WardrobeItem) => {
    // Navigate to item detail or show modal
    window.location.href = `/wardrobe/${item.id}`
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

      {/* Virtual Wardrobe View */}
      {!loading && items.length > 0 ? (
        <div className="virtual-wardrobe-wrapper">
          <VirtualWardrobe
            items={items}
            onDelete={handleDelete}
            onItemSelect={handleItemSelect}
          />
        </div>
      ) : (
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

      {/* Loading State */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-white/50">Organizing your virtual wardrobe...</p>
          </div>
        </div>
      )}
    </div>
  )
}
