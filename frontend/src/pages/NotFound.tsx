import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-sm text-muted">Page not found</p>
      <Link to="/" className="rounded-xl bg-primary px-4 py-2 text-sm text-bg">
        Go Home
      </Link>
    </div>
  )
}
