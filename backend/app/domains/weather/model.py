from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    UniqueConstraint,
    BigInteger,
)
from sqlalchemy.sql import func
from app.database import Base


class DailyWeather(Base):
    __tablename__ = "daily_weathers"

    id = Column(BigInteger, primary_key=True, index=True)
    base_date = Column(String, nullable=False)
    base_time = Column(String, nullable=False)
    nx = Column(Integer, nullable=False)
    ny = Column(Integer, nullable=False)
    region = Column(String, nullable=True)

    min_temp = Column(Float)
    max_temp = Column(Float)
    rain_type = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("base_date", "nx", "ny", name="uix_daily_weather_date_loc"),
    )

    @property
    def date_id(self):
        return self.base_date
