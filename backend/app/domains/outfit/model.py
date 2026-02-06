import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    ForeignKey,
    Table,
    Boolean,
    Text,
    text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from app.database import Base


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    log_id = Column(
        PG_UUID(as_uuid=True), ForeignKey("outfit_logs.id"), primary_key=True
    )
    item_id = Column(
        PG_UUID(as_uuid=True), ForeignKey("closet_items.id"), primary_key=True
    )

    # Relationships
    log = relationship("OutfitLog", back_populates="outfit_items")
    item = relationship("ClosetItem", back_populates="outfit_associations")


class OutfitLog(Base):
    __tablename__ = "outfit_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    worn_date = Column(Date, nullable=False)
    purpose = Column(String, nullable=True)  # 결혼식, 면접...
    location = Column(String, nullable=True)

    # PostgreSQL JSONB
    weather_snapshot = Column(JSONB, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="outfit_logs")
    outfit_items = relationship("OutfitItem", back_populates="log")
    items = relationship("ClosetItem", secondary="outfit_items", viewonly=True)
