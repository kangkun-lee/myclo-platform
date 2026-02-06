from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.storage.memory_store import list_all_items
from .service import recommender
from .model import TodaysPick
from .schema import (
    RecommendationResponse,
    OutfitScoreResponse,
    TodaysPickRequest,
    TodaysPickResponse,
)
from app.domains.wardrobe.schema import WardrobeItemSchema
from app.core.schemas import AttributesSchema
from app.utils.response_helpers import create_success_response, handle_route_exception
from app.core.auth import get_current_user_id

recommendation_router = APIRouter()


@recommendation_router.post("/recommend/todays-pick", response_model=TodaysPickResponse)
async def recommend_todays_pick(
    request: TodaysPickRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    오늘의 추천 코디 (Today's Pick)
    """
    try:
        from app.llm.todays_pick_service import recommend_todays_pick_v2
        from app.domains.weather.service import weather_service

        weather_info = await weather_service.get_weather_info(
            db, request.lat, request.lon
        )
        result = await recommend_todays_pick_v2(
            user_id=user_id, weather=weather_info, db=db
        )
        return result
    except Exception as e:
        raise handle_route_exception(e)


@recommendation_router.post(
    "/recommend/todays-pick/regenerate", response_model=TodaysPickResponse
)
async def regenerate_todays_pick(
    request: TodaysPickRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    오늘의 추천 코디 재생성 (Regenerate Today's Pick)
    기존 오늘의 추천을 삭제하고 새로운 추천을 생성합니다.
    """
    try:
        from app.llm.todays_pick_service import recommend_todays_pick_v2
        from app.domains.weather.service import weather_service
        from datetime import datetime

        # Delete today's existing picks
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        db.query(TodaysPick).filter(
            TodaysPick.user_id == user_id, TodaysPick.created_at >= today_start
        ).delete()
        db.commit()

        # Generate new pick
        weather_info = await weather_service.get_weather_info(
            db, request.lat, request.lon
        )
        result = await recommend_todays_pick_v2(
            user_id=user_id, weather=weather_info, db=db
        )
        return result
    except Exception as e:
        raise handle_route_exception(e)


@recommendation_router.get("/outfit/score", response_model=OutfitScoreResponse)
def get_outfit_score(top_id: str = Query(...), bottom_id: str = Query(...)):
    try:
        all_items = [
            {
                "id": item.id,
                "attributes": item.attributes,
                "image_url": item.image_url,
            }
            for item in list_all_items()
        ]

        top_item = next((item for item in all_items if item.get("id") == top_id), None)
        bottom_item = next(
            (item for item in all_items if item.get("id") == bottom_id), None
        )

        if not top_item or not bottom_item:
            raise HTTPException(status_code=404, detail="Items not found")

        score, reasons = recommender.calculate_outfit_score(top_item, bottom_item)

        return create_success_response(
            {
                "score": round(score, 3),
                "score_percent": round(score * 100),
                "reasons": reasons,
                "top": top_item,
                "bottom": bottom_item,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise handle_route_exception(e)


@recommendation_router.get("/recommend/outfit", response_model=RecommendationResponse)
def recommend_outfit(
    count: int = Query(1, ge=1),
    season: Optional[str] = Query(None),
    formality: Optional[float] = Query(None),
    use_llm: bool = Query(True, description="LLM 사용 여부 (기본값: true)"),
):
    try:
        all_items = [
            {
                "id": item.id,
                "attributes": item.attributes,
                "image_url": item.image_url,
            }
            for item in list_all_items()
        ]

        tops = [
            item
            for item in all_items
            if item.get("attributes", {}).get("category", {}).get("main") == "top"
        ]
        bottoms = [
            item
            for item in all_items
            if item.get("attributes", {}).get("category", {}).get("main") == "bottom"
        ]
        outers = [
            item
            for item in all_items
            if item.get("attributes", {}).get("category", {}).get("main") == "outer"
        ]

        if not tops or not bottoms:
            return create_success_response(
                {"outfits": []},
                count=0,
                method="none",
                message="Not enough items in wardrobe (need at least one top and one bottom)",
            )

        if season:
            tops = [
                t
                for t in tops
                if season.lower()
                in t.get("attributes", {}).get("scores", {}).get("season", [])
            ]
            bottoms = [
                b
                for b in bottoms
                if season.lower()
                in b.get("attributes", {}).get("scores", {}).get("season", [])
            ]
            outers = [
                o
                for o in outers
                if season.lower()
                in o.get("attributes", {}).get("scores", {}).get("season", [])
            ]

        if formality is not None:
            tops = [
                t
                for t in tops
                if abs(
                    t.get("attributes", {}).get("scores", {}).get("formality", 0.5)
                    - formality
                )
                <= 0.3
            ]
            bottoms = [
                b
                for b in bottoms
                if abs(
                    b.get("attributes", {}).get("scores", {}).get("formality", 0.5)
                    - formality
                )
                <= 0.3
            ]
            outers = [
                o
                for o in outers
                if abs(
                    o.get("attributes", {}).get("scores", {}).get("formality", 0.5)
                    - formality
                )
                <= 0.3
            ]

        if not tops or not bottoms:
            return create_success_response(
                {"outfits": []},
                count=0,
                method="none",
                message="No items match the filters",
            )

        # Use Gemini
        if use_llm:
            try:
                recommendations = recommender.recommend_with_llm(tops, bottoms, count)
                if recommendations:
                    return create_success_response(
                        {"outfits": recommendations},
                        count=len(recommendations),
                        method="gemini",
                    )
            except Exception as e:
                print(f"LLM recommendation error: {e}")
                # Fall through to rule-based fallback

        # Fallback: rule-based recommendation
        recommendations = recommender._rule_based_recommendation(tops, bottoms, count)
        return create_success_response(
            {"outfits": recommendations},
            count=len(recommendations),
            method="rule-based",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise handle_route_exception(e)
