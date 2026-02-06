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
        logger.info(
            f"GeminiClient initialized. (Key exists: {bool(Config.GEMINI_API_KEY)})"
        )

    def generate_content(
        self,
        prompt: str,
        images: Optional[List[bytes]] = None,
        image_bytes: Optional[bytes] = None,
        model_override: Optional[str] = None,
        **kwargs,
    ) -> str:
        try:
            parts: List[types.Part | str] = []
            if image_bytes:
                parts.append(
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
                )

            if images:
                for img in images:
                    parts.append(
                        types.Part.from_bytes(data=img, mime_type="image/jpeg")
                    )

            parts.append(prompt)

            target_model = model_override or self.model_name

            # 안전 설정 해제 및 설정 강화
            response = self.client.models.generate_content(
                model=target_model,
                contents=parts,
                config=types.GenerateContentConfig(
                    temperature=kwargs.get("temperature", 0.4),
                    max_output_tokens=kwargs.get("max_output_tokens", 2048),
                    # 옷 분석을 방해할 수 있는 안전 필터 최소화
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_HARASSMENT",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_HATE_SPEECH",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold="BLOCK_NONE",
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold="BLOCK_NONE",
                        ),
                    ],
                ),
            )

            # 응답 텍스트 추출 시도
            try:
                if response.text:
                    return response.text

                # 텍스트가 없으면 차단 사유 확인
                if response.candidates and response.candidates[0].finish_reason:
                    reason = response.candidates[0].finish_reason
                    logger.warning(f"Gemini Finish Reason: {reason}")

                return ""
            except ValueError:
                # 안전 필터 등에 의해 text 속성 접근 차단 시 발생
                logger.error(
                    "Gemini context was blocked by safety filters or empty response."
                )
                return ""

        except Exception as e:
            logger.error(f"Gemini API Error: {type(e).__name__}: {str(e)}")
            raise

    def generate_with_vision(self, prompt: str, image_bytes: bytes, **kwargs) -> str:
        """비전 전용 모델을 사용하여 요청을 보냅니다."""
        return self.generate_content(
            prompt, image_bytes=image_bytes, model_override=self.vision_model, **kwargs
        )


gemini_client = GeminiClient()
