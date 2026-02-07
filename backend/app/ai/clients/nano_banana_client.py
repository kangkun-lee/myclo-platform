import logging
import uuid
from typing import Optional, List, Tuple

from google import genai
from google.genai import types

from app.core.config import Config

logger = logging.getLogger(__name__)


class NanoBananaClient:
    """
    Google GenAI (Nano Banana) Wrapper Client using AI Studio API Key.
    """

    def __init__(self):
        self.api_key = Config.GEMINI_API_KEY
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Nano Banana will be disabled.")
            self.client = None
            return

        try:
            self.client = genai.Client(api_key=self.api_key)

            # ??Nano Banana 紐⑤뜽 ?좏깮
            self.model_name = (
                "gemini-2.5-flash-image"  # ??鍮좊쫫 (image_config ?놁씠 ?ъ슜)
            )
            # self.model_name = "gemini-3-pro-image-preview"  # 怨좏뭹吏?(?먮┝, image_config 吏??

            logger.info(f"Nano Banana initialized. Model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Nano Banana Client: {e}")
            self.client = None

    def _guess_mime(self, b: bytes) -> str:
        # ?꾩＜ ?ы봽???먮퀎 (?꾩슂?섎㈃ ??蹂닿컯 媛??
        if b.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if b.startswith(b"\xff\xd8"):
            return "image/jpeg"
        if b.startswith(b"RIFF") and b[8:12] == b"WEBP":
            return "image/webp"
        return "application/octet-stream"

    def _extract_first_image(self, response) -> Optional[Tuple[bytes, str]]:
        """
        Gemini generate_content ?묐떟?먯꽌 泥??대?吏(inline_data)瑜?李얠븘 (bytes, mime_type) 諛섑솚
        """
        if not response or not getattr(response, "candidates", None):
            return None

        for cand in response.candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content else None
            if not parts:
                continue

            for part in parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    mime = (
                        getattr(inline, "mime_type", None) or "application/octet-stream"
                    )
                    return inline.data, mime

        return None

    def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        base_image_bytes: Optional[bytes] = None,
        style_reference_bytes: Optional[bytes] = None,
        few_shot_images: Optional[List[bytes]] = None,
        image_size: str = "1K",  # AI Studio ?덉젣 ?ㅽ???
        aspect_ratio: str = "1:1",
    ) -> Optional[Tuple[bytes, str]]:
        """
        Returns: (image_bytes, mime_type) or None
        """
        if not self.client:
            logger.error("Nano Banana Client not initialized (missing API key?)")
            return None

        try:
            parts: List[types.Part] = []

            # ??李몄“ ?대?吏???몄쭛/?ㅽ???few-shot) ?ｊ린: AI Studio ?덉젣? ?숈씪???⑦꽩
            ref_images = []
            if base_image_bytes:
                ref_images.append(base_image_bytes)
            if style_reference_bytes:
                ref_images.append(style_reference_bytes)
            if few_shot_images:
                ref_images.extend(few_shot_images)

            for img in ref_images:
                parts.append(
                    types.Part.from_bytes(
                        mime_type=self._guess_mime(img),
                        data=img,
                    )
                )

            # ??negative_prompt??Gemini ImageConfig????긽 ?덈뒗 ?꾨뱶媛 ?꾨땲??
            #    ?꾨＼?꾪듃???쒗룷?⑦븯吏 留?寃꺿앹쑝濡??뱀씠??寃??덉쟾??
            if negative_prompt:
                prompt = f"{prompt}\n\nDo NOT include: {negative_prompt}"

            parts.append(types.Part.from_text(text=prompt))

            contents = [types.Content(role="user", parts=parts)]

            config = types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    image_size=image_size,
                    aspect_ratio=aspect_ratio,
                ),
            )

            logger.info(
                f"Generating image with model {self.model_name} (generate_content)..."
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )

            extracted = self._extract_first_image(response)
            if not extracted:
                logger.warning("No image returned in response.")
                return None

            return extracted  # (bytes, mime)

        except Exception as e:
            logger.error(f"Error during image generation: {e}")
            return None

    def generate_mannequin_composite(
        self,
        top_description: Optional[str] = None,
        bottom_description: Optional[str] = None,
        gender: Optional[str] = None,
        body_shape: Optional[str] = None,
        mannequin_bytes: Optional[bytes] = None,
        user_id: Optional[str] = None,
        top_image_bytes: Optional[bytes] = None,
        bottom_image_bytes: Optional[bytes] = None,
        height: Optional[float] = None,
        weight: Optional[float] = None,
        face_image_bytes: Optional[bytes] = None,
    ) -> Optional[str]:
        if not self.client:
            return None

        try:
            outfit_desc = ""
            if top_description:
                outfit_desc += f"a {top_description} on top, "
            if bottom_description:
                outfit_desc += f"and a {bottom_description} on bottom"
            if not outfit_desc:
                outfit_desc = "a complete coordinated outfit"

            m_gender = (
                "man" if (gender or "").lower() in ["man", "male", "m"] else "woman"
            )
            m_shape = (body_shape or "average").lower()

            # ??AI Studio ?⑦꽩: ?대?吏?ㅼ쓣 癒쇱? Parts??異붽?
            parts: List[types.Part] = []

            # 1. ?ㅼ젣 ???대?吏?ㅼ쓣 癒쇱? 異붽? (媛??以묒슂??李몄“)
            image_count = 0
            if top_image_bytes:
                parts.append(
                    types.Part.from_bytes(
                        mime_type=self._guess_mime(top_image_bytes),
                        data=top_image_bytes,
                    )
                )
                image_count += 1
                logger.info("Added top clothing image as reference")

            if bottom_image_bytes:
                parts.append(
                    types.Part.from_bytes(
                        mime_type=self._guess_mime(bottom_image_bytes),
                        data=bottom_image_bytes,
                    )
                )
                image_count += 1
                logger.info("Added bottom clothing image as reference")

            # 2. 留덈꽕???대?吏 (?좏깮?ы빆)
            if mannequin_bytes:
                parts.append(
                    types.Part.from_bytes(
                        mime_type=self._guess_mime(mannequin_bytes),
                        data=mannequin_bytes,
                    )
                )
                image_count += 1
                logger.info("Added mannequin image as reference")

            # 2.5 ?좎? ?쇨뎬 ?대?吏 (?좏깮?ы빆)
            if face_image_bytes:
                parts.append(
                    types.Part.from_bytes(
                        mime_type=self._guess_mime(face_image_bytes),
                        data=face_image_bytes,
                    )
                )
                image_count += 1
                logger.info("Added user face image as reference")

            # 3. ?꾨＼?꾪듃??留덉?留됱뿉 異붽? (AI Studio ?⑦꽩)
            if image_count > 0:
                # ?ъ슜?먯쓽 ?좎껜 ?뺣낫媛 ?덉쑝硫?諛섏쁺
                body_desc = f"{m_gender} model"
                if height and weight:
                    body_desc += f", {height}cm tall, {weight}kg weight"
                if body_shape:
                    body_desc += f", {body_shape} body type"
                modesty_instruction = (
                    "STRICT MODESTY REQUIREMENT: Never show bare torso, chest, nipples, abdomen, or back skin. "
                    "The upper body must always be fully covered by clothing. "
                    "If the top garment is open-front (shirt/cardigan/jacket), add a plain inner layer "
                    "(crew-neck t-shirt or tank) underneath so no torso skin is visible. "
                    "You may show face, neck, hands, and feet only."
                )

                face_instruction = (
                    "Head and face should be visible (generic model face)."
                )
                if face_image_bytes:
                    face_instruction = (
                        "Replace the model's face with the face from the provided reference image. "
                        "CRITICAL: The skin tone of the neck, body, hands, and feet must EXACTLY MATCH the skin tone of the provided face. "
                        "Seamlessly blend the jawline and neck. No visible seam or color difference. "
                        "Apply consistent lighting and skin texture to the entire body based on the face."
                    )

                # ?ㅼ젣 ?대?吏媛 ?덉쓣 ?? ?ъ슜??留욎땄??紐⑤뜽 ?꾩떊 ??
                prompt = (
                    f"Fashion photo, vertical portrait format (3:4 ratio). "
                    f"Full body shot of a realistic {body_desc} wearing the provided clothing items. "
                    f"The model should be standing in a natural pose against a clean white studio background. "
                    f"The model should be barefoot (no shoes, no socks). "
                    f"{modesty_instruction} "
                    f"{face_instruction} "
                    f"Match exact colors and patterns from reference images."
                )
            else:
                # ?대?吏媛 ?놁쓣 ?? ?띿뒪???ㅻ챸 湲곕컲 紐⑤뜽
                body_desc = f"{m_gender} model"
                if height and weight:
                    body_desc += f", {height}cm tall, {weight}kg weight"
                modesty_instruction = (
                    "STRICT MODESTY REQUIREMENT: Never show bare torso, chest, nipples, abdomen, or back skin. "
                    "The upper body must always be fully covered by clothing. "
                    "If the top garment is open-front, automatically include a plain inner layer underneath. "
                    "Face, neck, hands, and feet may be visible."
                )

                prompt = (
                    f"Fashion photo, vertical portrait format (3:4 ratio). "
                    f"Full body shot of a realistic {body_desc} wearing {outfit_desc}. "
                    f"Clean white studio background. Generic model face. "
                    f"{modesty_instruction}"
                )

            parts.append(types.Part.from_text(text=prompt))

            # 4. Content ?앹꽦 (AI Studio ?⑦꽩)
            contents = [types.Content(role="user", parts=parts)]

            # 5. Config ?ㅼ젙
            # gemini-2.5-flash-image??image_config瑜?吏?먰븯吏 ?딆쓬!
            config = types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )

            logger.info(
                f"Generating outfit composite with {image_count} reference images..."
            )

            # 6. ?앹꽦 ?붿껌
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )

            # 7. ?대?吏 異붿텧
            extracted = self._extract_first_image(response)
            if not extracted:
                logger.error("Failed to generate image bytes.")
                return None

            image_bytes, mime_type = extracted

            from app.domains.wardrobe.service import wardrobe_manager
            from datetime import datetime

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_user_id = str(user_id) if user_id else f"anon-{uuid.uuid4().hex[:8]}"

            ext = ".png"
            if mime_type == "image/jpeg":
                ext = ".jpg"
            elif mime_type == "image/webp":
                ext = ".webp"

            file_path = f"todays-picks/{safe_user_id}_{timestamp}{ext}"

            if not wardrobe_manager.supabase:
                logger.error("Supabase client not available for upload")
                return None

            try:
                logger.info(
                    f"Uploading generated image to Supabase: {file_path} ({mime_type}), size: {len(image_bytes)} bytes"
                )

                upload_response = wardrobe_manager.supabase.storage.from_(
                    wardrobe_manager.bucket_name
                ).upload(
                    path=file_path,
                    file=image_bytes,
                    file_options={"content-type": mime_type},
                )

                logger.info(f"Upload response: {upload_response}")

                return file_path

            except Exception as upload_error:
                logger.error(f"Supabase upload failed: {upload_error}")
                logger.error(f"File path: {file_path}, Size: {len(image_bytes)} bytes")
                return None

        except Exception as e:
            logger.error(f"Error generating mannequin composite: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return None

