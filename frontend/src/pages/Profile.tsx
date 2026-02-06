import { useState, useRef, useEffect } from "react"
import { Calendar, Settings, Edit2, Camera, Save, X, Loader2 } from "lucide-react"
import { useAuth } from "../hooks/useAuth"
import { updateProfile, uploadFaceImage } from "../api"

const tabs = [
  { key: "profile", label: "Body Profile" },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "settings", label: "Settings", icon: Settings },
]

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const [active, setActive] = useState("profile")
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    height: user?.height?.toString() || "",
    weight: user?.weight?.toString() || "",
    gender: user?.gender || "",
    body_shape: user?.body_shape || "",
  })

  // Update form data when user changes (e.g. after upload)
  useEffect(() => {
    if (user) {
      setFormData({
        height: user.height?.toString() || "",
        weight: user.weight?.toString() || "",
        gender: user.gender || "",
        body_shape: user.body_shape || "",
      })
    }
  }, [user])

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const updatedUser = await uploadFaceImage(file)
      // Merge with existing user data to keep other fields
      if (user) {
        updateUser({ ...user, ...updatedUser })
      }
    } catch (error) {
      console.error("Failed to upload face image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      const payload = {
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        gender: formData.gender || null,
        body_shape: formData.body_shape || null,
      }

      const updatedUser = await updateProfile(payload)
      // Merge with existing user to keep derived fields if any
      if (user) {
        updateUser({ ...user, ...updatedUser })
      }
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
      alert("Failed to update profile.")
    }
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? "U"

  return (
    <div className="space-y-8 pb-20">
      {/* Header Profile Section */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-4xl font-bold text-bg overflow-hidden cursor-pointer shadow-lg shadow-primary/20 transition-all hover:scale-105"
            onClick={handleFileClick}
          >
            {user?.face_image_url ? (
              <img
                src={user.face_image_url}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}

            {/* Overlay for upload hint */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full z-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{user?.username ?? "User"}</h1>
          <p className="text-sm text-muted">Premium Member</p>
          <button
            type="button"
            onClick={handleFileClick}
            className="mt-2 text-xs text-primary/80 hover:text-primary underline decoration-dotted underline-offset-4"
          >
            Change Face Photo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${active === tab.key
                ? "bg-primary text-bg font-medium shadow-lg shadow-primary/20"
                : "bg-white/5 text-muted hover:bg-white/10"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body Profile Content */}
      {active === "profile" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Physical Attributes</h2>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${isEditing
                  ? "bg-primary text-bg shadow-md shadow-primary/20 hover:bg-primary/90"
                  : "bg-white/5 text-foreground hover:bg-white/10"
                }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </>
              )}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Height */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black rotate-12">H</div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Height</p>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full bg-black/20 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="175"
                  />
                  <span className="text-muted">cm</span>
                </div>
              ) : (
                <p className="text-2xl font-semibold">{user?.height ? `${user.height} cm` : "-"}</p>
              )}
            </div>

            {/* Weight */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black rotate-12">W</div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Weight</p>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full bg-black/20 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="65"
                  />
                  <span className="text-muted">kg</span>
                </div>
              ) : (
                <p className="text-2xl font-semibold">{user?.weight ? `${user.weight} kg` : "-"}</p>
              )}
            </div>

            {/* Gender */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black rotate-12">G</div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Gender</p>
              {isEditing ? (
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-black/20 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-foreground"
                >
                  <option value="" disabled className="bg-gray-800">Select Gender</option>
                  <option value="male" className="bg-gray-800">Male</option>
                  <option value="female" className="bg-gray-800">Female</option>
                  <option value="unisex" className="bg-gray-800">Other</option>
                </select>
              ) : (
                <p className="text-2xl font-semibold capitalize">{user?.gender || "-"}</p>
              )}
            </div>

            {/* Body Shape */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black rotate-12">B</div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Body Shape</p>
              {isEditing ? (
                <select
                  value={formData.body_shape}
                  onChange={(e) => setFormData({ ...formData, body_shape: e.target.value })}
                  className="w-full bg-black/20 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none text-foreground"
                >
                  <option value="" disabled className="bg-gray-800">Select Shape</option>
                  <option value="slim" className="bg-gray-800">Slim</option>
                  <option value="average" className="bg-gray-800">Average</option>
                  <option value="athletic" className="bg-gray-800">Athletic</option>
                  <option value="curvy" className="bg-gray-800">Curvy/Muscular</option>
                  <option value="plus_size" className="bg-gray-800">Plus Size</option>
                </select>
              ) : (
                <p className="text-2xl font-semibold capitalize">{user?.body_shape?.replace("_", " ") || "-"}</p>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 mt-4 border border-white/5">
            <div className="flex gap-4">
              <div className="p-3 bg-primary/10 rounded-full h-fit">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-primary">AI Fitting Tip</h3>
                <p className="text-muted text-sm mt-1 leading-relaxed">
                  Uploading your face photo and keeping your body measurements up to date helps our AI generate the most realistic fitting results for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {active === "calendar" && (
        <div className="glass-panel rounded-2xl p-6 text-center py-20 text-muted">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Calendar logging feature is coming soon.</p>
        </div>
      )}

      {active === "settings" && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Account Actions</h3>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300 hover:bg-red-400/20 transition-colors flex items-center justify-center gap-2"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
