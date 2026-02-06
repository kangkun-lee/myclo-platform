from typing import Optional
from pydantic import BaseModel, Field
from app.core.schemas import AttributesSchema


class ExtractionResponse(BaseModel):
    success: bool
    attributes: AttributesSchema
    saved_to: str
    image_url: str
    item_id: str
    blob_name: Optional[str] = Field(None)
    storage_type: Optional[str] = Field(None)


class MultiExtractionResponse(BaseModel):
    success: bool
    items: list[ExtractionResponse]
    total_processed: int


class ExtractionUrlResponse(BaseModel):
    image_url: str
    item_id: str
