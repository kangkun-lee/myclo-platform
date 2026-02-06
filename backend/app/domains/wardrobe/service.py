import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from supabase import create_client, Client
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.config import Config
from app.utils.validators import validate_file_extension
from .schema import WardrobeResponse, WardrobeItemSchema
from app.core.schemas import AttributesSchema

logger = logging.getLogger(__name__)


class WardrobeManager:
    def __init__(self):
        self.supabase_url = Config.SUPABASE_URL
        self.supabase_key = Config.SUPABASE_SERVICE_KEY or Config.SUPABASE_ANON_KEY
        self.bucket_name = Config.SUPABASE_STORAGE_BUCKET
        self.supabase: Optional[Client] = None

        if self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Client: {e}")

    def get_signed_url(self, image_path: str, expires_in: int = 3600) -> str:
        """Supabase Storage에서 서명된 URL 생성 (실패 시 공용 URL 반환)"""
        if not image_path:
            return ""

        # 이미 절대 경로 URL인 경우 처리
        if image_path.startswith("http"):
            return image_path

        # Supabase 클라이언트가 없는 경우 공용 URL 추측 반환
        if not self.supabase:
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{image_path}"

        try:
            # 버킷명 제거 (있다면)
            path = image_path
            if "/" in path and path.startswith(self.bucket_name):
                path = path.replace(f"{self.bucket_name}/", "", 1)

            # 1. 서명된 URL 시도 (보안성 높음)
            res = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                path, expires_in
            )
            signed_url = res.get("signedURL")
            if signed_url:
                return signed_url

            # 2. 실패 시 공용 URL로 폴백 (가시성 확보 우선)
            logger.warning(
                f"Signed URL generation returned None for {path}, falling back to public URL."
            )
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{path}"

        except Exception as e:
            logger.warning(
                f"Error generating Supabase signed URL for {image_path}: {e}"
            )
            # 에러 발생 시 공용 URL 포맷으로 반환하여 브라우저에서 시도하게 함
            path = (
                image_path.replace(f"{self.bucket_name}/", "", 1)
                if image_path.startswith(self.bucket_name)
                else image_path
            )
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{path}"

    def get_user_wardrobe_items(
        self,
        db: Session,
        user_id: UUID,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Get paginated wardrobe items from DB"""
        from .model import ClosetItem

        try:
            query = db.query(ClosetItem).filter(ClosetItem.user_id == user_id)
            if category:
                cat_upper = category.upper()
                # Handle UI shorthand mapping
                if cat_upper == "OUTER":
                    cat_upper = "OUTERWEAR"
                query = query.filter(ClosetItem.category == cat_upper)

            total_count = query.count()
            if total_count == 0:
                return {"items": [], "count": 0, "total_count": 0, "has_more": False}

            from concurrent.futures import ThreadPoolExecutor

            closet_items = (
                query.order_by(ClosetItem.id.desc()).offset(skip).limit(limit).all()
            )
            has_more = (skip + len(closet_items)) < total_count

            # Prepare simple data list in main thread to avoid SQLAlchemy thread-safety issues
            item_data_list = []
            for item in closet_items:
                features = item.features or {}
                if "category" not in features:
                    features["category"] = {
                        "main": item.category.lower() if item.category else "unknown",
                        "sub": item.sub_category.lower() if item.sub_category else "",
                        "confidence": 1.0,
                    }
                item_data_list.append(
                    {
                        "id": str(item.id),
                        "image_path": item.image_path,
                        "features": features,
                    }
                )

            items: List[WardrobeItemSchema] = []
            for data in item_data_list:
                final_image_url = self.get_signed_url(data["image_path"])
                items.append(
                    WardrobeItemSchema(
                        id=data["id"],
                        filename=f"item_{data['id']}",
                        attributes=AttributesSchema(**data["features"]),
                        image_url=final_image_url,
                    )
                )

            return {
                "items": items,
                "count": len(items),
                "total_count": total_count,
                "has_more": has_more,
            }
        except Exception as e:
            logger.error(f"Error in get_user_wardrobe_items: {e}")
            raise e

    def delete_item(self, db: Session, user_id: UUID, item_id: UUID) -> bool:
        """Delete an item from DB and Storage"""
        from .model import ClosetItem

        try:
            item = (
                db.query(ClosetItem)
                .filter(ClosetItem.id == item_id, ClosetItem.user_id == user_id)
                .first()
            )

            if not item:
                return False

            # 1. Try to delete from Supabase Storage
            if (
                self.supabase
                and item.image_path
                and not item.image_path.startswith("http")
            ):
                try:
                    self.supabase.storage.from_(self.bucket_name).remove(
                        [item.image_path]
                    )
                except Exception as storage_err:
                    logger.warning(f"Failed to delete storage file: {storage_err}")

            # 2. Delete from Database
            db.delete(item)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting item {item_id}: {e}")
            raise e

    def save_item(
        self,
        db: Session,
        image_bytes: bytes,
        original_filename: str,
        attributes: dict,
        user_id: UUID,
    ) -> dict:
        if not self.supabase:
            raise Exception("Supabase Storage not initialized")

        # 1. Save Image to Supabase Storage
        user_uuid_folder = str(user_id)  # Supabase는 폴더 구조가 자유로움
        now = datetime.now()
        date_str = now.strftime("%Y%m%d")
        image_uuid = str(uuid.uuid4())

        ext = (
            validate_file_extension(original_filename) if original_filename else ".jpg"
        )

        # 파일 경로 설정 (Supabase Storage 구조: user_id/date/uuid.ext)
        file_path = f"{user_uuid_folder}/{date_str}/{image_uuid}{ext}"

        content_type = "image/jpeg"
        if ext == ".png":
            content_type = "image/png"
        elif ext == ".gif":
            content_type = "image/gif"
        elif ext == ".webp":
            content_type = "image/webp"

        try:
            # Supabase Storage 업로드
            self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=image_bytes,
                file_options={"content-type": content_type},
            )

            # 공개 URL 또는 경로 저장 (경로로 저장하는 것이 나중에 Signed URL 생성에 유리)
            # 여기서는 나중에 get_signed_url에서 처리하기 위해 상대 경로만 저장하거나 전체 공용 URL 저장 가능
            # 우리는 DB의 image_path에 'bucket/path' 형태로 저장하거나 공용 URL 저장
            image_url = file_path  # 여기서는 관례상 상대 경로 저장
        except Exception as e:
            logger.error(f"Supabase Storage Upload failed: {e}")
            raise Exception(f"Failed to upload image to Supabase: {e}")

        # 2. Save to Database
        from .model import ClosetItem

        category_raw = attributes.get("category", {})
        if isinstance(category_raw, dict):
            category = (category_raw.get("main") or "UNKNOWN").upper()
            sub_category = (
                category_raw.get("sub") or attributes.get("sub_category") or "UNKNOWN"
            ).upper()
        else:
            category = str(category_raw).upper() if category_raw else "UNKNOWN"
            sub_category = (attributes.get("sub_category") or "UNKNOWN").upper()

        features = attributes.copy()

        # Season enrichment
        season = attributes.get("season") or attributes.get("scores", {}).get(
            "season", []
        )
        if isinstance(season, str):
            season = [season.upper()]
        else:
            season = [str(s).upper() for s in season]

        # Mood/Style tags enrichment (Map style_tags from AI to mood_tags in DB)
        mood_tags = attributes.get("style_tags") or attributes.get("mood_tags") or []
        if isinstance(mood_tags, str):
            mood_tags = [mood_tags.upper()]
        else:
            mood_tags = [str(m).upper() for m in mood_tags]

        db_item = ClosetItem(
            user_id=user_id,
            image_path=image_url,
            category=category,
            sub_category=sub_category,
            features=features,
            season=season,
            mood_tags=mood_tags,
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        return {
            "success": "success",
            "image_url": self.get_signed_url(image_url),
            "item_id": db_item.id,
            "blob_name": file_path,
        }

    def save_manual_item(
        self,
        db: Session,
        attributes: dict,
        user_id: UUID,
        image_url: Optional[str] = None,
    ) -> WardrobeItemSchema:
        from .model import ClosetItem

        category_raw = attributes.get("category", {})
        if isinstance(category_raw, dict):
            category = (category_raw.get("main") or "UNKNOWN").upper()
            sub_category = (
                category_raw.get("sub") or attributes.get("sub_category") or "UNKNOWN"
            ).upper()
        else:
            category = str(category_raw).upper() if category_raw else "UNKNOWN"
            sub_category = (attributes.get("sub_category") or "UNKNOWN").upper()

        features = attributes.copy()
        season = attributes.get("season") or attributes.get("scores", {}).get(
            "season", []
        )
        if isinstance(season, str):
            season = [season.upper()]
        else:
            season = [str(s).upper() for s in season]

        db_item = ClosetItem(
            user_id=user_id,
            image_path=image_url or "",
            category=category,
            sub_category=sub_category,
            features=features,
            season=season,
            mood_tags=attributes.get("style_tags") or attributes.get("mood_tags") or [],
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        return WardrobeItemSchema(
            id=str(db_item.id),
            filename=f"item_{db_item.id}",
            attributes=AttributesSchema(**attributes),
            image_url=image_url,
        )


wardrobe_manager = WardrobeManager()
