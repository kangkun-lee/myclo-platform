import pytest
from unittest.mock import patch, MagicMock
from app.domains.image_processing.service import ImageProcessingService


@pytest.mark.asyncio
async def test_remove_background_local_success():
    service = ImageProcessingService()

    # Mock requests.get
    with patch("requests.get") as mock_get:
        mock_get.return_value.content = b"fake_image_bytes"
        mock_get.return_value.raise_for_status = MagicMock()

        # Mock rembg.remove
        with patch("app.domains.image_processing.service.remove") as mock_remove:
            mock_remove.return_value = b"processed_bytes"

            result = await service._remove_background_local(
                "http://example.com/image.jpg"
            )

            assert result.startswith("data:image/png;base64,")
            mock_remove.assert_called_once()


@pytest.mark.asyncio
async def test_remove_background_local_failure():
    service = ImageProcessingService()

    # Mock requests.get to fail
    with patch("requests.get") as mock_get:
        mock_get.side_effect = Exception("Download failed")

        result = await service._remove_background_local("http://example.com/bad.jpg")

        # Should return original URL on failure
        assert result == "http://example.com/bad.jpg"
