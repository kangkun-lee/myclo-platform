const TOKEN_KEY = "auth_token"
const USER_KEY = "user_profile"

export type StoredUser = {
  id: string
  username: string
  age?: number | null
  height?: number | null
  weight?: number | null
  gender?: string | null
  body_shape?: string | null
}

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

export const userStorage = {
  get(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  },
  set(user: StoredUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(USER_KEY)
  },
}
