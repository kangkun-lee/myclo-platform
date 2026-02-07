# 추천 API (Recommendation)

코디 추천 및 점수 평가 API입니다.

## Base URL

```text
/api
```

## 엔드포인트

### 코디 추천

```http
GET /recommend/outfit
```

쿼리 파라미터:

- `count` (기본 1)
- `season` (선택)
- `formality` (선택)
- `use_llm` (기본 `true`)

예시:

```bash
curl -X GET "http://localhost:8000/api/recommend/outfit?count=3&season=spring&use_llm=true"
```

### 코디 점수 평가

```http
GET /outfit/score
```

쿼리 파라미터:

- `top_id`
- `bottom_id`

예시:

```bash
curl -X GET "http://localhost:8000/api/outfit/score?top_id=TOP_UUID&bottom_id=BOTTOM_UUID"
```

### 오늘의 추천 코디

```http
POST /recommend/todays-pick
```

JWT 인증이 필요합니다.

### 오늘의 추천 재생성

```http
POST /recommend/todays-pick/regenerate
```

JWT 인증이 필요합니다.

## 비고

- LLM 기반 추천은 현재 Gemini를 사용합니다.
- LLM 실패 시 규칙 기반 추천으로 폴백합니다.
