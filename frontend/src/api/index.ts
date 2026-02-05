import { apiRequest } from "./client"
import { endpoints } from "./endpoints"
import type {
  AuthResponse,
  ChatResponse,
  DailyWeather,
  ExtractionResponse,
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

export async function uploadWardrobeImage(file: File) {
  const form = new FormData()
  form.append("image", file)
  return apiRequest<ExtractionResponse>(endpoints.extract, {
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

export async function fetchWeatherSummary(lat: number, lon: number) {
  const search = new URLSearchParams({ lat: String(lat), lon: String(lon) })
  return apiRequest<DailyWeather>(
    `${endpoints.weatherSummary}?${search.toString()}`
  )
}

export async function sendChatMessage(query: string, lat?: number, lon?: number) {
  return apiRequest<ChatResponse>(endpoints.chat, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ query, lat, lon }),
  })
}
