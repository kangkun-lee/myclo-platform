# 옷장 API (Wardrobe)

옷장 아이템 조회/상세/삭제/수동 생성 API입니다.

## Base URL

```text
/api
```

## 엔드포인트

### 내 옷장 목록

```http
GET /wardrobe/users/me/images
```

쿼리 파라미터:

- `category` (선택)
- `skip` (기본 0)
- `limit` (기본 20, 최대 100)

JWT 인증이 필요합니다.

예시:

```bash
curl -X GET "http://localhost:8000/api/wardrobe/users/me/images?category=top&skip=0&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 아이템 상세 조회

```http
GET /wardrobe/items/{item_id}
```

JWT 인증이 필요합니다.

### 아이템 삭제

```http
DELETE /wardrobe/items/{item_id}
```

JWT 인증이 필요합니다.

### 아이템 수동 생성

```http
POST /wardrobe/items
Content-Type: application/json
```

JWT 인증이 필요합니다.

### (보조) 메모리 스토어 목록

```http
GET /wardrobe/items
```

## 업로드/추출 연계

이미지 업로드 및 자동 속성 추출은 `POST /api/extract`를 사용합니다.

예시:

```bash
curl -X POST "http://localhost:8000/api/extract" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/item.jpg"
```
