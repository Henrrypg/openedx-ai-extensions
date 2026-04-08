"""
Processor to upload a badge image from base64 to Open edX course assets.
"""

import base64
import io
import logging
import time
from urllib.parse import urljoin

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from opaque_keys.edx.keys import CourseKey

from openedx_ai_badges.edxapp_wrapper.contentstore import get_static_content, update_course_run_asset

logger = logging.getLogger(__name__)


class BadgeImageUploadProcessor:
    """
    Uploads a base64-encoded PNG image to the Open edX course asset store
    and returns a public URL.
    """

    def upload_image_to_assets(self, course_id, b64_string, badge_id):
        """
        Decode a base64 PNG and store it as a course asset.

        Args:
            course_id: Open edX CourseKey for the target course.
            b64_string (str): Base64-encoded PNG image data.
            badge_id (str): UUID of the badge, used to generate a unique filename.

        Returns:
            str: Public URL of the uploaded asset, or None on failure.
        """
        if not isinstance(course_id, CourseKey):
            course_id = CourseKey.from_string(course_id)

        try:
            # Strip data URL prefix if present (e.g. "data:image/png;base64,...")
            if "," in b64_string:
                b64_string = b64_string.split(",", 1)[1]
            image_bytes = base64.b64decode(b64_string, validate=True)
        except Exception:  # pylint: disable=broad-except
            logger.exception("Failed to decode base64 badge image for badge %s", badge_id)
            return None

        max_size = getattr(settings, "OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES", 5 * 1024 * 1024)
        if len(image_bytes) > max_size:
            logger.error(
                "Badge image for badge %s exceeds maximum allowed size (%d bytes)", badge_id, max_size
            )
            return None

        filename = f"badge_{badge_id}.png"
        file_obj = InMemoryUploadedFile(
            file=io.BytesIO(image_bytes),
            field_name=None,
            name=filename,
            content_type="image/png",
            size=len(image_bytes),
            charset=None,
        )

        try:
            content = update_course_run_asset(course_id, file_obj)
        except Exception:  # pylint: disable=broad-except
            logger.exception("Failed to upload badge image to course assets for badge %s", badge_id)
            return None

        StaticContent = get_static_content()
        asset_url = StaticContent.serialize_asset_key_with_slash(content.location)
        lms_root = getattr(settings, "LMS_ROOT_URL", "")
        base = urljoin(lms_root, asset_url)
        return f"{base}?v={int(time.time())}"
