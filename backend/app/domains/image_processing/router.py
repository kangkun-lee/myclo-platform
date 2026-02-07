from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import io
import base64
from PIL import Image
from app.core.auth import get_current_user_id
from app.utils.response_helpers import create_success_response, handle_route_exception

# Optional imports with fallbacks
try:
    import numpy as np
except ImportError:
    np = None

try:
    from app.domains.image_processing.service import image_processing_service
except ImportError:
    image_processing_service = None

image_processor_router = APIRouter()


class ImageProcessingRequest(BaseModel):
    image_url: str
    processing_type: str = (
        "background_removal"  # background_removal, silhouette, shadow
    )


class ImageProcessingResponse(BaseModel):
    processed_image_url: str
    processing_type: str
    success: bool


@image_processor_router.post(
    "/api/process-image", response_model=ImageProcessingResponse
)
async def process_image(
    request: ImageProcessingRequest, user_id: str = Depends(get_current_user_id)
):
    """Process clothing image for virtual wardrobe display"""
    try:
        processed_url = await process_clothing_image(
            image_url=request.image_url, processing_type=request.processing_type
        )

        return ImageProcessingResponse(
            processed_image_url=processed_url,
            processing_type=request.processing_type,
            success=True,
        )
    except Exception as e:
        raise handle_route_exception(e)


@image_processor_router.post("/api/remove-background")
async def remove_background(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)
):
    """Remove background from uploaded clothing image"""
    try:
        # Read uploaded file
        contents = await file.read()

        # Process image
        processed_image_url = await remove_background_from_image(contents)

        return create_success_response({"processed_image_url": processed_image_url})
    except Exception as e:
        raise handle_route_exception(e)


async def process_clothing_image(image_url: str, processing_type: str) -> str:
    """Process clothing image based on type"""
    try:
        # Use the dedicated service when available.
        if image_processing_service is not None:
            return await image_processing_service.process_clothing_image(
                image_url=image_url, processing_type=processing_type
            )
        return image_url

    except Exception as e:
        print(f"Image processing error: {e}")
        return image_url


async def remove_background_from_image(image_bytes: bytes) -> str:
    """Remove background from image bytes"""
    try:
        # Open the image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGBA if not already
        if image.mode != "RGBA":
            image = image.convert("RGBA")

        # Simple background removal logic (placeholder)
        # In production, use remove.bg API or similar
        if np is not None:
            img_array = np.array(image)

            # Create mask for light backgrounds
            mask = (
                (img_array[:, :, 0] > 200)
                & (img_array[:, :, 1] > 200)
                & (img_array[:, :, 2] > 200)
            )

            # Apply transparency to masked areas
            img_array[mask, 3] = 0

            # Convert back to PIL Image
            processed_image = Image.fromarray(img_array)
        else:
            # Fallback processing without numpy
            processed_image = image

        # Convert to base64
        buffered = io.BytesIO()
        processed_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"

    except Exception as e:
        print(f"Background removal error: {e}")
        # Fallback to original image as base64
        img_str = base64.b64encode(image_bytes).decode()
        return f"data:image/jpeg;base64,{img_str}"


@image_processor_router.post("/api/generate-silhouette")
async def generate_clothing_silhouette(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)
):
    """Generate clothing silhouette for better hanger display"""
    try:
        contents = await file.read()
        silhouette_url = await create_clothing_silhouette(contents)

        return create_success_response({"silhouette_url": silhouette_url})
    except Exception as e:
        raise handle_route_exception(e)


async def create_clothing_silhouette(image_bytes: bytes) -> str:
    """Create clothing silhouette"""
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to grayscale
        gray_image = image.convert("L")

        # Apply threshold to create silhouette
        img_array = np.array(gray_image)

        # Simple thresholding (in production, use more sophisticated methods)
        threshold = 128
        silhouette = np.where(img_array > threshold, 0, 255)

        # Convert back to image
        silhouette_image = Image.fromarray(silhouette.astype(np.uint8), mode="L")

        # Convert to RGBA for transparency
        rgba_image = Image.new("RGBA", silhouette_image.size, (0, 0, 0, 0))
        rgba_image.paste(silhouette_image, mask=silhouette_image)

        # Convert to base64
        buffered = io.BytesIO()
        rgba_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return f"data:image/png;base64,{img_str}"

    except Exception as e:
        print(f"Silhouette generation error: {e}")
        # Fallback
        img_str = base64.b64encode(image_bytes).decode()
        return f"data:image/jpeg;base64,{img_str}"
