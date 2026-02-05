import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Config:
    # Gemini Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-1.5-flash")

    # Google Cloud Configuration
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS", "google_credentials.json"
    )
    GOOGLE_CLOUD_PROJECT = os.getenv(
        "GOOGLE_CLOUD_PROJECT", "industrial-keep-485507-g3"
    )
    GOOGLE_CLOUD_LOCATION = os.getenv(
        "GOOGLE_CLOUD_LOCATION", "us-central1"
    )  # Vertex AI is regional

    # Google Credentials (Split)
    GOOGLE_TYPE = os.getenv("GOOGLE_TYPE", "service_account")
    GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID", GOOGLE_CLOUD_PROJECT)
    GOOGLE_PRIVATE_KEY_ID = os.getenv("GOOGLE_PRIVATE_KEY_ID")
    GOOGLE_PRIVATE_KEY = os.getenv("GOOGLE_PRIVATE_KEY")
    GOOGLE_CLIENT_EMAIL = os.getenv("GOOGLE_CLIENT_EMAIL")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_AUTH_URI = os.getenv("GOOGLE_AUTH_URI")
    GOOGLE_TOKEN_URI = os.getenv("GOOGLE_TOKEN_URI")
    GOOGLE_AUTH_PROVIDER_X509_CERT_URL = os.getenv("GOOGLE_AUTH_PROVIDER_X509_CERT_URL")
    GOOGLE_CLIENT_X509_CERT_URL = os.getenv("GOOGLE_CLIENT_X509_CERT_URL")
    GOOGLE_UNIVERSE_DOMAIN = os.getenv("GOOGLE_UNIVERSE_DOMAIN", "googleapis.com")

    # Security

    SECRET_KEY = os.getenv("SECRET_KEY", "your-fallback-secret-key-change-in-prod")

    # KMA Weather API Configuration
    # NOTE: 프로젝트 내 설정 파일(.env / local.settings.json)에서 키 이름이
    # `KMA_SERVICE_KEY`로 쓰이는 경우가 있어 하위 호환을 지원합니다.
    KMA_API_KEY = os.getenv("KMA_API_KEY") or os.getenv("KMA_SERVICE_KEY", "")

    # Validation
    MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    }

    # Paths
    OUTPUT_DIR = "extracted_attributes"

    # Database
    # .env 또는 환경변수에 DATABASE_URL 이 설정되어 있으면 사용하고,
    # 없으면 로컬 개발용 기본값을 사용합니다.
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/myclo",
    )

    @staticmethod
    def check_api_key():
        if not Config.GEMINI_API_KEY:
            print("Warning: GEMINI_API_KEY environment variable is not set.")
            print("       Please set GEMINI_API_KEY in .env or environment variables.")
        if not Config.KMA_API_KEY:
            print("Warning: KMA API key environment variable is not set.")
            print(
                "       Please set KMA_API_KEY (or KMA_SERVICE_KEY) in .env/local.settings.json or environment variables."
            )

        if not os.path.exists(Config.GOOGLE_APPLICATION_CREDENTIALS):
            print(
                f"Warning: Google Credentials file not found at {Config.GOOGLE_APPLICATION_CREDENTIALS}"
            )
