import logging
import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict

from supabase import create_client, Client
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.core.config import Config
from app.domains.user.model import User
from app.domains.user.schema import UserUpdate, UserResponse
from app.utils.validators import validate_file_extension

logger = logging.getLogger(__name__)


class UserManager:
    def __init__(self):
        self.supabase_url = Config.SUPABASE_URL
        self.supabase_key = Config.SUPABASE_SERVICE_KEY or Config.SUPABASE_ANON_KEY
        self.bucket_name = "wardrobe-images"  # Use existing bucket
        self.supabase: Optional[Client] = None

        if self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Client: {e}")

    def get_signed_url(self, image_path: str, expires_in: int = 3600) -> str:
        """Supabase Storage에서 서명된 URL 생성"""
        if not image_path:
            return ""

        if image_path.startswith("http"):
            return image_path

        if not self.supabase:
            return ""

        try:
            # 버킷명 제거 (있다면)
            path = image_path
            if "/" in path and path.startswith(self.bucket_name):
                path = path.replace(f"{self.bucket_name}/", "", 1)

            res = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                path, expires_in
            )
            return res.get("signedURL", "")
        except Exception as e:
            logger.warning(
                f"Error generating Supabase signed URL for {image_path}: {e}"
            )
            return ""

    async def upload_face_image(
        self, db: Session, user_id: UUID, file: UploadFile
    ) -> str:
        """Upload face image to Supabase and update DB"""
        if not self.supabase:
            raise Exception("Supabase Storage not initialized")

        # Read file content
        image_bytes = await file.read()

        # Generate path
        original_filename = file.filename or "face.jpg"
        ext = validate_file_extension(original_filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        image_uuid = str(uuid.uuid4())
        file_path = f"{str(user_id)}/face/{timestamp}_{image_uuid}{ext}"

        # Content Type
        content_type = file.content_type or "image/jpeg"

        try:
            # Upload to Supabase
            self.supabase.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=image_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )

            # Update DB
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # Delete old image if exists (Implementation skipped for brevity)
                user.face_image_path = file_path
                db.commit()
                db.refresh(user)
                return file_path
            else:
                raise Exception("User not found")

        except Exception as e:
            logger.error(f"Failed to upload face image: {e}")
            db.rollback()
            raise e

    def get_user_profile(self, db: Session, user_id: UUID) -> Optional[UserResponse]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        response_data = UserResponse.model_validate(user)
        if user.face_image_path:
            response_data.face_image_url = self.get_signed_url(user.face_image_path)

        return response_data

    def update_profile(
        self, db: Session, user_id: UUID, update_data: UserUpdate
    ) -> UserResponse:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise Exception("User not found")

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(user, key, value)

        db.commit()
        db.refresh(user)

        return self.get_user_profile(db, user_id)  # Return with URL


user_manager = UserManager()
