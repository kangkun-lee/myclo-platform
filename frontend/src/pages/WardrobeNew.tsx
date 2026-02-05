import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ImagePlus, X } from "lucide-react"
import { createManualItem, uploadWardrobeImage } from "../api"

type UploadItem = {
  file: File
  status: "pending" | "processing" | "done" | "error"
  error?: string
}

export default function WardrobeNew() {
  const navigate = useNavigate()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [manual, setManual] = useState({
    category: "",
    subCategory: "",
    color: "",
    season: "",
    moodTags: "",
    imageUrl: "",
  })
  const [savingManual, setSavingManual] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const list = Array.from(files).map((file) => ({
      file,
      status: "pending" as const,
    }))
    setUploads((prev) => [...prev, ...list])
  }

  const processUploads = async () => {
    setUploads((prev) =>
      prev.map((item) =>
        item.status === "pending" ? { ...item, status: "processing" } : item
      )
    )

    for (const item of uploads) {
      if (item.status !== "pending") continue
      try {
        await uploadWardrobeImage(item.file)
        setUploads((prev) =>
          prev.map((u) =>
            u.file === item.file ? { ...u, status: "done" } : u
          )
        )
      } catch (error) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === item.file
              ? {
                  ...u,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : u
          )
        )
      }
    }
  }

  const submitManual = async () => {
    if (!manual.category) return
    setSavingManual(true)
    try {
      await createManualItem({
        attributes: {
          category: { main: manual.category, sub: manual.subCategory },
          color: { primary: manual.color },
          scores: {
            season: manual.season
              ? manual.season.split(",").map((s) => s.trim())
              : [],
          },
          style_tags: manual.moodTags
            ? manual.moodTags.split(",").map((s) => s.trim())
            : [],
        },
        image_url: manual.imageUrl || undefined,
      })
      setManual({
        category: "",
        subCategory: "",
        color: "",
        season: "",
        moodTags: "",
        imageUrl: "",
      })
      navigate("/wardrobe")
    } finally {
      setSavingManual(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-white/10 p-2 text-muted"
        >
          <X size={18} />
        </button>
        <h1 className="text-2xl font-semibold">Add New Items</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Image Upload</h2>
          <p className="mt-2 text-sm text-muted">
            Upload images to extract attributes automatically.
          </p>
          <label className="mt-6 flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 text-muted">
            <ImagePlus size={32} />
            <span className="text-sm">Tap to select images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>
          {uploads.length > 0 && (
            <div className="mt-4 space-y-3">
              {uploads.map((item) => (
                <div
                  key={item.file.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm"
                >
                  <span>{item.file.name}</span>
                  <span className="text-muted">
                    {item.status === "processing" && "Processing"}
                    {item.status === "pending" && "Pending"}
                    {item.status === "done" && "Done"}
                    {item.status === "error" && "Error"}
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={processUploads}
                className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-bg"
              >
                Start Upload
              </button>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Manual Entry</h2>
          <p className="mt-2 text-sm text-muted">
            Add an item manually without image extraction.
          </p>
          <div className="mt-6 space-y-4">
            <label className="text-sm text-muted">
              Category (main)
              <input
                value={manual.category}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, category: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="top, bottom, outer"
              />
            </label>
            <label className="text-sm text-muted">
              Sub category
              <input
                value={manual.subCategory}
                onChange={(event) =>
                  setManual((prev) => ({
                    ...prev,
                    subCategory: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="hoodie, jeans"
              />
            </label>
            <label className="text-sm text-muted">
              Color
              <input
                value={manual.color}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, color: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="black, navy"
              />
            </label>
            <label className="text-sm text-muted">
              Season (comma separated)
              <input
                value={manual.season}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, season: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="SPRING, FALL"
              />
            </label>
            <label className="text-sm text-muted">
              Mood tags (comma separated)
              <input
                value={manual.moodTags}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, moodTags: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="CASUAL, STREET"
              />
            </label>
            <label className="text-sm text-muted">
              Image URL (optional)
              <input
                value={manual.imageUrl}
                onChange={(event) =>
                  setManual((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-text"
                placeholder="https://..."
              />
            </label>
            <button
              type="button"
              disabled={savingManual}
              onClick={submitManual}
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-bg disabled:opacity-60"
            >
              {savingManual ? "Saving..." : "Save Manual Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
