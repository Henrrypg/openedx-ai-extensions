"""
Tests for BadgeImageUploadProcessor.
"""

import base64
from unittest.mock import MagicMock, patch

import pytest
from opaque_keys.edx.keys import CourseKey

# Minimal 1x1 PNG as raw base64
MINIMAL_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
MINIMAL_PNG_DATA_URL = f"data:image/png;base64,{MINIMAL_PNG_B64}"

BADGE_ID = "dd57c09f-4200-4cad-808f-0f5207e31666"
COURSE_ID_STR = "course-v1:edX+Demo+2024"
ASSET_PATH = "/asset-v1:edX+Demo+2024+type@asset+block@badge_dd57c09f.png"
LMS_ROOT = "http://localhost:18000"


@pytest.fixture
def processor():
    from openedx_ai_badges.processors.badge_image_upload_processor import BadgeImageUploadProcessor
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

    def test_returns_public_url_on_success(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            url = processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        assert url == f"{LMS_ROOT}{ASSET_PATH}"

    def test_strips_data_url_prefix(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            url = processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_DATA_URL, BADGE_ID)

        assert url == f"{LMS_ROOT}{ASSET_PATH}"
        uploaded_file = mock_upload.call_args[0][1]
        assert uploaded_file.read() == base64.b64decode(MINIMAL_PNG_B64)

    def test_converts_string_course_id_to_course_key(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        passed_course_key = mock_upload.call_args[0][0]
        assert isinstance(passed_course_key, CourseKey)

    def test_skips_conversion_when_already_course_key(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()
        real_key = CourseKey.from_string(COURSE_ID_STR)

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.CourseKey") as mock_ck:
            processor.upload_image_to_assets(real_key, MINIMAL_PNG_B64, BADGE_ID)
            mock_ck.from_string.assert_not_called()

        assert mock_upload.call_args[0][0] is real_key

    def test_returns_none_on_invalid_base64(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            url = processor.upload_image_to_assets(COURSE_ID_STR, "!!!not-valid-base64!!!", BADGE_ID)

        assert url is None
        mock_upload.assert_not_called()

    def test_returns_none_on_upload_failure(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload = MagicMock(side_effect=Exception("storage unavailable"))
        mock_get_static = MagicMock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            url = processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        assert url is None

    def test_uploaded_file_has_correct_name_and_content_type(self, processor, settings):
        settings.LMS_ROOT_URL = LMS_ROOT
        mock_upload, mock_get_static = _make_upload_mock()

        with patch("openedx_ai_badges.processors.badge_image_upload_processor.update_course_run_asset", mock_upload), \
             patch("openedx_ai_badges.processors.badge_image_upload_processor.get_static_content", mock_get_static):
            processor.upload_image_to_assets(COURSE_ID_STR, MINIMAL_PNG_B64, BADGE_ID)

        uploaded_file = mock_upload.call_args[0][1]
        assert uploaded_file.name == f"badge_{BADGE_ID}.png"
        assert uploaded_file.content_type == "image/png"
