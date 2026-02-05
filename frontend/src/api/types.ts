export type User = {
  id: string
  username: string
  age?: number | null
  height?: number | null
  weight?: number | null
  gender?: string | null
  body_shape?: string | null
}

export type AuthResponse = {
  success: boolean
  token: string
  user: User
}

export type WardrobeItem = {
  id: string
  filename: string
  image_url?: string | null
  attributes: {
    category?: { main?: string; sub?: string; confidence?: number | null }
    color?: { primary?: string; secondary?: string[]; tone?: string }
    material?: { guess?: string }
    pattern?: { type?: string }
    fit?: { type?: string }
    details?: { neckline?: string; sleeve?: string; length?: string }
    style_tags?: string[]
    scores?: {
      formality?: number
      warmth?: number
      season?: string[]
      versatility?: number
    }
    meta?: { notes?: string }
  }
}

export type WardrobeResponse = {
  success: boolean
  items: WardrobeItem[]
  count: number
  total_count?: number
  has_more?: boolean
}

export type TodaysPick = {
  success: boolean
  pick_id?: string | null
  image_url?: string | null
  reasoning?: string | null
  score?: number | null
  weather?: Record<string, unknown> | null
  weather_summary: string
  temp_min: number
  temp_max: number
  outfit?: {
    top: WardrobeItem
    bottom: WardrobeItem
    score: number
    reasons: string[]
    reasoning?: string | null
    style_description?: string | null
  } | null
}

export type DailyWeather = {
  date_id: string
  min_temp?: number | null
  max_temp?: number | null
  rain_type: number
  message: string
  region?: string | null
}

export type ChatResponse = {
  success: boolean
  response?: string | null
  is_pick_updated?: boolean
  recommendations?: unknown
  todays_pick?: TodaysPick | null
}

export type ExtractionResponse = {
  success: boolean
  attributes: WardrobeItem["attributes"]
  saved_to: string
  image_url: string
  item_id: string
  blob_name?: string | null
  storage_type?: string | null
}
