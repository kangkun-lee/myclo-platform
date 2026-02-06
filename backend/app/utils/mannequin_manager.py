import os
import logging
from typing import Optional
from app.core.config import Config

logger = logging.getLogger(__name__)


class MannequinManager:
    def __init__(self):
        # Supabase를 사용하도록 변경
        self.supabase_url = Config.SUPABASE_URL
        self.supabase_key = Config.SUPABASE_SERVICE_KEY or Config.SUPABASE_ANON_KEY
        self.bucket_name = Config.SUPABASE_STORAGE_BUCKET
        self.supabase = None

        if self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client

                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except ImportError:
                logger.error("supabase package not installed")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase for MannequinManager: {e}")

    def get_mannequin_bytes(self, gender: str, body_shape: str) -> Optional[bytes]:
        """
        성별과 체형에 맞는 마네킹 이미지의 바이트 데이터를 반환합니다.
        """
        gender = (gender or "MALE").lower()
        gender_folder = "man" if gender in ["man", "male", "m"] else "woman"

        shape = (body_shape or "average").lower()
        valid_shapes = ["slim", "athletic", "muscular", "average", "stocky"]
        if shape not in valid_shapes:
            shape = "average"

        filename = f"{shape}.png"
        base_path = os.path.dirname(os.path.dirname(__file__))
        local_path = os.path.join(
            base_path, "static", "images", gender_folder, filename
        )

        if not os.path.exists(local_path):
            local_path = os.path.join(
                base_path, "static", "images", gender_folder, "average.png"
            )
            if not os.path.exists(local_path):
                return None

        try:
            # 보조적으로 Supabase에 업로드 시도 (캐싱/공유 목적)
            self.get_mannequin_url(gender, body_shape)

            with open(local_path, "rb") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading mannequin bytes: {e}")
            return None

    def get_mannequin_url(self, gender: str, body_shape: str) -> Optional[str]:
        """
        성별과 체형에 맞는 마네킹 이미지의 Supabase URL을 반환합니다.
        """
        gender = (gender or "MALE").lower()
        gender_folder = "man" if gender in ["man", "male"] else "woman"
        shape = (body_shape or "average").lower()
        valid_shapes = ["slim", "athletic", "muscular", "average", "stocky"]

        if shape not in valid_shapes:
            shape = "average"

        filename = f"{shape}.png"
        base_path = os.path.dirname(os.path.dirname(__file__))
        local_path = os.path.join(
            base_path, "static", "images", gender_folder, filename
        )

        if not os.path.exists(local_path):
            filename = "average.png"
            local_path = os.path.join(
                base_path, "static", "images", gender_folder, filename
            )
            if not os.path.exists(local_path):
                return None

        # Supabase Storage 경로
        file_path = f"static/mannequins/{gender_folder}/{filename}"

        try:
            if not self.supabase:
                return None

            # 존재 여부 확인 로직 (Supabase Storage에서는 list_objects 등으로 확인 가능)
            # 여기서는 간단히 업로드 시도 (이미 있으면 에러가 날 수 있으나 upload options로 핸들링 가능)
            try:
                with open(local_path, "rb") as f:
                    # upsert=True 옵션으로 덮어쓰기 허용
                    self.supabase.storage.from_(self.bucket_name).upload(
                        path=file_path,
                        file=f.read(),
                        file_options={"content-type": "image/png", "x-upsert": "true"},
                    )
            except Exception:
                # 이미 존재할 경우 에러 무시
                pass

            from app.domains.wardrobe.service import wardrobe_manager

            return wardrobe_manager.get_signed_url(file_path)

        except Exception as e:
            logger.error(f"Error handling mannequin supabase storage: {e}")
            return None


mannequin_manager = MannequinManager()
