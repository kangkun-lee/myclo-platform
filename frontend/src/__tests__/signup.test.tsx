import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Signup from "../pages/Signup"
import { AuthProvider } from "../hooks/useAuth"

describe("Signup 화면", () => {
  it("회원가입 단계 표시", () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText("회원가입")).toBeInTheDocument()
    expect(screen.getByText("Account")).toBeInTheDocument()
    expect(screen.getByText("Physical")).toBeInTheDocument()
    expect(screen.getByText("Gender")).toBeInTheDocument()
    expect(screen.getByText("Body Shape")).toBeInTheDocument()
  })
})
