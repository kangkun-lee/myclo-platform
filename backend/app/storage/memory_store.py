from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, TypedDict
from uuid import UUID, uuid4


@dataclass
class UserRecord:
    id: UUID
    user_name: str
    password: str
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    gender: Optional[str] = None
    body_shape: Optional[str] = None


@dataclass
class WardrobeItemRecord:
    id: str
    user_id: UUID
    attributes: dict[str, Any]
    image_url: Optional[str] = None


@dataclass
class TodaysPickRecord:
    id: str
    user_id: UUID
    top_id: str
    bottom_id: str
    reasoning: str
    score: float
    weather: dict[str, Any]
    image_url: Optional[str] = None


class WardrobeListResponse(TypedDict):
    items: list[WardrobeItemRecord]
    count: int
    total_count: int
    has_more: bool


_users_by_name: dict[str, UserRecord] = {}
_users_by_id: dict[UUID, UserRecord] = {}
_wardrobe_items: dict[UUID, list[WardrobeItemRecord]] = {}
_todays_pick: dict[UUID, TodaysPickRecord] = {}


def create_user(
    username: str,
    password_hash: str,
    age: Optional[int] = None,
    height: Optional[float] = None,
    weight: Optional[float] = None,
    gender: Optional[str] = None,
    body_shape: Optional[str] = None,
) -> UserRecord:
    user_id = uuid4()
    user = UserRecord(
        id=user_id,
        user_name=username,
        password=password_hash,
        age=age,
        height=height,
        weight=weight,
        gender=gender,
        body_shape=body_shape,
    )
    _users_by_name[username] = user
    _users_by_id[user_id] = user
    return user


def get_user_by_username(username: str) -> Optional[UserRecord]:
    return _users_by_name.get(username)


def get_user_by_id(user_id: UUID) -> Optional[UserRecord]:
    return _users_by_id.get(user_id)


def update_user_profile(
    user_id: UUID,
    height: Optional[float] = None,
    weight: Optional[float] = None,
    gender: Optional[str] = None,
    body_shape: Optional[str] = None,
) -> Optional[UserRecord]:
    user = _users_by_id.get(user_id)
    if not user:
        return None

    if height is not None:
        user.height = height
    if weight is not None:
        user.weight = weight
    if gender is not None:
        user.gender = gender
    if body_shape is not None:
        user.body_shape = body_shape
    return user


def add_wardrobe_item(
    user_id: UUID, attributes: dict[str, Any], image_url: Optional[str] = None
) -> WardrobeItemRecord:
    item_id = str(uuid4())
    record = WardrobeItemRecord(
        id=item_id, user_id=user_id, attributes=attributes, image_url=image_url
    )
    _wardrobe_items.setdefault(user_id, []).append(record)
    return record


def list_wardrobe_items(
    user_id: UUID,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> WardrobeListResponse:
    items = _wardrobe_items.get(user_id, [])
    if category:
        filtered = []
        for item in items:
            cat = (
                item.attributes.get("category", {}) or {}
                if isinstance(item.attributes, dict)
                else {}
            )
            main = cat.get("main") if isinstance(cat, dict) else None
            if main and main.lower() == category.lower():
                filtered.append(item)
        items = filtered

    total_count = len(items)
    sliced = items[skip : skip + limit]
    has_more = skip + limit < total_count
    return {
        "items": sliced,
        "count": len(sliced),
        "total_count": total_count,
        "has_more": has_more,
    }


def get_wardrobe_item(user_id: UUID, item_id: str) -> Optional[WardrobeItemRecord]:
    for item in _wardrobe_items.get(user_id, []):
        if item.id == item_id:
            return item
    return None


def list_all_items() -> List[WardrobeItemRecord]:
    all_items: list[WardrobeItemRecord] = []
    for items in _wardrobe_items.values():
        all_items.extend(items)
    return all_items


def set_todays_pick(
    user_id: UUID,
    top_id: str,
    bottom_id: str,
    reasoning: str,
    score: float,
    weather: dict[str, Any],
    image_url: Optional[str] = None,
) -> TodaysPickRecord:
    record = TodaysPickRecord(
        id=str(uuid4()),
        user_id=user_id,
        top_id=top_id,
        bottom_id=bottom_id,
        reasoning=reasoning,
        score=score,
        weather=weather,
        image_url=image_url,
    )
    _todays_pick[user_id] = record
    return record


def get_todays_pick(user_id: UUID) -> Optional[TodaysPickRecord]:
    return _todays_pick.get(user_id)
