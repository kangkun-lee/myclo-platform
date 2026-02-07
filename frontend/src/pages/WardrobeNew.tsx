import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { uploadWardrobeImage } from "../api"
import type { ExtractionResponse } from "../api/types"
import { processImage } from "../utils/image-processor"

type Step = "upload" | "analyzing" | "result"

export default function WardrobeNew() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("upload")
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const [extractionResults, setExtractionResults] = useState<ExtractionResponse[]>([])

  // Form states for manual correction
  const [category, setCategory] = useState({ main: "", sub: "" })
  const [colors, setColors] = useState<{ primary: string; secondary: string[]; tone: string }>({
    primary: "",
    secondary: [],
    tone: "",
  })
  const [material, setMaterial] = useState("")
  const [fit, setFit] = useState("")
  const [details, setDetails] = useState({ neckline: "", sleeve: "", length: "", closure: [] as string[] })
  const [scores, setScores] = useState({ formality: 0.5, warmth: 0.5, versatility: 0.5, season: [] as string[] })

  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  // Sync form with selected result
  useEffect(() => {
    if (step === "result" && extractionResults[selectedImageIdx]) {
      const res = extractionResults[selectedImageIdx].attributes
      setCategory({
        main: res.category?.main || "unknown",
        sub: res.category?.sub || "unknown"
      })
      setColors({
        primary: res.color?.primary || "unknown",
        secondary: res.color?.secondary || [],
        tone: res.color?.tone || "unknown"
      })
      setMaterial(res.material?.guess || "unknown")
      setFit(res.fit?.type || "unknown")
      setDetails({
        neckline: res.details?.neckline || "unknown",
        sleeve: res.details?.sleeve || "unknown",
        length: res.details?.length || "unknown",
        closure: res.details?.closure || []
      })
      setScores({
        formality: res.scores?.formality || 0.5,
        warmth: res.scores?.warmth || 0.5,
        versatility: res.scores?.versatility || 0.5,
        season: res.scores?.season || []
      })
    }
  }, [selectedImageIdx, extractionResults, step])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds 10MB and cannot be uploaded.`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) return

      // Pre-compress images client-side before upload to reduce 413 errors.
      const optimizedFiles: File[] = []
      for (const file of validFiles) {
        try {
          const optimized = await processImage(file, 4)
          optimizedFiles.push(optimized)
        } catch {
          optimizedFiles.push(file)
        }
      }

      setFiles(optimizedFiles)
      const newPreviews = optimizedFiles.map(file => URL.createObjectURL(file))
      setPreviews(newPreviews)
      setSelectedImageIdx(0) // Reset to first image
      setExtractionResults([]) // Clear old results
      setStep("upload")
    }
  }

  const startAnalysis = async () => {
    if (files.length === 0) return

    setStep("analyzing")

    try {
      // Send selected files directly to extraction API
      const response = await uploadWardrobeImage(files)

      if (response.success && response.items.length > 0) {
        setExtractionResults(response.items)
        setStep("result")
        setSelectedImageIdx(0)
      }
    } catch (error) {
      console.error("Extraction error:", error)
      setStep("upload")
      alert("Analysis failed. Please try again.")
    }
  }

  const handleSave = async () => {
    // In a real app, we might update the existing item with edited attributes
    // For now, we just go back to wardrobe
    navigate("/wardrobe")
  }

  const nextImage = () => setSelectedImageIdx(prev => (prev + 1) % (previews.length || 1))
  const prevImage = () => setSelectedImageIdx(prev => (prev - 1 + previews.length) % (previews.length || 1))

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-20">
      {/* Step Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <button onClick={() => navigate("/wardrobe")} className="hover:text-white transition-colors">Wardrobe</button>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Add New Item</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          {step === "upload" && "Upload Item"}
          {step === "analyzing" && "Analyzing Image..."}
          {step === "result" && "Item Details"}
        </h1>
        <p className="text-white/50 text-base">
          {step === "upload" && "Add photos of your clothing for AI-powered attribute extraction."}
          {step === "analyzing" && "Gemini AI is processing your image to extract premium attributes."}
          {step === "result" && "Gemini AI has analyzed your multi-photo upload."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Media Asset Section */}
        <div className="flex-1 w-full space-y-6">
          {/* Main Focused View Area */}
          <div className="relative glass-card rounded-3xl overflow-hidden aspect-[3/4] max-h-[600px] w-full group shadow-2xl">
            {step === "upload" && files.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}>
                <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center text-primary animate-pulse">
                  <span className="material-symbols-outlined text-5xl">add_a_photo</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">Select Photos</p>
                  <p className="text-white/40 text-sm">Tap to browse files (Max 10MB each)</p>
                </div>
              </div>
            ) : step === "analyzing" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/40 backdrop-blur-md">
                <div className="relative">
                  <div className="size-32 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary animate-pulse">auto_awesome</span>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">Analyzing...</h3>
                  <p className="text-white/40 text-sm max-w-[240px]">Processing fabric textures and color algorithms</p>
                </div>
              </div>
            ) : (
              // Focus Image Display
              <div className="absolute inset-0">
                <img
                  src={previews[selectedImageIdx]}
                  className="w-full h-full object-cover transition-opacity duration-500"
                  alt="Focused view"
                />

                {/* Navigation Arrows (Only if multiple) */}
                {previews.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 size-12 glass-card rounded-full flex items-center justify-center text-white hover:bg-primary transition-all opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 size-12 glass-card rounded-full flex items-center justify-center text-white hover:bg-primary transition-all opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </>
                )}

                {/* Tags on Image */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  {selectedImageIdx === 0 && (
                    <span className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Main Reference</span>
                  )}
                  <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
                    Image {selectedImageIdx + 1} of {previews.length}
                  </span>
                </div>
              </div>
            )}
            <input
              id="fileInput"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Thumbnail Control & Actions Strip */}
          <div className="flex flex-col gap-4">
            {previews.length > 0 && (
              <div className="flex items-center gap-4 py-2 overflow-x-auto no-scrollbar scroll-smooth">
                {previews.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`relative size-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${selectedImageIdx === idx ? 'border-primary scale-110 shadow-lg shadow-primary/20' : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                  </button>
                ))}

                {/* Inline Add Button */}
                <button
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className="size-20 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/30 hover:text-primary hover:border-primary/50 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-2xl">add</span>
                </button>
              </div>
            )}

            {/* Quick Actions at bottom of Media area */}
            <div className="flex items-center justify-between gap-4">
              {step === "upload" && files.length > 0 && (
                <button
                  onClick={startAnalysis}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base hover:shadow-[0_0_20px_rgba(140,43,238,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">magic_button</span>
                  Analyze {files.length} Images
                </button>
              )}
            </div>
          </div>

          {/* Studio Mode (Only in Results) */}
          {step === "result" && (
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="size-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">magic_button</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold">Studio Mode</span>
                  <span className="text-[10px] text-white/40 uppercase font-black">AI Lighting Enhancement</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          )}
        </div>

        {/* Right Side: Analysis Sidebar */}
        <aside className={`w-full lg:w-[480px] shrink-0 transform transition-all duration-500 ${step === 'result' ? 'translate-x-0 opacity-100' : 'translate-x-[100px] opacity-0 pointer-events-none absolute right-0'}`}>
          <div className="glass-card rounded-3xl flex flex-col border border-primary/30 bg-primary/[0.02] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <h3 className="text-xl font-bold tracking-tight">Detailed AI Analysis</h3>
              </div>
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Verified by Gemini</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar p-8 space-y-10">
              {/* Category */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="size-1 bg-primary rounded-full"></span>
                  Category Classification
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <select
                      value={category.main}
                      onChange={(e) => setCategory({ ...category, main: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm appearance-none focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="outer">Outerwear</option>
                      <option value="top">Tops</option>
                      <option value="bottom">Bottoms</option>
                      <option value="onepiece">One-Piece</option>
                      <option value="shoes">Shoes</option>
                      <option value="accessory">Accessory</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">expand_more</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={category.sub}
                      onChange={(e) => setCategory({ ...category, sub: e.target.value })}
                      placeholder="e.g. Cardigan"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all capitalize"
                    />
                  </div>
                </div>
              </section>

              {/* Visual Attributes */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="size-1 bg-primary rounded-full"></span>
                  Visual Attributes
                </label>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 pl-2 pr-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                    <div className="size-6 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: colors.primary }}></div>
                    <span className="text-xs font-bold capitalize">{colors.primary}</span>
                  </div>
                  <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary">#{colors.tone}</div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/70">#Solid</div>
                </div>
              </section>

              {/* Material & Silhouette */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="size-1 bg-primary rounded-full"></span>
                  Material & Silhouette
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="shimmer-pulse p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary text-2xl">texture</span>
                      <div>
                        <p className="text-sm font-bold capitalize">{material}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-tighter">AI Predicted Texture</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-white/20 text-lg group-hover:text-primary transition-colors">edit</span>
                  </div>
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary text-2xl">accessibility_new</span>
                      <div>
                        <p className="text-sm font-bold capitalize">{fit} Silhouette</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-tighter">Geometric Body Fit</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-white/20 text-lg group-hover:text-primary transition-colors">edit</span>
                  </div>
                </div>
              </section>

              {/* Construction Details */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="size-1 bg-primary rounded-full"></span>
                  Construction Details
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: 'checkroom', label: details.neckline, sub: 'Neckline' },
                    { icon: 'straighten', label: details.sleeve, sub: 'Sleeve' },
                    { icon: 'vertical_align_bottom', label: details.length, sub: 'Length' },
                    { icon: 'close', label: details.closure[0] || 'None', sub: 'Closure' }
                  ].map((item, id) => (
                    <div key={id} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all">
                      <span className="material-symbols-outlined text-xl text-primary/70">{item.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase font-black">{item.sub}</span>
                        <span className="text-xs font-bold capitalize">{item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Performance Indicators */}
              <section className="space-y-6 bg-white/5 p-6 rounded-3xl border border-white/10">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Performance Indicators</label>
                <div className="space-y-6">
                  {[
                    { label: 'Formality', value: scores.formality * 100, color: 'bg-primary' },
                    { label: 'Warmth Index', value: scores.warmth * 100, color: 'bg-orange-500' },
                    { label: 'Versatility Score', value: scores.versatility * 100, color: 'bg-green-500' }
                  ].map((indicator, id) => (
                    <div key={id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60 font-medium">{indicator.label}</span>
                        <span className="font-black">{Math.round(indicator.value)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${indicator.color} rounded-full transition-all duration-1000`} style={{ width: `${indicator.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex gap-3">
                  {['spring', 'summer', 'fall', 'winter'].map((s) => {
                    const isActive = scores.season.includes(s);
                    const icons: any = { spring: 'eco', summer: 'wb_sunny', fall: 'filter_vintage', winter: 'ac_unit' };
                    return (
                      <div key={s} className={`flex-1 text-center py-3 rounded-xl border transition-all ${isActive ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 opacity-30 grayscale'}`}>
                        <span className="material-symbols-outlined text-lg block mb-1">{icons[s]}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{s}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-white/10 bg-background-dark/30 backdrop-blur-xl">
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSave}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:shadow-[0_0_30px_rgba(140,43,238,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  Confirm & Add to Wardrobe
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <button
                  onClick={() => setStep("upload")}
                  className="w-full py-4 bg-white/5 text-white/50 rounded-2xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all"
                >
                  Discard Analysis
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Analysis Status Footer */}
      {step === 'result' && (
        <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 glass-card rounded-full flex items-center gap-8 border border-white/10 z-50 animate-slide-up shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="size-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Gemini 1.5 Multi-Modal Engine</span>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold opacity-60">Engine Confidence:</span>
            <span className="text-xs font-black text-primary">
              {((extractionResults[selectedImageIdx]?.attributes.confidence || 0.95) * 100).toFixed(0)}%
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}
