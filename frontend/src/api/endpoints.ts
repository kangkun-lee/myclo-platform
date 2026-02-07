import { env } from '../config/env'

export const API_BASE_URL = env.API_BASE_URL

export const endpoints = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  logout: "/api/auth/logout",
  extract: "/api/extract",
  userProfile: "/api/users/profile",
  userFaceImage: "/api/users/profile/image",
  wardrobeUsersMe: "/api/wardrobe/users/me/images",
  wardrobeItems: "/api/wardrobe/items",
  recommendOutfit: "/api/recommend/outfit",
  todaysPick: "/api/recommend/todays-pick",
  todaysPickRegenerate: "/api/recommend/todays-pick/regenerate",
  weatherSummary: "/api/today/summary",
  chat: "/api/chat",
  chatSessions: "/api/chat/sessions",
  processImage: "/api/process-image",
}
