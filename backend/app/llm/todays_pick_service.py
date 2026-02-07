"""Today's Pick service (in-memory, Gemini-driven)."""

import logging
from typing import Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.ai.clients.gemini_client import gemini_client
from app.utils.json_parser import parse_dict_from_text
from app.storage.memory_store import (
    get_todays_pick,
    list_wardrobe_items,
    set_todays_pick,
)
from app.domains.recommendation.model import TodaysPick
from app.domains.user.model import User
from app.domains.user.service import user_manager

logger = logging.getLogger(__name__)


def _pick_items(items: list[dict[str, Any]]) -> dict[str, Any]:
    from app.domains.recommendation.service import recommender

    tops = [
        i
        for i in items
        if i.get("attributes", {}).get("category", {}).get("main") == "top"
    ]
    bottoms = [
        i
        for i in items
        if i.get("attributes", {}).get("category", {}).get("main") == "bottom"
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


async def recommend_todays_pick_v2(
    user_id: UUID,
    weather: dict[str, Any],
    db: Optional[Session] = None,
    context: Optional[str] = None,
    generate_image: bool = False,
) -> dict[str, Any]:
    """Return Today's Pick using DB persistence + Gemini reasoning."""
    try:
        from app.domains.wardrobe.schema import WardrobeItemSchema
        from app.domains.generation.service import generation_service
        from app.domains.generation.schema import OutfitGenerationRequest

        # Load all user items for matching
        items = []
        full_schemas = {}  # Map ID to full schema for generation

        if db:
            from app.domains.wardrobe.service import wardrobe_manager

            # 1. Check DB for existing pick in the recent 24h window
            recent_window_start = datetime.now() - timedelta(hours=24)
            existing_pick = (
                db.query(TodaysPick)
                .filter(
                    TodaysPick.user_id == user_id,
                    TodaysPick.created_at >= recent_window_start,
                )
                .order_by(desc(TodaysPick.created_at))
                .first()
            )

            # Load Wardrobe Items
            res = wardrobe_manager.get_user_wardrobe_items(
                db=db,
                user_id=user_id,
                skip=0,
                limit=200,
                resolve_image_urls=generate_image,
            )
            items_list = res.get("items", [])
            for item in items_list:
                full_schemas[str(item.id)] = item
                items.append(
                    {
                        "id": item.id,
                        "filename": item.filename,
                        "image_url": item.image_url,
                        "attributes": (
                            item.attributes.model_dump()
                            if hasattr(item.attributes, "model_dump")
                            else item.attributes
                        ),
                    }
                )
        else:
            # Fallback to Memory Store
            existing = get_todays_pick(user_id)
            existing_pick = None  # Bridge logic if needed, but memory store has different structure object

            result = list_wardrobe_items(user_id=user_id, skip=0, limit=200)
            items_list = result.get("items") if isinstance(result, dict) else []
            for item in items_list:
                # Mock schema if using memory store (for backward compatibility/testing)
                schema = WardrobeItemSchema(
                    id=str(item.id),
                    filename=f"item_{item.id}",
                    attributes=item.attributes,
                    image_url=item.image_url,
                )
                full_schemas[str(item.id)] = schema
                items.append(
                    {
                        "id": item.id,
                        "filename": schema.filename,
                        "image_url": item.image_url,
                        "attributes": item.attributes,
                    }
                )

            # Map memory store existing to DB-like object if needed, or just handle separate logic
            # For simplicity, if using memory store, we use the specific memory store logic block below
            if existing:
                # Logic for memory store existing object retrieval matches original code
                pass

        # Handle Existing Persistence (DB or Memory)
        if db and existing_pick:
            top_item = next(
                (i for i in items if str(i["id"]) == str(existing_pick.top_id)), None
            )
            bottom_item = next(
                (i for i in items if str(i["id"]) == str(existing_pick.bottom_id)), None
            )

            def _resolve_item_image(item: dict[str, Any] | None) -> dict[str, Any] | None:
                if not item:
                    return item
                resolved = dict(item)
                image_url = resolved.get("image_url")
                if image_url and isinstance(image_url, str) and not image_url.startswith("http"):
                    resolved["image_url"] = wardrobe_manager.get_signed_url(image_url)
                return resolved

            clean_reasoning = existing_pick.reasoning
            if clean_reasoning:
                parsed_r, _ = parse_dict_from_text(clean_reasoning)
                if parsed_r and isinstance(parsed_r, dict) and "reasoning" in parsed_r:
                    clean_reasoning = parsed_r["reasoning"]
                else:
                    # Fallback cleanup if parsing failed but it looks like markdown
                    if "```" in clean_reasoning:
                        clean_reasoning = (
                            clean_reasoning.replace("```json", "")
                            .replace("```", "")
                            .strip()
                        )

            if top_item and bottom_item:
                existing_image_url = (
                    wardrobe_manager.get_signed_url(existing_pick.image_url)
                    if existing_pick.image_url
                    and not existing_pick.image_url.startswith("http")
                    else existing_pick.image_url
                )

                if not existing_image_url and generate_image:
                    try:
                        top_schema = full_schemas.get(str(existing_pick.top_id))
                        bottom_schema = full_schemas.get(str(existing_pick.bottom_id))
                        if top_schema and bottom_schema:
                            user_height = None
                            user_weight = None
                            user_gender = "unisex"
                            user_body_shape = None
                            user_face_url = None

                            user_obj = db.query(User).filter(User.id == user_id).first()
                            if user_obj:
                                user_height = (
                                    float(user_obj.height) if user_obj.height else None
                                )
                                user_weight = (
                                    float(user_obj.weight) if user_obj.weight else None
                                )
                                user_gender = (
                                    user_obj.gender if user_obj.gender else "unisex"
                                )
                                user_body_shape = user_obj.body_shape
                                if user_obj.face_image_path:
                                    user_face_url = user_manager.get_signed_url(
                                        user_obj.face_image_path
                                    )

                            gen_request = OutfitGenerationRequest(
                                top=top_schema,
                                bottom=bottom_schema,
                                style_description="Previously Saved Style",
                                gender=user_gender,
                                height=user_height,
                                weight=user_weight,
                                body_shape=user_body_shape,
                                face_image_url=user_face_url,
                            )
                            generated_image_url = (
                                await generation_service.create_outfit_image(
                                    gen_request, user_id
                                )
                            )
                            if generated_image_url:
                                existing_pick.image_url = generated_image_url
                                db.commit()
                                db.refresh(existing_pick)
                                existing_image_url = (
                                    user_manager.get_signed_url(generated_image_url)
                                    if not generated_image_url.startswith("http")
                                    else generated_image_url
                                )
                    except Exception as gen_err:
                        logger.error(
                            f"Failed to backfill existing Today's Pick image: {gen_err}"
                        )

                top_item_resolved = _resolve_item_image(top_item)
                bottom_item_resolved = _resolve_item_image(bottom_item)
                return {
                    "success": True,
                    "pick_id": existing_pick.id,
                    "top_id": (
                        str(existing_pick.top_id) if existing_pick.top_id else None
                    ),
                    "bottom_id": (
                        str(existing_pick.bottom_id)
                        if existing_pick.bottom_id
                        else None
                    ),
                    "image_url": existing_image_url,
                    "reasoning": clean_reasoning,
                    "score": existing_pick.score,
                    "weather": existing_pick.weather,
                    "weather_summary": weather.get("summary", ""),
                    "temp_min": float(weather.get("temp_min", 0.0)),
                    "temp_max": float(weather.get("temp_max", 0.0)),
                    "message": "이전에 생성된 오늘의 추천을 반환합니다.",
                    "outfit": {
                        "top": top_item_resolved,
                        "bottom": bottom_item_resolved,
                        "score": existing_pick.score,
                        "reasons": [],
                        "reasoning": clean_reasoning,
                        "style_description": "Previously Saved Style",
                    },
                }
        elif not db:
            # Check Memory Store
            existing = get_todays_pick(user_id)
            if existing:
                top_item = next(
                    (i for i in items if str(i["id"]) == str(existing.top_id)), None
                )
                bottom_item = next(
                    (i for i in items if str(i["id"]) == str(existing.bottom_id)), None
                )
                if top_item and bottom_item:
                    return {
                        "success": True,
                        "pick_id": existing.id,
                        "top_id": str(existing.top_id) if existing.top_id else None,
                        "bottom_id": (
                            str(existing.bottom_id) if existing.bottom_id else None
                        ),
                        "image_url": existing.image_url,
                        "reasoning": existing.reasoning,
                        "score": existing.score,
                        "weather": existing.weather,
                        "weather_summary": weather.get("summary", ""),
                        "temp_min": float(weather.get("temp_min", 0.0)),
                        "temp_max": float(weather.get("temp_max", 0.0)),
                        "message": "이전에 생성된 오늘의 추천을 반환합니다.",
                        "outfit": {
                            "top": top_item,
                            "bottom": bottom_item,
                            "score": existing.score,
                            "reasons": [],
                            "reasoning": existing.reasoning,
                            "style_description": "Previously Saved Style",
                        },
                    }

        if not items:
            raise ValueError("No wardrobe items found for user")

        picked = _pick_items(items)

        # 1. Get reasoning from Gemini
        prompt = (
            "너는 한국어 패션 스타일리스트다. 아래 정보로 오늘의 추천 코디를 제안한다. "
            "JSON으로만 답변하라.\n"
            f"날씨: {weather.get('summary', '')}\n"
            f"요청: {context or '특별한 요청 없음'}\n"
            f"상의: {picked['top']}\n"
            f"하의: {picked['bottom']}\n"
            '응답 형식: {"reasoning": "...", "style_description": "..."}'
        )

        response_text = gemini_client.generate_content(
            prompt, temperature=0.7, max_output_tokens=1000
        )
        parsed, _ = parse_dict_from_text(response_text)

        reasoning = response_text
        style_description = "Stylish Combination"
        if isinstance(parsed, dict):
            reasoning = parsed.get("reasoning") or reasoning
            style_description = parsed.get("style_description") or style_description

        # Extra cleanup if reasoning is still a JSON string
        if isinstance(reasoning, str) and reasoning.strip().startswith("{"):
            try:
                inner_parsed, _ = parse_dict_from_text(reasoning)
                if (
                    inner_parsed
                    and isinstance(inner_parsed, dict)
                    and "reasoning" in inner_parsed
                ):
                    reasoning = inner_parsed["reasoning"]
            except:
                pass

        if isinstance(reasoning, str) and "```" in reasoning:
            reasoning = reasoning.replace("```json", "").replace("```", "").strip()

        # 2. Generate Outfit Image using Nano Banana (Gemini)
        generated_image_url = None
        if generate_image:
            try:
                top_schema = full_schemas.get(str(picked["top"]["id"]))
                bottom_schema = full_schemas.get(str(picked["bottom"]["id"]))

                if top_schema and bottom_schema:
                    # User info fetch
                    user_height = None
                    user_weight = None
                    user_gender = "unisex"
                    user_body_shape = None
                    user_face_url = None

                    if db:
                        user_obj = db.query(User).filter(User.id == user_id).first()
                        if user_obj:
                            user_height = (
                                float(user_obj.height) if user_obj.height else None
                            )
                            user_weight = (
                                float(user_obj.weight) if user_obj.weight else None
                            )
                            user_gender = user_obj.gender if user_obj.gender else "unisex"
                            user_body_shape = user_obj.body_shape
                            if user_obj.face_image_path:
                                user_face_url = user_manager.get_signed_url(
                                    user_obj.face_image_path
                                )

                    logger.info(
                        f"Creating outfit image request for top: {picked['top']['id']}, bottom: {picked['bottom']['id']}"
                    )
                    gen_request = OutfitGenerationRequest(
                        top=top_schema,
                        bottom=bottom_schema,
                        style_description=style_description,
                        gender=user_gender,
                        height=user_height,
                        weight=user_weight,
                        body_shape=user_body_shape,
                        face_image_url=user_face_url,
                    )
                    generated_image_url = await generation_service.create_outfit_image(
                        gen_request, user_id
                    )
                    if generated_image_url:
                        logger.info(f"✅ Generated outfit image: {generated_image_url}")
                    else:
                        logger.warning("⚠️ Image generation returned None (no URL)")
                else:
                    logger.warning(
                        f"Missing schemas - top: {top_schema is not None}, bottom: {bottom_schema is not None}"
                    )
            except Exception as gen_err:
                logger.error(f"❌ Failed to generate outfit image: {gen_err}")
                import traceback

                logger.error(traceback.format_exc())
                # Continue without image if generation fails

        # 3. Save and Return
        top_for_response = dict(picked["top"])
        bottom_for_response = dict(picked["bottom"])
        if db:
            from app.domains.wardrobe.service import wardrobe_manager

            top_img = top_for_response.get("image_url")
            bottom_img = bottom_for_response.get("image_url")
            if isinstance(top_img, str) and top_img and not top_img.startswith("http"):
                top_for_response["image_url"] = wardrobe_manager.get_signed_url(top_img)
            if isinstance(bottom_img, str) and bottom_img and not bottom_img.startswith("http"):
                bottom_for_response["image_url"] = wardrobe_manager.get_signed_url(bottom_img)

        pick_id = None
        if db:
            new_pick = TodaysPick(
                user_id=user_id,
                top_id=picked["top"]["id"],
                bottom_id=picked["bottom"]["id"],
                reasoning=reasoning,
                score=round(float(picked["score"]), 3),
                weather=weather,
                image_url=generated_image_url,
            )
            db.add(new_pick)
            db.commit()
            db.refresh(new_pick)
            pick_id = new_pick.id
        else:
            # Fallback to memory
            saved = set_todays_pick(
                user_id=user_id,
                top_id=picked["top"]["id"],
                bottom_id=picked["bottom"]["id"],
                reasoning=reasoning,
                score=round(float(picked["score"]), 3),
                weather=weather,
                image_url=generated_image_url,
            )
            pick_id = saved.id

        result_message = "새로운 오늘의 추천을 생성했습니다."
        if generate_image and generated_image_url:
            result_message = "새로운 오늘의 추천과 AI 실착 이미지를 생성했습니다."

        return {
            "success": True,
            "pick_id": pick_id,
            "top_id": str(picked["top"]["id"]),
            "bottom_id": str(picked["bottom"]["id"]),
            "image_url": (
                user_manager.get_signed_url(generated_image_url)
                if generated_image_url and not generated_image_url.startswith("http")
                else generated_image_url
            ),
            "reasoning": reasoning,
            "score": round(float(picked["score"]), 3),
            "weather": weather,
            "weather_summary": weather.get("summary", ""),
            "temp_min": float(weather.get("temp_min", 0.0)),
            "temp_max": float(weather.get("temp_max", 0.0)),
            "message": result_message,
            "outfit": {
                "top": top_for_response,
                "bottom": bottom_for_response,
                "score": round(float(picked["score"]), 3),
                "reasons": [],
                "reasoning": reasoning,
                "style_description": style_description,
            },
        }

    except Exception as e:
        logger.error(f"Today's Pick failed: {e}")
        raise
