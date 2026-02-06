import logging
from typing import Dict, Any
from app.ai.workflows.extraction_workflow import extract_attributes

logger = logging.getLogger(__name__)


class AttributeExtractor:
    """
    이미지 속성 추출 서비스

    내부적으로 LangGraph 워크플로우를 사용하여 이미지에서 의류 속성을 추출합니다.
    """

    def extract(
        self, images: bytes | list[bytes], retry_on_schema_fail: bool = True
    ) -> Dict[str, Any]:
        """
        이미지(들)에서 의류 속성 추출

        Args:
            images: 단일 이미지 바이트 또는 이미지 바이트 리스트
            retry_on_schema_fail: 스키마 검증 실패 시 재시도 여부

        Returns:
            추출된 속성 딕셔너리 (신뢰도 포함)
        """
        if isinstance(images, bytes):
            images = [images]

        logger.info(
            f"Extracting attributes from {len(images)} images with confidence scores..."
        )
        return extract_attributes(images, retry_on_schema_fail=retry_on_schema_fail)


# 싱글톤 인스턴스 (하위 호환성 유지)
extractor = AttributeExtractor()
