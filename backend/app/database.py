from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import Config


# Database URL 설정 (.env 의 DATABASE_URL 또는 기본값 사용)
DATABASE_URL = getattr(
    Config, "DATABASE_URL", None
) or "postgresql://user:password@localhost:5432/myclo"


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의 의존성 주입에서 사용할 DB 세션 생성기.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

