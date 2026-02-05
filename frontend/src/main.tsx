import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env, validateEnv, logEnvInfo } from './config/env'
import './index.css'
import App from './App.tsx'

// 환경변수 유효성 검사
try {
  validateEnv()
  logEnvInfo()
} catch (error) {
  console.error('❌ Environment validation failed:', error)
  // 개발 환경에서는 에러 표시, 프로덕션에서는 graceful fallback
  if (env.NODE_ENV !== 'production') {
    throw error
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
