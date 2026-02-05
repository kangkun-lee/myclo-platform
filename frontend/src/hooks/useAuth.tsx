import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { login as apiLogin, signup as apiSignup } from "../api"
import { tokenStorage, userStorage, type StoredUser } from "../api/storage"
import type { User } from "../api/types"

type AuthContextValue = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  signup: (payload: {
    username: string
    password: string
    age?: number | null
    height?: number | null
    weight?: number | null
    gender?: string | null
    body_shape?: string | null
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const toStoredUser = (user: User): StoredUser => ({
  id: user.id,
  username: user.username,
  age: user.age ?? null,
  height: user.height ?? null,
  weight: user.weight ?? null,
  gender: user.gender ?? null,
  body_shape: user.body_shape ?? null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => userStorage.get())
  const [token, setToken] = useState<string | null>(() => tokenStorage.get())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await apiLogin(username, password)
      tokenStorage.set(result.token)
      userStorage.set(toStoredUser(result.user))
      setToken(result.token)
      setUser(result.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(
    async (payload: {
      username: string
      password: string
      age?: number | null
      height?: number | null
      weight?: number | null
      gender?: string | null
      body_shape?: string | null
    }) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await apiSignup(payload)
        tokenStorage.set(result.token)
        userStorage.set(toStoredUser(result.user))
        setToken(result.token)
        setUser(result.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Signup failed")
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const logout = useCallback(() => {
    tokenStorage.clear()
    userStorage.clear()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      error,
      login,
      signup,
      logout,
    }),
    [user, token, isLoading, error, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
