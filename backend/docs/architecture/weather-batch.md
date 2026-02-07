# Weather Batch System

## 개요

전국 주요 지역의 날씨 데이터를 수집해 DB에 저장하는 배치 로직입니다.

핵심 구현 위치:

- 엔트리 함수: `app/batch/weather.py`
- 도메인 서비스: `app/domains/weather/service.py`
- 외부 API 클라이언트: `app/domains/weather/client.py`

## 실행 흐름

```text
run_daily_weather_batch(db)
  -> weather_service.fetchAndLoadWeather(db)
  -> 17개 지역 병렬 호출
  -> 파싱(TMN/TMX/PTY)
  -> DB upsert
```

## 동작 특성

- 병렬 처리: `asyncio.gather`로 지역별 API 동시 호출
- 재시도: 실패 지역만 최대 3회 재시도(백오프 적용)
- 부분 성공 허용: 일부 지역 실패 시 `partial_success` 반환
- DB 저장: `(base_date, nx, ny)` 기준으로 기존 레코드 업데이트 또는 신규 추가

## 반환 예시

```json
{
  "status": "success",
  "total": 17,
  "success": 17,
  "failed": 0,
  "message": "All 17 regions saved successfully"
}
```

실패가 포함되면:

```json
{
  "status": "partial_success",
  "total": 17,
  "success": 15,
  "failed": 2,
  "failed_regions": ["Busan", "Jeju-do"],
  "message": "Saved 15/17 regions. Failed: ['Busan', 'Jeju-do']"
}
```

## 수동 실행

FastAPI 라우터를 통해 트리거할 수 있습니다.

```bash
curl -X GET "http://localhost:8000/api/weather/batch"
```

## 참고

- 현재 저장소 기준으로 `function_app.py`, `host.json` 전제는 사용하지 않습니다.
- 운영 스케줄러가 필요하면 Cron/워크플로우/외부 스케줄러에서 위 엔트리 함수를 호출하도록 구성합니다.
