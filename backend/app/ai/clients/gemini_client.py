import logging
from typing import List, Optional

from google import genai
from google.genai import types

from app.core.config import Config

logger = logging.getLogger(__name__)


class GeminiClient:
    """Gemini API client wrapper."""

    def __init__(self):
        Config.check_api_key()
        self.client = genai.Client(api_key=Config.GEMINI_API_KEY)
        self.model_name = Config.GEMINI_MODEL
        self.vision_model = Config.GEMINI_VISION_MODEL

    def generate_content(
        self,
        prompt: str,
        images: Optional[List[bytes]] = None,
        image_bytes: Optional[bytes] = None,
        **kwargs,
    ) -> str:
        try:
            parts: List[types.Part | str] = []
            if image_bytes:
                images = images or []
                images.append(image_bytes)

            if images:
                for img in images:
                    parts.append(types.Part.from_bytes(data=img, mime_type="image/jpeg"))

            parts.append(prompt)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=parts,
                **kwargs,
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini API error: {e}", exc_info=True)
            raise

    def generate_with_vision(self, prompt: str, image_bytes: bytes, **kwargs) -> str:
        return self.generate_content(prompt, image_bytes=image_bytes, **kwargs)


gemini_client = GeminiClient()
