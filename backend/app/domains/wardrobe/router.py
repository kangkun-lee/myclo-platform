from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.schemas import AttributesSchema
from app.core.security import ALGORITHM, SECRET_KEY
from app.domains.extraction.schema import ExtractionUrlResponse
from app.storage.memory_store import (
    add_wardrobe_item,
    get_wardrobe_item,
    list_all_items,
    list_wardrobe_items,
)
from app.utils.response_helpers import create_success_response, handle_route_exception

from .schema import WardrobeItemCreate, WardrobeItemSchema, WardrobeResponse

wardrobe_router = APIRouter()
security = HTTPBearer()


def get_user_id_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UUID:
    """JWT 토큰에서 user_id를 추출하는 헬퍼 함수"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("user_id")
        if user_id_str is None:
            raise credentials_exception
        return UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception


@wardrobe_router.get("/wardrobe/items", response_model=WardrobeResponse)
def get_wardrobe_items(category: Optional[str] = Query(None)):
    """Get all wardrobe items"""
    try:
        items = list_all_items()
        if category:
            filtered = []
            for item in items:
                cat = item.attributes.get("category", {}) if isinstance(item.attributes, dict) else {}
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
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get all wardrobe images for the current user (from token)."""
    try:
        result = list_wardrobe_items(
            user_id=user_id, category=category, skip=skip, limit=limit
        )
        items_list = result.get("items") if isinstance(result, dict) else []
        items_list = items_list if isinstance(items_list, list) else []
        response_items = [
            WardrobeItemSchema(
                id=item.id,
                filename=f"item_{item.id}",
                attributes=AttributesSchema(**(item.attributes or {})),
                image_url=item.image_url,
            )
            for item in items_list
        ]
        return create_success_response(
            {"items": response_items},
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
    item_id: str,
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get generic wardrobe item details"""
    try:
        item = get_wardrobe_item(user_id, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return WardrobeItemSchema(
            id=item.id,
            filename=f"item_{item.id}",
            attributes=AttributesSchema(**(item.attributes or {})),
            image_url=item.image_url,
        )
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
    user_id: UUID = Depends(get_user_id_from_token),
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
