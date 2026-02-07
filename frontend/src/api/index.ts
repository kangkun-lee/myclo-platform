import { apiRequest } from "./client"
import { endpoints } from "./endpoints"
import type {
  AuthResponse,
  ChatHistoryMessage,
  ChatSessionMessage,
  ChatSessionSummary,
  ChatResponse,
  DailyWeather,
  MultiExtractionResponse,
  TodaysPick,
  WardrobeItem,
  WardrobeResponse,
} from "./types"

export async function login(username: string, password: string) {
  return apiRequest<AuthResponse>(endpoints.login, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export async function signup(payload: {
  username: string
  password: string
  age?: number | null
  height?: number | null
  weight?: number | null
  gender?: string | null
  body_shape?: string | null
}) {
  return apiRequest<AuthResponse>(endpoints.signup, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateProfile(payload: {
  height?: number | null
  weight?: number | null
  gender?: string | null
  body_shape?: string | null
}) {
  return apiRequest<{
    id: string
    username: string
    age?: number | null
    height?: number | null
    weight?: number | null
    gender?: string | null
    body_shape?: string | null
    face_image_url?: string | null
  }>(endpoints.userProfile, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function uploadFaceImage(file: File) {
  const form = new FormData()
  form.append("file", file)
  return apiRequest<{
    id: string
    username: string
    face_image_url?: string | null
  }>(endpoints.userFaceImage, {
    method: "POST",
    auth: true,
    body: form,
  })
}

export async function fetchWardrobe(
  params: { category?: string; skip?: number; limit?: number } = {}
) {
  const search = new URLSearchParams()
  if (params.category) search.set("category", params.category)
  if (params.skip !== undefined) search.set("skip", String(params.skip))
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  const path = `${endpoints.wardrobeUsersMe}?${search.toString()}`
  return apiRequest<WardrobeResponse>(path, { auth: true })
}

export async function fetchWardrobeItem(itemId: string) {
  return apiRequest<WardrobeItem>(`${endpoints.wardrobeItems}/${itemId}`, {
    auth: true,
  })
}

export async function deleteWardrobeItem(itemId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `${endpoints.wardrobeItems}/${itemId}`,
    {
      method: "DELETE",
      auth: true,
    }
  )
}

export async function createManualItem(payload: {
  attributes: WardrobeItem["attributes"]
  image_url?: string | null
}) {
  return apiRequest<WardrobeItem>(endpoints.wardrobeItems, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function uploadWardrobeImage(files: File | File[]) {
  const form = new FormData()
  if (Array.isArray(files)) {
    files.forEach(file => form.append("images", file))
  } else {
    form.append("images", files)
  }
  return apiRequest<MultiExtractionResponse>(endpoints.extract, {
    method: "POST",
    auth: true,
    body: form,
  })
}

export async function fetchTodaysPick(lat: number, lon: number) {
  return apiRequest<TodaysPick>(endpoints.todaysPick, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ lat, lon }),
  })
}

export async function regenerateTodaysPick(lat: number, lon: number) {
  return apiRequest<TodaysPick>(endpoints.todaysPickRegenerate, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ lat, lon }),
  })
}

export async function fetchWeatherSummary(lat: number, lon: number) {
  const search = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  return apiRequest<DailyWeather>(
    `${endpoints.weatherSummary}?${search.toString()}`
  )
}

export async function sendChatMessage(
  query: string,
  lat?: number,
  lon?: number,
  history: ChatHistoryMessage[] = [],
  sessionId?: string | null
) {
  return apiRequest<ChatResponse>(endpoints.chat, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ query, lat, lon, history, session_id: sessionId }),
  })
}

export async function createChatSession() {
  return apiRequest<{ success: boolean; session_id: string; created_at?: string }>(
    endpoints.chatSessions,
    {
      method: "POST",
      auth: true,
    }
  )
}

export async function fetchChatSessions(limit = 20) {
  const search = new URLSearchParams({ limit: String(limit) })
  return apiRequest<{ success: boolean; items: ChatSessionSummary[] }>(
    `${endpoints.chatSessions}?${search.toString()}`,
    { auth: true }
  )
}

export async function fetchChatSessionMessages(sessionId: string, limit = 100) {
  const search = new URLSearchParams({ limit: String(limit) })
  return apiRequest<{
    success: boolean
    session_id: string
    items: ChatSessionMessage[]
  }>(`${endpoints.chatSessions}/${sessionId}/messages?${search.toString()}`, {
    auth: true,
  })
}
export async function processClothingImage(imageUrl: string, type: "background_removal" | "silhouette" | "shadow" = "background_removal") {
  return apiRequest<{
    processed_image_url: string
    processing_type: string
    success: boolean
  }>(endpoints.processImage, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ image_url: imageUrl, processing_type: type }),
  })
}
