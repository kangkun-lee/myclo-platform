import os
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트의 .env 파일 로드 (기존 방식 변경)
project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / ".env"
# override=True를 설정하여 시스템 환경변수에 placeholder가 있어도 .env 값으로 덮어씁니다.
load_dotenv(env_path, override=True)


class Config:
    # Backend API Configuration
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    SECRET_KEY = os.getenv("SECRET_KEY", "B80CUVjGcxwD8KqPAZktjE_shk9_hGMW2hxXSQg5BBE")
    API_VERSION = os.getenv("API_VERSION", "v1")

    # Database Configuration (Supabase)
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # URL 내 패스워드에 특수문자(&, ?)가 포함된 경우를 위한 처리
    if DATABASE_URL and "@" in DATABASE_URL:
        try:
            from urllib.parse import quote_plus, urlparse, urlunparse

            result = urlparse(DATABASE_URL)
            if result.password:
                # 패스워드만 추출하여 인코딩
                encoded_password = quote_plus(result.password)
                # 새로운 URL 생성
                userinfo = f"{result.username}:{encoded_password}"
                if result.port:
                    netloc = f"{userinfo}@{result.hostname}:{result.port}"
                else:
                    netloc = f"{userinfo}@{result.hostname}"

                DATABASE_URL = urlunparse(
                    (
                        result.scheme,
                        netloc,
                        result.path,
                        result.params,
                        result.query,
                        result.fragment,
                    )
                )
        except Exception as e:
            print(f"Warning: Failed to encode DATABASE_URL: {e}")

    if not DATABASE_URL:
        DATABASE_URL = "postgresql://user:password@localhost:5432/myclo"

    # Gemini Configuration (유지)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-1.5-flash")

    # KMA Weather API Configuration (유지)
    # NOTE: 프로젝트 내 설정 파일(.env / local.settings.json)에서 키 이름이
    # `KMA_SERVICE_KEY`로 쓰이는 경우가 있어 하위 호환을 지원합니다.
    _KMA_TEMP = os.getenv("KMA_API_KEY") or os.getenv("KMA_SERVICE_KEY", "")
    # placeholder 값인 경우 빈 문자열로 처리
    KMA_API_KEY = "" if "your_kma_api_key_here" in _KMA_TEMP else _KMA_TEMP

    # Supabase Configuration (새로 추가)
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "wardrobe-images")

    # File Upload & Storage Configuration (환경변수와 일치하도록 수정)
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB (.env와 일치)
    ALLOWED_EXTENSIONS = set(
        os.getenv("ALLOWED_EXTENSIONS", "jpg,jpeg,png,gif,webp").split(",")
    )
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    }

    # Paths
    OUTPUT_DIR = os.getenv("OUTPUT_DIR", "extracted_attributes")

    # CORS Configuration (프론트엔드 개발용)
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Development & Production Environment
    NODE_ENV = os.getenv("NODE_ENV", "development")
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

    @staticmethod
    def check_api_key():
        # Gemini API 키 체크
        if not Config.GEMINI_API_KEY:
            print("Warning: GEMINI_API_KEY environment variable is not set.")
            print("       Please set GEMINI_API_KEY in .env or environment variables.")

        # KMA API 키 체크
        if not Config.KMA_API_KEY:
            print("Warning: KMA API key environment variable is not set.")
            print(
                "       Please set KMA_API_KEY (or KMA_SERVICE_KEY) in .env or environment variables."
            )

        # Supabase 설정 체크
        if not Config.SUPABASE_URL:
            print("Warning: SUPABASE_URL environment variable is not set.")
        if not Config.SUPABASE_ANON_KEY:
            print("Warning: SUPABASE_ANON_KEY environment variable is not set.")
        if not Config.SUPABASE_SERVICE_KEY:
            print("Warning: SUPABASE_SERVICE_KEY environment variable is not set.")
