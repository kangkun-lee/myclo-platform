import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.auth import get_current_user
from app.domains.user.model import User
from .service import extractor
from .schema import ExtractionResponse, ExtractionUrlResponse, MultiExtractionResponse
from app.core.schemas import AttributesSchema
from app.utils.validators import validate_uploaded_file
from app.utils.response_helpers import handle_route_exception
from app.domains.image_processing.service import image_processing_service

logger = logging.getLogger(__name__)

extraction_router = APIRouter()


from sqlalchemy.orm import Session
from app.database import get_db


@extraction_router.post(
    "/extract",
    response_model=MultiExtractionResponse,
    summary="이미지 속성 추출 및 저장 (멀티/배치 처리)",
    description="각기 다른 옷 이미지들을 업로드하여 각각 속성을 추출하고 내 옷장에 저장합니다. (로그인 필요)",
)
async def extract(
    images: list[UploadFile] = File(..., description="업로드할 옷 이미지 파일들"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Extract and save clothing attributes for each image individually.
    """
    logger.info("=== Batch Extract Request Started ===")
    logger.info(f"User authenticated: ID={current_user.id}")
    logger.info(f"Received {len(images)} images for batch extraction.")

    results: list[ExtractionResponse] = []

    try:
        from app.domains.wardrobe.service import wardrobe_manager

        for idx, img in enumerate(images):
            try:
                contents = await img.read()
                size = len(contents)
                logger.info(
                    f"Processing image {idx+1}/{len(images)}: {img.filename} ({size} bytes)"
                )

                # File validation
                validate_uploaded_file(
                    filename=img.filename,
                    content_type=img.content_type,
                    file_size=size,
                )

                # Individual extraction for this specific image
                logger.info(f"Starting attribute extraction for image {idx+1}...")
                attributes = extractor.extract(
                    [contents]
                )  # Pass as list of 1 for multi-image logic compatibility

                # Remove background immediately after upload and before storage.
                logger.info(f"Running background removal for image {idx+1}...")
                processed_contents = await image_processing_service.remove_background_bytes(
                    contents
                )
                processed_filename = f"{(img.filename or 'item').rsplit('.', 1)[0]}.png"

                # Save as individual item
                logger.info(f"Saving item {idx+1} to database...")
                record = wardrobe_manager.save_item(
                    db=db,
                    image_bytes=processed_contents,
                    original_filename=processed_filename,
                    attributes=attributes,
                    user_id=current_user.id,
                )

                item_id = str(record["item_id"])
                image_url = record["image_url"]
                blob_name = record["blob_name"]

                results.append(
                    ExtractionResponse(
                        success=True,
                        attributes=AttributesSchema(**attributes),
                        saved_to=f"supabase:{item_id}",
                        image_url=image_url,
                        item_id=item_id,
                        blob_name=blob_name,
                        storage_type="supabase",
                    )
                )
                logger.info(f"Item {idx+1} processed successfully. Item ID: {item_id}")

            except Exception as item_err:
                logger.error(
                    f"Failed to process image {idx+1} ({img.filename}): {item_err}"
                )
                # We could continue with other items or fail the whole request.
                # Here we continue but mark it as failure (though pydantic might complain if success=False isn't handled)
                # For now, let's let individual failures raise exception to keep it simple,
                # or just skip. Let's raise for now to be safe.
                raise

        logger.info(f"=== Batch Extract Completed: {len(results)} items processed ===")
        return MultiExtractionResponse(
            success=True, items=results, total_processed=len(results)
        )

    except HTTPException as e:
        logger.error(f"HTTPException: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error during extraction: {type(e).__name__}: {str(e)}",
            exc_info=True,
        )
        raise handle_route_exception(e)
