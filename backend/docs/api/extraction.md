# 이미지 분석 API (Extraction)

옷 이미지를 업로드해 속성을 추출하고 옷장에 저장합니다.

## Base URL

```text
/api
```

## 인증

JWT Bearer 토큰이 필요합니다.

## 엔드포인트

### 이미지 속성 추출 및 저장

```http
POST /extract
Content-Type: multipart/form-data
```

요청 필드:

- `images`: 업로드할 이미지 파일 배열(복수 가능)

예시:

```bash
curl -X POST "http://localhost:8000/api/extract" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/item1.jpg" \
  -F "images=@/path/to/item2.jpg"
```

응답 예시:

```json
{
  "success": true,
  "items": [
    {
      "success": true,
      "saved_to": "supabase:8d8f...",
      "image_url": "https://...",
      "item_id": "8d8f...",
      "blob_name": "users/.../item.png",
      "storage_type": "supabase",
      "attributes": {
        "category": { "main": "top", "sub": "shirt", "confidence": 0.95 }
      }
    }
  ],
  "total_processed": 2
}
```

## 파일 제한

- 허용 확장자: `jpg`, `jpeg`, `png`, `gif`, `webp`
- 최대 파일 크기: 기본 10MB (`MAX_FILE_SIZE`)

## 관련 API

- `backend/docs/api/wardrobe.md`
- `backend/docs/api/recommendation.md`
