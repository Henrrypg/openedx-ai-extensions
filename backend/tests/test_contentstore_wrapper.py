"""
Tests for the edxapp_wrapper contentstore module.

The wrapper must delegate to whatever backend is configured via
OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND without importing cms.djangoapps at
module load time (so CI doesn't fail).
"""

from unittest.mock import MagicMock, patch


class TestGetStaticContent:

    def test_returns_static_content_from_backend(self, settings):
        fake_backend = MagicMock()
        fake_static_content = MagicMock()
        fake_backend.StaticContent = fake_static_content
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        with patch("openedx_ai_badges.edxapp_wrapper.contentstore.import_module", return_value=fake_backend) as mock_import:
            from openedx_ai_badges.edxapp_wrapper.contentstore import get_static_content
            result = get_static_content()

        mock_import.assert_called_once_with("fake.backend")
        assert result is fake_static_content

    def test_uses_configured_backend_setting(self, settings):
        fake_backend = MagicMock()
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "my.custom.backend"

        with patch("openedx_ai_badges.edxapp_wrapper.contentstore.import_module", return_value=fake_backend) as mock_import:
            from openedx_ai_badges.edxapp_wrapper.contentstore import get_static_content
            get_static_content()

        mock_import.assert_called_once_with("my.custom.backend")


class TestUpdateCourseRunAsset:

    def test_delegates_to_backend(self, settings):
        fake_backend = MagicMock()
        fake_content = MagicMock()
        fake_backend.update_course_run_asset.return_value = fake_content
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        course_key = MagicMock()
        upload_file = MagicMock()

        with patch("openedx_ai_badges.edxapp_wrapper.contentstore.import_module", return_value=fake_backend):
            from openedx_ai_badges.edxapp_wrapper.contentstore import update_course_run_asset
            result = update_course_run_asset(course_key, upload_file)

        fake_backend.update_course_run_asset.assert_called_once_with(course_key, upload_file)
        assert result is fake_content

    def test_passes_args_and_kwargs_through(self, settings):
        fake_backend = MagicMock()
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        with patch("openedx_ai_badges.edxapp_wrapper.contentstore.import_module", return_value=fake_backend):
            from openedx_ai_badges.edxapp_wrapper.contentstore import update_course_run_asset
            update_course_run_asset("arg1", "arg2", extra="kwarg")

        fake_backend.update_course_run_asset.assert_called_once_with("arg1", "arg2", extra="kwarg")
