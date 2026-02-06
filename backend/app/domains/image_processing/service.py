from typing import Optional
import requests
import io
import base64
from PIL import Image, ImageFilter, ImageEnhance
from app.core.config import settings

# Optional imports with fallbacks
try:
    import numpy as np
except ImportError:
    np = None

try:
    from scipy import ndimage
except ImportError:
    ndimage = None


class ImageProcessingService:
    """Service for processing clothing images for virtual wardrobe display"""

    def __init__(self):
        self.remove_bg_api_key = getattr(settings, "REMOVE_BG_API_KEY", None)
        self.remove_bg_api_url = "https://api.remove.bg/v1.0/removebg"

    async def process_clothing_image(
        self, image_url: str, processing_type: str = "background_removal"
    ) -> str:
        """
        Process clothing image based on processing type

        Args:
            image_url: URL of the image to process
            processing_type: Type of processing (background_removal, silhouette, shadow)

        Returns:
            Processed image URL or base64 data
        """
        try:
            if processing_type == "background_removal":
                return await self._remove_background(image_url)
            elif processing_type == "silhouette":
                return await self._create_silhouette(image_url)
            elif processing_type == "shadow":
                return await self._add_shadow_effect(image_url)
            elif processing_type == "enhance":
                return await self._enhance_clothing(image_url)
            else:
                return image_url

        except Exception as e:
            print(f"Image processing error: {e}")
            return image_url

    async def _remove_background(self, image_url: str) -> str:
        """Remove background from clothing image"""
        try:
            # Try remove.bg API if available
            if self.remove_bg_api_key:
                return await self._remove_background_api(image_url)
            else:
                # Fallback to local processing
                return await self._remove_background_local(image_url)

        except Exception as e:
            print(f"Background removal failed: {e}")
            return image_url

    async def _remove_background_api(self, image_url: str) -> str:
        """Use remove.bg API for background removal"""
        try:
            response = requests.post(
                self.remove_bg_api_url,
                files={"image_url": image_url},
                data={"size": "auto"},
                headers={"X-Api-Key": self.remove_bg_api_key},
            )

            if response.status_code == requests.codes.ok:
                # Return base64 encoded result
                result_bytes = response.content
                base64_str = base64.b64encode(result_bytes).decode()
                return f"data:image/png;base64,{base64_str}"
            else:
                raise Exception(f"API request failed: {response.status_code}")

        except Exception as e:
            print(f"Remove.bg API error: {e}")
            # Fallback to local processing
            return await self._remove_background_local(image_url)

    async def _remove_background_local(self, image_url: str) -> str:
        """Local background removal using image processing"""
        try:
            # Download image
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))

            # Convert to RGBA
            if image.mode != "RGBA":
                image = image.convert("RGBA")

            # Use PIL for simple background detection
            if np is not None:
                img_array = np.array(image)

                # Create mask for white/light backgrounds
                mask = (
                    (img_array[:, :, 0] > 220)
                    & (img_array[:, :, 1] > 220)
                    & (img_array[:, :, 2] > 220)
                )

                # Apply Gaussian blur to edges for smooth transition
                mask = mask.astype(np.uint8) * 255
                mask_image = Image.fromarray(mask)
                mask_image = mask_image.filter(ImageFilter.GaussianBlur(radius=2))
                mask_array = np.array(mask_image)

                # Apply mask to image
                img_array[mask_array < 128, 3] = 0  # Set alpha to 0 for background

                # Convert back to image
                processed_image = Image.fromarray(img_array)
            else:
                # Fallback processing without numpy
                processed_image = image

            # Convert to base64
            buffered = io.BytesIO()
            processed_image.save(buffered, format="PNG", optimize=True)
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}"

        except Exception as e:
            print(f"Local background removal error: {e}")
            return image_url

    async def _create_silhouette(self, image_url: str) -> str:
        """Create clothing silhouette for hanger display"""
        try:
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))

            # Convert to grayscale
            gray_image = image.convert("L")

            # Enhance contrast
            enhancer = ImageEnhance.Contrast(gray_image)
            enhanced = enhancer.enhance(2.0)

            # Apply threshold
            if np is not None:
                img_array = np.array(enhanced)

                # Adaptive thresholding
                threshold = np.percentile(img_array, 70)
                silhouette = np.where(img_array > threshold, 0, 255)

                # Clean up with morphological operations
                if ndimage is not None:
                    silhouette = ndimage.binary_closing(silhouette, iterations=2)

                # Convert back to image
                silhouette_image = Image.fromarray(
                    silhouette.astype(np.uint8) * 255, mode="L"
                )
            else:
                # Fallback processing without numpy
                silhouette_image = enhanced

            # Create RGBA version with transparency
            rgba_image = Image.new("RGBA", silhouette_image.size, (0, 0, 0, 0))
            rgba_image.paste(silhouette_image, mask=silhouette_image)

            # Convert to base64
            buffered = io.BytesIO()
            rgba_image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}"

        except Exception as e:
            print(f"Silhouette generation error: {e}")
            return image_url

    async def _add_shadow_effect(self, image_url: str) -> str:
        """Add realistic shadow effect to clothing"""
        try:
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))

            # Convert to RGBA
            if image.mode != "RGBA":
                image = image.convert("RGBA")

            # Create shadow layer
            shadow = Image.new("RGBA", image.size, (0, 0, 0, 80))
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))

            # Offset shadow
            shadow_offset = Image.new("RGBA", image.size, (0, 0, 0, 0))
            shadow_offset.paste(shadow, (8, 8))

            # Composite original image with shadow
            result = Image.alpha_composite(shadow_offset, image)

            # Convert to base64
            buffered = io.BytesIO()
            result.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}"

        except Exception as e:
            print(f"Shadow effect error: {e}")
            return image_url

    async def _enhance_clothing(self, image_url: str) -> str:
        """Enhance clothing image quality"""
        try:
            response = requests.get(image_url)
            image = Image.open(io.BytesIO(response.content))

            # Convert to RGBA if needed
            if image.mode != "RGBA":
                image = image.convert("RGBA")

            # Enhance colors
            enhancer = ImageEnhance.Color(image)
            enhanced = enhancer.enhance(1.2)

            # Enhance contrast
            enhancer = ImageEnhance.Contrast(enhanced)
            enhanced = enhancer.enhance(1.1)

            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(enhanced)
            enhanced = enhancer.enhance(1.1)

            # Convert to base64
            buffered = io.BytesIO()
            enhanced.save(buffered, format="PNG", optimize=True)
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return f"data:image/png;base64,{img_str}"

        except Exception as e:
            print(f"Image enhancement error: {e}")
            return image_url


# Global instance
image_processing_service = ImageProcessingService()
