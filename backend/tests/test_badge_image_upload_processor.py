"""
Tests for BadgeImageUploadProcessor.
"""
# pylint: disable=redefined-outer-name

import base64
from unittest.mock import MagicMock, patch

import pytest
from opaque_keys.edx.keys import CourseKey

from openedx_ai_badges.processors.badge_image_upload_processor import BadgeImageUploadProcessor

# Minimal 1x1 PNG as raw base64
MINIMAL_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
MINIMAL_PNG_DATA_URL = f"data:image/png;base64,{MINIMAL_PNG_B64}"

BADGE_ID = "dd57c09f-4200-4cad-808f-0f5207e31666"
COURSE_ID_STR = "course-v1:edX+Demo+2024"
ASSET_PATH = "/asset-v1:edX+Demo+2024+type@asset+block@badge_dd57c09f.png"
LMS_ROOT = "http://localhost:18000"

_MODULE = "openedx_ai_badges.processors.badge_image_upload_processor"


@pytest.fixture
def upload_processor():
    """Return a BadgeImageUploadProcessor instance."""
    return BadgeImageUploadProcessor()


def _make_upload_mock(asset_path=ASSET_PATH):
    """Return (mock_upload, mock_get_static) pair pre-configured for a successful upload."""
    content = MagicMock()
    mock_upload = MagicMock(return_value=content)

    StaticContent = MagicMock()
    StaticContent.serialize_asset_key_with_slash.return_value = asset_path
    mock_get_static = MagicMock(return_value=StaticContent)

    return mock_upload, mock_get_static


class TestUploadImageToAssets:
    """Tests for BadgeImageUploadProcessor.upload_image_to_assets."""

    def test_returns_public_url_on_success(self, upload_processor, settings):
        """Successful upload returns a fully-qualified public URL."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            url = upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        assert url == f"{LMS_ROOT}{ASSET_PATH}"

    def test_strips_data_url_prefix(self, upload_processor, settings):
        """Data URL prefix is stripped before decoding so the upload receives raw PNG bytes."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            url = upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_DATA_URL, BADGE_ID)

        assert url == f"{LMS_ROOT}{ASSET_PATH}"
        uploaded_file = mock_upload.call_args[0][1]
        assert uploaded_file.read() == base64.b64decode(MINIMAL_PNG_B64)

    def test_converts_string_course_id_to_course_key(self, upload_processor, settings):
        """A string course ID is converted to a CourseKey before calling the asset store."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        passed_course_key = mock_upload.call_args[0][0]
        assert isinstance(passed_course_key, CourseKey)

    def test_skips_conversion_when_already_course_key(self, upload_processor, settings):
        """A CourseKey instance is passed through without calling from_string."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()
        real_key = CourseKey.from_string(COURSE_ID_STR)

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static), \
             patch.object(CourseKey, "from_string") as mock_from_string:
            upload_processor.upload_image_to_assets(real_key, MINIMAL_PNG_B64, BADGE_ID)
            mock_from_string.assert_not_called()

        assert mock_upload.call_args[0][0] is real_key

    def test_returns_none_on_invalid_base64(self, upload_processor, settings):
        """Invalid base64 input returns None without calling the asset store."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            url = upload_processor.upload_image_to_assets(COURSE_ID_STR, "!!!not-valid-base64!!!", BADGE_ID)

        assert url is None
        mock_upload.assert_not_called()

    def test_returns_none_on_upload_failure(self, upload_processor, settings):
        """A storage exception during upload returns None instead of propagating."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload = MagicMock(side_effect=Exception("storage unavailable"))
        mock_get_static = MagicMock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            url = upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        assert url is None

    def test_returns_none_when_image_exceeds_max_size(self, upload_processor, settings):
        """Images exceeding OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES return None without uploading."""
        settings.LMS_ROOT_URL = LMS_ROOT
        settings.OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES = 1  # 1 byte limit
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            url = upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        assert url is None
        mock_upload.assert_not_called()

    def test_uploaded_file_has_correct_name_and_content_type(self, upload_processor, settings):
        """The uploaded InMemoryUploadedFile has the badge-specific filename and PNG content type."""
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch(f"{_MODULE}.update_course_run_asset", mock_upload), \
             patch(f"{_MODULE}.get_static_content", mock_get_static):
            upload_processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        uploaded_file = mock_upload.call_args[0][1]
        assert uploaded_file.name == f"badge_{BADGE_ID}.png"
        assert uploaded_file.content_type == "image/png"
