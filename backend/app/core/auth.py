from typing import Optional
from uuid import UUID
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import Config
from app.core.security import ALGORITHM, SECRET_KEY
from app.database import get_db
from app.domains.user.model import User

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    현재 로그인한 사용자를 검증하고 반환하는 통합 의존성.
    """
    logger.info("--- Auth Check Started ---")

    if not credentials:
        logger.warning("No credentials provided")
        raise HTTPException(
            status_code=401, detail="Authentication credentials missing"
        )

    try:
        token = credentials.credentials
        # 1. JWT Decode
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            logger.debug(f"Token Payload: {payload}")
        except JWTError as e:
            logger.error(f"JWT Decode Failed: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_id_str = payload.get("user_id")
        username = payload.get("sub")

        # 2. Database Lookup
        user = None
        try:
            if user_id_str:
                logger.debug(f"Attempting lookup by UUID: {user_id_str}")
                user = db.query(User).filter(User.id == UUID(user_id_str)).first()

            if not user and username:
                logger.debug(f"Attempting fallback lookup by username: {username}")
                user = db.query(User).filter(User.user_name == username).first()
        except Exception as db_err:
            logger.error(
                f"Database query failed DURING auth: {type(db_err).__name__}: {str(db_err)}"
            )
            # DB 연결 오류 시에는 500이 아닌 401로 보일 수 있으므로 명확히 기록
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error",
            )

        if user is None:
            logger.warning(f"User not found in database for payload: {payload}")
            raise HTTPException(status_code=401, detail="User not found in system")

        logger.info(f"Auth Success: {user.user_name} ({user.id})")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected Auth Error: {type(e).__name__}: {str(e)}", exc_info=True
        )
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def get_current_user_id(current_user: User = Depends(get_current_user)) -> UUID:
    return current_user.id
