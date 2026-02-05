"""Today's Pick service (in-memory, Gemini-driven)."""

import logging
from typing import Any, Optional
from uuid import UUID

from app.ai.clients.gemini_client import gemini_client
from app.utils.json_parser import parse_dict_from_text
from app.storage.memory_store import (
    get_todays_pick,
    list_wardrobe_items,
    set_todays_pick,
)

logger = logging.getLogger(__name__)


def _pick_items(items: list[dict[str, Any]]) -> dict[str, Any]:
    from app.domains.recommendation.service import recommender
    tops = [i for i in items if i.get("attributes", {}).get("category", {}).get("main") == "top"]
    bottoms = [
        i for i in items if i.get("attributes", {}).get("category", {}).get("main") == "bottom"
    ]
    if not tops or not bottoms:
        raise ValueError("Insufficient wardrobe items")

    best = None
    best_score = -1.0
    for top in tops:
        for bottom in bottoms:
            score, _ = recommender.calculate_outfit_score(top, bottom)
            score = float(score)
            if score > best_score:
                best_score = score
                best = {"top": top, "bottom": bottom, "score": score}

    return best or {"top": tops[0], "bottom": bottoms[0], "score": 0.5}


def recommend_todays_pick_v2(
    user_id: UUID,
    weather: dict[str, Any],
    db: Optional[object] = None,
    context: Optional[str] = None,
) -> dict[str, Any]:
    """Return Today's Pick using in-memory wardrobe + Gemini reasoning."""
    try:
        existing = get_todays_pick(user_id)
        if existing:
            return {
                "success": True,
                "pick_id": existing.id,
                "top_id": existing.top_id,
                "bottom_id": existing.bottom_id,
                "image_url": existing.image_url,
                "reasoning": existing.reasoning,
                "score": existing.score,
                "weather": existing.weather,
                "weather_summary": weather.get("summary", ""),
                "temp_min": float(weather.get("temp_min", 0.0)),
                "temp_max": float(weather.get("temp_max", 0.0)),
                "message": "이전에 생성된 오늘의 추천을 반환합니다.",
            }

        result = list_wardrobe_items(user_id=user_id, skip=0, limit=200)
        raw_items = result.get("items") if isinstance(result, dict) else []
        items_list = raw_items if isinstance(raw_items, list) else []
        items = [
            {
                "id": item.id,
                "image_url": item.image_url,
                "attributes": item.attributes,
            }
            for item in items_list
        ]
        picked = _pick_items(items)

        prompt = (
            "너는 한국어 패션 스타일리스트다. 아래 정보로 오늘의 코디를 추천한다. "
            "JSON으로만 답변하라.\n"
            f"날씨: {weather.get('summary', '')}\n"
            f"요청: {context or '특별한 요청 없음'}\n"
            f"상의: {picked['top']}\n"
            f"하의: {picked['bottom']}\n"
            "응답 형식: {\"reasoning\": \"...\", \"style_description\": \"...\"}"
        )

        response_text = gemini_client.generate_content(
            prompt, temperature=0.7, max_output_tokens=400
        )
        parsed, _ = parse_dict_from_text(response_text)
        reasoning = response_text
        style_description = "Stylish Combination"
        if isinstance(parsed, dict):
            reasoning = parsed.get("reasoning") or reasoning
            style_description = parsed.get("style_description") or style_description

        saved = set_todays_pick(
            user_id=user_id,
            top_id=picked["top"]["id"],
            bottom_id=picked["bottom"]["id"],
            reasoning=reasoning,
            score=round(float(picked["score"]), 3),
            weather=weather,
            image_url=None,
        )

        return {
            "success": True,
            "pick_id": saved.id,
            "top_id": saved.top_id,
            "bottom_id": saved.bottom_id,
            "image_url": saved.image_url,
            "reasoning": reasoning,
            "score": saved.score,
            "weather": weather,
            "weather_summary": weather.get("summary", ""),
            "temp_min": float(weather.get("temp_min", 0.0)),
            "temp_max": float(weather.get("temp_max", 0.0)),
            "message": "새로운 오늘의 추천을 생성했습니다.",
            "outfit": {
                "top": picked["top"],
                "bottom": picked["bottom"],
                "score": round(float(picked["score"]), 3),
                "reasons": [],
                "reasoning": reasoning,
                "style_description": style_description,
            },
        }
    except Exception as e:
        logger.error(f"Today's Pick failed: {e}")
        raise
