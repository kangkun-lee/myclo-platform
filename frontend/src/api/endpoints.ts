export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const endpoints = {
  login: "/api/auth/login",
  signup: "/api/auth/signup",
  logout: "/api/auth/logout",
  extract: "/api/extract",
  userProfile: "/api/users/profile",
  wardrobeUsersMe: "/api/wardrobe/users/me/images",
  wardrobeItems: "/api/wardrobe/items",
  recommendOutfit: "/api/recommend/outfit",
  todaysPick: "/api/recommend/todays-pick",
  weatherSummary: "/api/today/summary",
  chat: "/api/chat",
}
