from sqlalchemy import Column, String, ForeignKey, DateTime, Float, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


class TodaysPick(Base):
    __tablename__ = "todays_picks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Selected Outfit Items
    top_id = Column(UUID(as_uuid=True), ForeignKey("closet_items.id"), nullable=True)
    bottom_id = Column(UUID(as_uuid=True), ForeignKey("closet_items.id"), nullable=True)

    # LLM Recommendation Metadata
    reasoning = Column(Text, nullable=True)  # 추천 이유
    score = Column(Float, nullable=True)  # 추천 점수 (0.0~1.0)
    weather = Column(JSON, nullable=True)  # 날씨 정보 스냅샷
    image_url = Column(String, nullable=True)  # 생성된 코디 이미지 주소

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<TodaysPick(id={self.id}, user_id={self.user_id})>"
