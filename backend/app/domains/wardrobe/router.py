from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.schemas import AttributesSchema
from app.domains.extraction.schema import ExtractionUrlResponse
from app.storage.memory_store import (
    add_wardrobe_item,
    get_wardrobe_item,
    list_all_items,
    list_wardrobe_items,
)
from app.utils.response_helpers import create_success_response, handle_route_exception
from .schema import WardrobeItemCreate, WardrobeItemSchema, WardrobeResponse
from app.core.auth import get_current_user_id
from sqlalchemy.orm import Session
from app.database import get_db

wardrobe_router = APIRouter()


@wardrobe_router.get("/wardrobe/items", response_model=WardrobeResponse)
def get_wardrobe_items(category: Optional[str] = Query(None)):
    """Get all wardrobe items"""
    try:
        items = list_all_items()
        if category:
            filtered = []
            for item in items:
                cat = (
                    item.attributes.get("category", {})
                    if isinstance(item.attributes, dict)
                    else {}
                )
                main = cat.get("main") if isinstance(cat, dict) else None
                if main and main.lower() == category.lower():
                    filtered.append(item)
            items = filtered

        response_items = [
            WardrobeItemSchema(
                id=item.id,
                filename=f"item_{item.id}",
                attributes=AttributesSchema(**(item.attributes or {})),
                image_url=item.image_url,
            )
            for item in items
        ]

        return create_success_response(
            {"items": response_items},
            count=len(response_items),
            total_count=len(response_items),
            has_more=False,
        )
    except Exception as e:
        raise handle_route_exception(e)


@wardrobe_router.get(
    "/wardrobe/users/me/images",
    response_model=WardrobeResponse,
    summary="내 옷장 이미지 목록 조회",
    description="현재 로그인한 사용자의 모든 옷장 아이템 이미지 목록을 조회합니다. 토큰에서 자동으로 user_id를 추출합니다.",
)
def get_my_wardrobe_images(
    category: Optional[str] = Query(
        None, description="Category filter (e.g. top, bottom)"
    ),
    skip: int = Query(0, ge=0, description="Number of items to skip (pagination)"),
    limit: int = Query(20, ge=1, le=100, description="Max number of items to return"),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all wardrobe images for the current user (from token)."""
    try:
        from .service import wardrobe_manager

        result = wardrobe_manager.get_user_wardrobe_items(
            db=db, user_id=user_id, category=category, skip=skip, limit=limit
        )

        return create_success_response(
            {"items": result["items"]},
            count=result["count"],
            total_count=result["total_count"],
            has_more=result["has_more"],
        )
    except Exception as e:
        raise handle_route_exception(e)


@wardrobe_router.get(
    "/wardrobe/items/{item_id}",
    response_model=WardrobeItemSchema,
    summary="옷장 아이템 상세 조회",
    description="옷장 아이템의 상세 정보를 조회합니다.",
)
def get_wardrobe_item_detail(
    item_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get generic wardrobe item details from DB"""
    try:
        from .service import wardrobe_manager
        from .model import ClosetItem

        item = (
            db.query(ClosetItem)
            .filter(ClosetItem.id == item_id, ClosetItem.user_id == user_id)
            .first()
        )

        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        features = item.features or {}
        if "category" not in features:
            features["category"] = {
                "main": item.category.lower() if item.category else "unknown",
                "sub": item.sub_category.lower() if item.sub_category else "",
                "confidence": 1.0,
            }

        return WardrobeItemSchema(
            id=str(item.id),
            filename=f"item_{item.id}",
            attributes=AttributesSchema(**features),
            image_url=wardrobe_manager.get_signed_url(item.image_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise handle_route_exception(e)


@wardrobe_router.delete(
    "/wardrobe/items/{item_id}",
    summary="옷장 아이템 삭제",
    description="옷장 아이템을 데이터베이스와 저장소에서 삭제합니다.",
)
def delete_wardrobe_item(
    item_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete wardrobe item"""
    try:
        from .service import wardrobe_manager

        success = wardrobe_manager.delete_item(db=db, user_id=user_id, item_id=item_id)
        if not success:
            raise HTTPException(status_code=404, detail="Item not found")

        return {"success": True, "message": "Item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise handle_route_exception(e)


@wardrobe_router.post(
    "/wardrobe/items",
    response_model=WardrobeItemSchema,
    summary="옷장 아이템 수동 생성",
    description="이미지 없이 옷장 아이템을 수동으로 등록합니다. 토큰에서 user_id를 추출합니다.",
)
def create_manual_wardrobe_item(
    payload: WardrobeItemCreate,
    user_id: UUID = Depends(get_current_user_id),
):
    try:
        attributes = payload.attributes.model_dump(exclude_none=True)
        item = add_wardrobe_item(
            user_id=user_id,
            attributes=attributes,
            image_url=payload.image_url,
        )
        return WardrobeItemSchema(
            id=item.id,
            filename=f"item_{item.id}",
            attributes=AttributesSchema(**attributes),
            image_url=item.image_url,
        )
    except Exception as e:
        raise handle_route_exception(e)


@wardrobe_router.get("/wardrobe/items/url", response_model=ExtractionUrlResponse)
def generate_extraction_url():
    return ExtractionUrlResponse(image_url="", item_id="")
