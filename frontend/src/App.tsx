import type { ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import MainLayout from "./layouts/MainLayout"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Onboarding from "./pages/Onboarding"
import Home from "./pages/Home"
import Wardrobe from "./pages/Wardrobe"
import WardrobeNew from "./pages/WardrobeNew"
import ItemDetail from "./pages/ItemDetail"
import OutfitDetail from "./pages/OutfitDetail"
import Profile from "./pages/Profile"
import Chat from "./pages/Chat"
import NotFound from "./pages/NotFound"
import { AuthProvider, useAuth } from "./hooks/useAuth"

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Home />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/wardrobe/new" element={<WardrobeNew />} />
            <Route path="/wardrobe/:id" element={<ItemDetail />} />
            <Route path="/outfits/:id" element={<OutfitDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
