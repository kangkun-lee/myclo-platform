import { API_BASE_URL } from "./endpoints"
import { tokenStorage } from "./storage"

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

type RequestOptions = RequestInit & { auth?: boolean }

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (options.auth) {
    const token = tokenStorage.get()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get("Content-Type") ?? ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (data as { detail?: string; message?: string })?.detail ??
      (data as { message?: string })?.message ??
      `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}
