import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Login from "../pages/Login"
import { AuthProvider } from "../hooks/useAuth"

describe("Login स्क्रीन", () => {
  it("기본 로그인 요소를 보여준다", () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    )

    expect(screen.getByText("MyClo")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("ID를 입력하세요")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("비밀번호를 입력하세요")).toBeInTheDocument()
  })
})
