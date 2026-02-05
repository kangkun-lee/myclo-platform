/**
 * 프론트엔드 환경변수 설정
 * Vite 빌드 시스템에서 .env 파일의 VITE_ 접두사가 붙은 변수들만 브라우저에 노출됨
 */

// 환경변수 객체 정의
export const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  API_VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  
  // App Information
  APP_NAME: import.meta.env.VITE_APP_NAME || 'MyClo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'AI 기반 옷장 관리 및 코디 추천 서비스',
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

// TypeScript 타입 정의
export type EnvConfig = typeof env

// 환경변수 유효성 검사 함수
export function validateEnv(): void {
  const required: (keyof EnvConfig)[] = [
    'API_URL',
    'API_BASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ]
  
  const missing = required.filter(key => !env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// 개발 환경에서 환경변수 상태 출력
export function logEnvInfo(): void {
  if (import.meta.env.DEV) {
    console.log('🔧 Environment Variables:')
    console.log(`   API_BASE_URL: ${env.API_BASE_URL}`)
    console.log(`   SUPABASE_URL: ${env.SUPABASE_URL}`)
    console.log(`   APP_NAME: ${env.APP_NAME}`)
    console.log(`   APP_VERSION: ${env.APP_VERSION}`)
  }
}

// 기본값 제공 함수
export function getEnvWithDefault<T extends keyof EnvConfig>(key: T, defaultValue: EnvConfig[T]): EnvConfig[T] {
  return env[key] || defaultValue
}