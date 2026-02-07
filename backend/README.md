# MyClo Backend

MyClo 백엔드는 FastAPI 기반 API 서버입니다. 옷 이미지 속성 추출, 옷장 관리, 코디 추천, 날씨 요약 기능을 제공합니다.

## 아키텍처

도메인 중심 구조를 사용합니다.

```text
app/
├── domains/            # 도메인별 라우터/서비스/스키마/모델
│   ├── auth/
│   ├── user/
│   ├── wardrobe/
│   ├── extraction/
│   ├── recommendation/
│   ├── weather/
│   └── chat/
├── ai/                 # Gemini 클라이언트, 프롬프트, 워크플로우
├── core/               # 설정, 인증, 공통 스키마/헬스
├── utils/              # 공용 유틸리티
├── database.py
└── main.py
```

## 빠른 시작

### 요구사항

- Python 3.12+

### 설치 및 실행

```bash
# backend 디렉토리에서
uv sync
uv run python -m app.main
```

서버 주소: `http://localhost:8000`

API 문서:

- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 주요 기술

- Framework: FastAPI
- DB: PostgreSQL + SQLAlchemy
- LLM: Gemini
- Storage: Supabase Storage
- Validation: Pydantic

## 문서

- 메인 문서: `backend/docs/index.md`
- 개발 규칙: `backend/docs/development/rules.md`
- API 문서: `backend/docs/api/`
- 아키텍처: `backend/docs/architecture/`
