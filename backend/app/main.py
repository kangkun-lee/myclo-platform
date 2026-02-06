import os
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Config
from app.core.health import health_router
from app.domains.extraction.router import extraction_router
from app.domains.wardrobe.router import wardrobe_router
from app.domains.recommendation.router import recommendation_router

# from app.domains.generation.router import generation_router  # Temporarily disabled
from app.domains.weather.router import router as weather_router
from app.domains.user.model import User
from app.domains.wardrobe.model import ClosetItem
from app.domains.outfit.model import OutfitLog, OutfitItem
from app.domains.recommendation.model import TodaysPick
from app.domains.weather.model import DailyWeather
from app.domains.chat.model import ChatSession


# 로깅 설정
# 로깅 설정
import sys

# 일반 Python 환경 로깅 설정
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
    force=True,  # 기존 핸들러가 있으면 덮어쓰기
)

# SQLAlchemy 로그 레벨 조정 (너무 많은 로그 방지)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("fastapi").setLevel(logging.INFO)


# 애플리케이션 로거는 DEBUG 레벨 유지
logging.getLogger("app").setLevel(logging.DEBUG)

from app.domains.auth.router import router as auth_router


from contextlib import asynccontextmanager
from sqlalchemy import create_engine, text


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger = logging.getLogger("app.startup")
    logger.info("Starting up application...")

    # 1. Run Migrations (Add face_image_path)
    try:
        from app.core.config import Config

        # Create a transient engine for migration check
        engine = create_engine(Config.DATABASE_URL)
        with engine.connect() as conn:
            # Check if column exists
            check_sql = text(
                """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='face_image_path';
            """
            )
            result = conn.execute(check_sql).fetchone()

            if not result:
                logger.info("Migrating: Adding face_image_path to users table")
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN face_image_path VARCHAR;")
                )
                conn.commit()
                logger.info("Migration successful.")
    except Exception as e:
        logger.error(f"Startup migration failed: {e}")

    yield

    # Shutdown logic (if any)
    logger.info("Shutting down application...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Clothing Attribute Extractor", version="1.0.0", lifespan=lifespan
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=Config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount static files for images
    # Ensure directory exists
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(static_dir, exist_ok=True)
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Include routers
    app.include_router(weather_router, prefix="/api", tags=["Weather"])

    app.include_router(health_router, prefix="/api", tags=["Health"])

    app.include_router(auth_router, prefix="/api", tags=["Auth"])

    app.include_router(extraction_router, prefix="/api", tags=["Extraction"])

    app.include_router(wardrobe_router, prefix="/api", tags=["Wardrobe"])
    app.include_router(recommendation_router, prefix="/api", tags=["Recommendation"])
    # app.include_router(generation_router, prefix="/api", tags=["Generation"])  # Temporarily disabled

    from app.domains.chat.router import chat_router

    app.include_router(chat_router, prefix="/api", tags=["Chat"])

    # User router
    from app.domains.user.router import router as user_router

    app.include_router(user_router, prefix="/api", tags=["Users"])

    # Swagger UI에서 Bearer 토큰 인증을 위한 OpenAPI 스키마 커스터마이징
    # 라우터를 모두 추가한 후에 설정해야 함
    logger = logging.getLogger(__name__)

    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        try:
            from fastapi.openapi.utils import get_openapi

            openapi_schema = get_openapi(
                title=app.title,
                version=app.version,
                description=app.description,
                routes=app.routes,
            )
            # 보안 스키마 추가
            if "components" not in openapi_schema:
                openapi_schema["components"] = {}
            openapi_schema["components"]["securitySchemes"] = {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                }
            }

            # 각 경로에 보안 요구사항 추가 (인증이 필요한 엔드포인트에만)
            # NOTE: Swagger UI는 OpenAPI에 security가 걸린 operation에만 Authorization 헤더를 붙입니다.
            auth_required_paths = [
                "/api/extract",
                "/api/users",
                "/api/wardrobe",
                "/api/recommend",
                "/api/generation",
            ]

            auth_excluded_paths = ["/api/auth/login", "/api/auth/signup", "/api/health"]

            for path, path_item in openapi_schema.get("paths", {}).items():
                if not isinstance(path_item, dict):
                    continue

                for method, operation in path_item.items():
                    # HTTP 메서드만 처리하고, operation이 딕셔너리인지 확인
                    if method.lower() not in ["post", "put", "delete", "patch", "get"]:
                        continue
                    if not isinstance(operation, dict):
                        continue

                    # 인증이 필요한 경로인지 확인
                    needs_auth = any(
                        auth_path in path for auth_path in auth_required_paths
                    )
                    is_excluded = any(
                        excluded_path == path for excluded_path in auth_excluded_paths
                    )

                    if needs_auth and not is_excluded:
                        operation["security"] = [{"bearerAuth": []}]
                        logger.debug(
                            f"Added security requirement to {method.upper()} {path}"
                        )

            app.openapi_schema = openapi_schema
            return app.openapi_schema
        except Exception as e:
            logger.error(
                f"Error generating OpenAPI schema: {type(e).__name__}: {str(e)}",
                exc_info=True,
            )
            # 에러 발생 시 기본 OpenAPI 스키마 반환
            from fastapi.openapi.utils import get_openapi

            return get_openapi(
                title=app.title,
                version=app.version,
                description=app.description,
                routes=app.routes,
            )

    app.openapi = custom_openapi

    return app


app = create_app()

if __name__ == "__main__":
    # Ensure config can only warn if generated
    import uvicorn

    Config.check_api_key()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
