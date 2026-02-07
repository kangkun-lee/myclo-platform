# MyClo Platform - AI 기반 옷장 스타일리스트

AI 기술을 활용하여 옷 이미지를 분석하고 개인화된 코디를 추천해주는 스마트 옷장 관리 서비스입니다.

## 📋 목차

1. [🚀 빠른 시작](#-빠른-시작)
2. [📋 필수 요구사항](#-필수-요구사항)
3. [🔧 환경 설정](#-환경-설정)
4. [🛠️ 개발 환경 실행](#️-개발-환경-실행)
5. [🏗️ 프로젝트 구조](#-프로젝트-구조)
6. [📚 API 문서](#-api-문서)
7. [🔑 API 키 발급 가이드](#-api-키-발급-가이드)
8. [🧪 테스트](#-테스트)
9. [🤝 기여 가이드](#-기여-가이드)
10. [📄 라이선스](#-라이선스)

## 🚀 빠른 시작

### 1단계: 프로젝트 클론

```bash
git clone <repository-url>
cd myclo-platform
```

### 2단계: 환경 설정

```bash
# 환경변수 템플릿 복사
cp .env.example .env

# .env 파일에 실제 API 키와 설정 값 입력
# 📋 필수 API 키: Gemini, KMA, Supabase
```

### 3단계: 개발 환경 실행

```bash
# 백엔드 실행
cd backend
python -m app.main

# 새 터미널에서 프론트엔드 실행
cd frontend
npm install
npm run dev
```

### 4단계: 접속 확인

- 🌐 프론트엔드: http://localhost:5173
- 📡 백엔드 API: http://localhost:8000
- 📖 API 문서: http://localhost:8000/docs

## 📋 필수 요구사항

### 시스템 요구사항

- **Node.js**: 18.0.0 이상
- **Python**: 3.12 이상
- **Git**: 최신 버전

### 필수 서비스 계정

1. **[Google Gemini API](https://makersuite.google.com/app/apikey)**
   - 무료 사용량: 월 60회 요청
   - 유료 플랜: 백만 토큰당 $0.075

2. **[Supabase](https://supabase.com)**
   - 무료 플랜: 2개 프로젝트, 500MB DB, 월 5GB 대역폭
   - 월 500,000 API 호출

3. **[기상청 API](https://data.kma.go.kr/dataPortal/list/selectDataApiList.do)**
   - 무료 사용 (회원가입 필요)
   - 일일 1,000회 요청 제한

## 🔧 환경 설정

### 1. .env 파일 설정

프로젝트 루트의 `.env.example`을 복사하여 `.env` 파일을 만들고 아래 정보를 입력하세요:

```bash
cp .env.example .env
```

### 2. 필수 API 키 설정

#### 🤖 Gemini API 설정

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. 'Create API Key' 클릭
3. 생성된 키를 복사하여 `.env` 파일에 붙여넣기:

```env
GEMINI_API_KEY=AIzaSy...your-actual-api-key
GEMINI_MODEL=gemini-1.5-flash
```

#### 🗄️ Supabase 설정

1. [Supabase](https://supabase.com) 접속
2. `myclo-platform` 프로젝트 선택 또는 생성
3. Project Settings → API 에서 아래 정보 확인:

```env
# Project Settings → API → Project URL
SUPABASE_URL=https://your-project-ref.supabase.co

# Project Settings → API → API Keys
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-anon-key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-key

# Project Settings → Database → Connection string
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

#### 🌤️ KMA Weather API 설정

1. [기상청 데이터 포털](https://data.kma.go.kr/dataPortal/list/selectDataApiList.do) 접속
2. 회원가입 후 로그인
3. 기상자료개방포털 > 오픈API활용 > 인증키발급 > 신규발급
4. '동네예보조회' 서비스 선택 후 인증키 발급

```env
KMA_API_KEY=your_kma_api_key_here
```

### 3. Supabase Storage 설정

1. Supabase Dashboard → Storage 로 이동
2. 'Create bucket' 클릭
3. 버킷 설정:

```yaml
이름: wardrobe-images
Public bucket: ✅ (체크)
File size limit: 10MB
Allowed MIME types: 
- image/jpeg
- image/jpg
- image/png
- image/webp
- image/gif
```

### 4. Database 테이블 생성 (향후 확장용)

현재 데이터베이스는 비어있는 상태입니다. 향후 아래 테이블들이 추가될 예정:

```sql
-- 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 옷장 아이템 테이블
CREATE TABLE wardrobe_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  image_url TEXT NOT NULL,
  attributes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🛠️ 개발 환경 실행

### 백엔드 실행

```bash
# 백엔드 디렉토리로 이동
cd backend

# 가상환경 생성 (선택사항)
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# 의존성 설치
pip install -r requirements.txt
# 또는 uv 사용 시: uv sync

# 서버 실행
python -m app.main
```

백엔드 서버가 http://localhost:8000 에서 실행됩니다.

### 프론트엔드 실행

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드가 http://localhost:5173 에서 실행됩니다.

## 🏗️ 프로젝트 구조

```
myclo-platform/
├── .env                    # 🔒 환경변수 (Git에 커밋 안 됨)
├── .env.example           # 📄 환경변수 템플릿
├── .gitignore             # 🚫 Git 제외 파일 목록
├── README.md              # 📚 프로젝트 문서
├── backend/               # 🐍 Python FastAPI 서버
│   ├── app/
│   │   ├── core/         # ⚙️ 환경 설정 및 유틸리티
│   │   │   ├── config.py # 환경변수 로드 및 설정
│   │   │   └── ...
│   │   ├── ai/           # 🤖 AI 관련 모듈
│   │   ├── domains/      # 📦 도메인별 비즈니스 로직
│   │   ├── utils/        # 🔧 공용 유틸리티
│   │   └── main.py       # 🚀 애플리케이션 진입점
│   ├── requirements.txt   # 📦 Python 의존성
│   └── pyproject.toml    # 📋 프로젝트 설정
└── frontend/             # ⚛️ React TypeScript 클라이언트
    ├── src/
    │   ├── config/       # ⚙️ 환경변수 설정
    │   │   └── env.ts   # TypeScript 환경변수 타입
    │   ├── api/          # 🌐 API 클라이언트
    │   ├── components/   # 🧩 React 컴포넌트
    │   ├── pages/        # 📄 페이지 컴포넌트
    │   └── ...
    ├── package.json      # 📦 Node.js 의존성
    └── vite.config.ts    # ⚡ Vite 빌드 설정
```

## 📚 API 문서

백엔드 서버 실행 후 아래 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/health` | GET | 서버 상태 확인 |
| `/api/extract` | POST | 이미지 속성 추출 |
| `/api/wardrobe/items` | GET/POST | 옷장 아이템 관리 |
| `/api/recommend/outfit` | GET | 코디 추천 |
| `/api/today/summary` | GET | 오늘의 날씨 정보 |

## 🔑 API 키 발급 가이드

### Google Gemini API 상세 설정

1. **API 발급**:
   - [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
   - Google 계정으로 로그인
   - 'Create API Key' 클릭
   - 프로젝트 선택 또는 새로 생성
   - 생성된 API 키 복사

2. **사용량 한도**:
   - **무료**: 월 60회 요청
   - **유료**: 백만 토큰당 $0.075 (Flash 모델 기준)
   - [요금 정책](https://ai.google.dev/pricing)

### Supabase 상세 설정

1. **프로젝트 생성**:
   - [Supabase](https://supabase.com) 접속
   - 'New Project' 클릭
   - 조직 선택 (기존 조직 또는 새 조직)
   - 프로젝트 정보 입력

2. **API 정보 확인**:
   ```bash
   # Project Settings → API → Configuration
   Project URL: https://your-project-ref.supabase.co
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **데이터베이스 연결**:
   ```bash
   # Project Settings → Database → Connection string
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
   ```

### KMA Weather API 상세 설정

1. **회원가입**:
   - [기상청 데이터 포털](https://data.kma.go.kr/dataPortal/list/selectDataApiList.do) 접속
   - 우측 상단 '회원가입' 클릭
   - 필수 정보 입력 및 이메일 인증

2. **인증키 발급**:
   - 로그인 후 '오픈API활용' → '인증키발급' 메뉴 이동
   - '동네예보조회' 서비스 선택
   - '확인용', '운영용' 키 발급
   - '인증키확인'에서 상세 정보 확인

3. **API 사용법**:
   - 기본 URL: `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`
   - 필요 파라미터: serviceKey, pageNo, numOfRows, dataType, base_date, base_time, nx, ny

## 🧪 테스트

### 백엔드 테스트

```bash
# 백엔드 디렉토리에서
cd backend

# 테스트 실행
pytest

# 커버리지 확인
pytest --cov=app

# 특정 테스트 파일
pytest tests/test_auth.py
```

### 프론트엔드 테스트

```bash
# 프론트엔드 디렉토리에서
cd frontend

# 테스트 실행
npm test
```

## 🤝 기여 가이드

### 개발 워크플로우

1. **이슈 생성**: [GitHub Issues](../../issues)에서 기능 개선이나 버그 리포트 작성
2. **브랜치 생성**: `git checkout -b feature/your-feature-name`
3. **코드 작성**: 프로젝트 규칙 및 스타일 가이드 준수
4. **테스트**: 새로운 기능에 대한 테스트 코드 작성
5. **커밋**: [컨벤션](#커밋-메시지-컨벤션)에 따른 커밋 메시지 작성
6. **PR 생성**: Pull Request 생성 및 코드 리뷰 요청
7. **머지**: 리뷰 완료 후 메인 브랜치에 머지

### 코드 스타일

- **Python**: PEP 8 준수, 4 spaces 들여쓰기
- **TypeScript**: ESLint 설정 준수
- **네이밍**: snake_case (Python), camelCase (TypeScript)

### 커밋 메시지 컨벤션

```
[feat] 새로운 기능 추가
[fix] 버그 수정
[refactor] 코드 리팩토링
[docs] 문서 수정
[style] 코드 스타일 수정
[test] 테스트 코드 추가/수정
[chore] 빌드/환경 설정 수정
```

## 📄 라이선스

현재 별도 라이선스 파일은 아직 추가되지 않았습니다.

---

### 🆘 도움이 필요하시면?

- 📧 **이메일**: contact@myclo.com
- 🐛 **버그 리포트**: [GitHub Issues](../../issues)
- 💡 **기능 요청**: [GitHub Issues](../../issues)
- 💬 **디스커션**: [GitHub Discussions](../../discussions)

**Happy Coding! 🎉**
