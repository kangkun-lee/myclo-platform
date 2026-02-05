import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.domains.user.router import get_current_user
from app.storage.memory_store import UserRecord
from .service import extractor
from .schema import ExtractionResponse, ExtractionUrlResponse
from app.core.schemas import AttributesSchema
from app.utils.validators import validate_uploaded_file
from app.utils.response_helpers import handle_route_exception
from app.storage.memory_store import add_wardrobe_item
import base64

logger = logging.getLogger(__name__)

extraction_router = APIRouter()


@extraction_router.post(
    "/extract",
    response_model=ExtractionResponse,
    summary="이미지 속성 추출 및 저장 (단일 업로드)",
    description="옷 이미지를 업로드하여 속성을 추출하고 내 옷장에 저장합니다. (로그인 필요)",
)
async def extract(
    image: UploadFile = File(..., description="업로드할 옷 이미지 파일"),
    current_user: UserRecord = Depends(get_current_user),
):
    """
    Extract and save clothing attributes (Single file)

    - **image**: 업로드할 이미지 파일 (필수)
    - **Authorization**: Bearer Token (필수)
    """
    logger.info("=== Extract Request Started ===")
    logger.info(
        f"User authenticated: ID={current_user.id}, Username={current_user.user_name}"
    )
    logger.info(f"Image filename: {image.filename}, content_type: {image.content_type}")

    try:
        # Read contents first for size validation
        contents = await image.read()
        file_size_mb = len(contents) / 1024 / 1024
        logger.info(f"Image file size: {len(contents)} bytes ({file_size_mb:.2f} MB)")

        # File validation (filename, extension, MIME type, size)
        validate_uploaded_file(
            filename=image.filename,
            content_type=image.content_type,
            file_size=len(contents),
        )
        logger.info("File validation passed")

        # Sync extraction call
        logger.info("Starting attribute extraction...")
        attributes = extractor.extract(contents)
        category_main = (
            attributes.get("category", {}).get("main", "N/A")
            if isinstance(attributes.get("category"), dict)
            else "N/A"
        )
        logger.info(f"Attribute extraction completed. Category: {category_main}")
        logger.debug(f"Extracted attributes keys: {list(attributes.keys())}")

        logger.info(f"Saving item in memory for user_id={current_user.id}...")
        encoded = base64.b64encode(contents).decode("utf-8")
        image_url = f"data:{image.content_type};base64,{encoded}"
        record = add_wardrobe_item(
            user_id=current_user.id,
            attributes=attributes,
            image_url=image_url,
        )
        logger.info(f"Item saved successfully. Item ID: {record.id}")

        logger.info("=== Extract Request Completed Successfully ===")
        # Return single object with attributes
        return ExtractionResponse(
            success=True,
            attributes=AttributesSchema(**attributes),
            saved_to=f"memory:{record.id}",
            image_url=image_url,
            item_id=str(record.id),
            blob_name=None,
            storage_type="memory",
        )

    except HTTPException as e:
        logger.error(f"HTTPException raised: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error during extraction: {type(e).__name__}: {str(e)}",
            exc_info=True,
        )
        raise handle_route_exception(e)
