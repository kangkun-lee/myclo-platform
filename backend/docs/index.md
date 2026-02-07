# Backend Documentation

MyClo 백엔드 문서의 시작점입니다.

## 개요

- 런타임: FastAPI
- 기본 주소: `http://localhost:8000`
- API 문서: `http://localhost:8000/docs`
- 주요 구성: 도메인(`app/domains`), AI(`app/ai`), 코어(`app/core`), 유틸(`app/utils`)

## 빠른 실행

```bash
# backend 디렉토리에서
uv sync
uv run python -m app.main
```

## 프로젝트 구조

```text
backend/
├── app/
│   ├── domains/                 # 도메인별 라우터/서비스/스키마/모델
│   ├── ai/                      # Gemini 클라이언트, 프롬프트, 워크플로우
│   ├── core/                    # 공통 설정/인증/헬스/스키마
│   ├── utils/                   # 공용 헬퍼/검증/응답 유틸
│   ├── database.py
│   └── main.py
├── tests/
├── docs/
├── pyproject.toml
└── README.md
```

## 문서 맵

- 개발 규칙: `backend/docs/development/rules.md`
- 아키텍처
  - `backend/docs/architecture/langgraph-flows.md`
  - `backend/docs/architecture/weather-batch.md`
- API
  - `backend/docs/api/auth.md`
  - `backend/docs/api/extraction.md`
  - `backend/docs/api/wardrobe.md`
  - `backend/docs/api/recommendation.md`
  - `backend/docs/api/weather-api.md`
- 가이드
  - `backend/docs/guides/vscode-debugging.md`

## 환경 변수 (핵심)

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_VISION_MODEL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `KMA_API_KEY` 또는 `KMA_SERVICE_KEY`

세부 설정은 `app/core/config.py`를 기준으로 관리합니다.
