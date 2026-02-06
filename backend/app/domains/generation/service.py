import logging
from typing import Optional
from uuid import UUID

from app.domains.generation.schema import (
    OutfitGenerationRequest,
    OutfitGenerationResponse,
)
from app.ai.clients.nano_banana_client import NanoBananaClient
from app.domains.wardrobe.service import wardrobe_manager

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self):
        self.client = NanoBananaClient()

    async def create_outfit_image(
        self, request: OutfitGenerationRequest, user_id: UUID
    ) -> Optional[str]:
        """
        Generates a composite image of the outfit using Nano Banana (Imagen).
        Uploads the result to Supabase Storage and returns a signed URL.
        """
        try:
            # 1. Prepare descriptions
            top_desc = (
                request.top.attributes.category.sub
                if request.top.attributes.category
                else "top"
            )
            if request.top.attributes.color and request.top.attributes.color.primary:
                top_desc = f"{request.top.attributes.color.primary} {top_desc}"

            bottom_desc = (
                request.bottom.attributes.category.sub
                if request.bottom.attributes.category
                else "bottom"
            )
            if (
                request.bottom.attributes.color
                and request.bottom.attributes.color.primary
            ):
                bottom_desc = f"{request.bottom.attributes.color.primary} {bottom_desc}"

            # 2. Download actual clothing images as references
            import httpx
            import asyncio

            top_image_bytes = None
            bottom_image_bytes = None
            face_image_bytes = None

            async with httpx.AsyncClient(timeout=30.0) as client:
                tasks = []
                # Store (type, url) tuples to map results back
                request_items = []

                if request.top.image_url:
                    tasks.append(client.get(request.top.image_url))
                    request_items.append(("top", request.top.image_url))

                if request.bottom.image_url:
                    tasks.append(client.get(request.bottom.image_url))
                    request_items.append(("bottom", request.bottom.image_url))

                if request.face_image_url:
                    tasks.append(client.get(request.face_image_url))
                    request_items.append(("face", request.face_image_url))

                if tasks:
                    logger.info(f"Downloading {len(tasks)} images in parallel...")
                    results = await asyncio.gather(*tasks, return_exceptions=True)

                    for idx, (item_type, url) in enumerate(request_items):
                        result = results[idx]
                        if isinstance(result, Exception):
                            logger.warning(
                                f"Failed to download {item_type} image: {result}"
                            )
                        elif result.status_code == 200:
                            if item_type == "top":
                                top_image_bytes = result.content
                            elif item_type == "bottom":
                                bottom_image_bytes = result.content
                            elif item_type == "face":
                                face_image_bytes = result.content
                            logger.info(
                                f"✅ Downloaded {item_type} image ({len(result.content)} bytes)"
                            )
                        else:
                            logger.warning(
                                f"Failed to download {item_type} image: HTTP {result.status_code}"
                            )

            # 3. Get Mannequin Image (If applicable, future feature)
            mannequin_bytes = None

            # 4. Call NanoBanana Client with actual clothing images
            logger.info(
                "Calling Nano Banana for outfit generation with reference images..."
            )

            image_url = self.client.generate_mannequin_composite(
                top_description=top_desc,
                bottom_description=bottom_desc,
                gender=request.gender,
                user_id=str(user_id),
                mannequin_bytes=mannequin_bytes,
                top_image_bytes=top_image_bytes,
                bottom_image_bytes=bottom_image_bytes,
                height=request.height,
                weight=request.weight,
                body_shape=request.body_shape,
                face_image_bytes=face_image_bytes,
            )

            if not image_url:
                logger.warning("Nano Banana returned no image URL.")
                return None

            return image_url

        except Exception as e:
            logger.error(f"Failed to create outfit image: {e}")
            return None


generation_service = GenerationService()
