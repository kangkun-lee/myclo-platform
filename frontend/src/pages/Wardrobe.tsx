import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Shirt } from "lucide-react"
import { fetchWardrobe } from "../api"
import type { WardrobeItem } from "../api/types"

const tabs = [
  { label: "All", value: undefined },
  { label: "Tops", value: "top" },
  { label: "Bottoms", value: "bottom" },
]

export default function Wardrobe() {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  const loadItems = useCallback(
    async (reset = false) => {
      if (loading) return
      setLoading(true)
      try {
        const response = await fetchWardrobe({
          category: activeTab.value,
          skip: reset ? 0 : items.length,
          limit: 20,
        })
        setItems((prev) =>
          reset ? response.items : [...prev, ...response.items]
        )
        setHasMore(Boolean(response.has_more))
      } finally {
        setLoading(false)
      }
    },
    [activeTab.value, items.length, loading]
  )

  useEffect(() => {
    loadItems(true)
  }, [activeTab, loadItems])

  useEffect(() => {
    const handleScroll = () => {
      if (!listRef.current || !hasMore || loading) return
      const { scrollTop, scrollHeight, clientHeight } = listRef.current
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        loadItems()
      }
    }

    const node = listRef.current
    if (node) node.addEventListener("scroll", handleScroll)
    return () => {
      if (node) node.removeEventListener("scroll", handleScroll)
    }
  }, [hasMore, loadItems, loading])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Closet</h1>
        <Link
          to="/wardrobe/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-bg"
        >
          <Plus size={16} />
          Add Items
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm ${
              activeTab.label === tab.label
                ? "bg-primary text-bg"
                : "bg-white/5 text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-auto rounded-2xl border border-white/10"
      >
        {items.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-muted">
            <Shirt size={40} />
            <p>No items in {activeTab.label}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] bg-white/5 md:grid-cols-5">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/wardrobe/${item.id}`}
                className="relative aspect-square bg-bg"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.attributes?.category?.sub ?? "Wardrobe"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    👔
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
        {loading && (
          <div className="py-4 text-center text-sm text-muted">Loading...</div>
        )}
      </div>
    </div>
  )
}
