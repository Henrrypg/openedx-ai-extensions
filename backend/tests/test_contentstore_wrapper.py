"""
Tests for the edxapp_wrapper contentstore module.

The wrapper must delegate to whatever backend is configured via
OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND without importing cms.djangoapps at
module load time (so CI doesn't fail).
"""

from unittest.mock import MagicMock, patch

import pytest

from openedx_ai_badges.edxapp_wrapper.contentstore import _get_backend, get_static_content, update_course_run_asset

_IMPORT_MODULE = "openedx_ai_badges.edxapp_wrapper.contentstore.import_module"


@pytest.fixture(autouse=True)
def clear_backend_cache():
    """Clear the lru_cache on _get_backend between tests."""
    _get_backend.cache_clear()
    yield
    _get_backend.cache_clear()


class TestGetStaticContent:
    """Tests for the get_static_content wrapper."""

    def test_returns_static_content_from_backend(self, settings):
        """StaticContent attribute of the configured backend is returned."""
        fake_backend = MagicMock()
        fake_static_content = MagicMock()
        fake_backend.StaticContent = fake_static_content
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        with patch(_IMPORT_MODULE, return_value=fake_backend) as mock_import:
            result = get_static_content()

        mock_import.assert_called_once_with("fake.backend")
        assert result is fake_static_content

    def test_uses_configured_backend_setting(self, settings):
        """The backend module path is taken from OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND."""
        fake_backend = MagicMock()
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "my.custom.backend"

        with patch(_IMPORT_MODULE, return_value=fake_backend) as mock_import:
            get_static_content()

        mock_import.assert_called_once_with("my.custom.backend")

    def test_backend_is_cached_across_calls(self, settings):
        """The backend module is imported only once regardless of how many times wrappers are called."""
        fake_backend = MagicMock()
        fake_backend.StaticContent = MagicMock()
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        with patch(_IMPORT_MODULE, return_value=fake_backend) as mock_import:
            get_static_content()
            get_static_content()

        mock_import.assert_called_once()


class TestUpdateCourseRunAsset:
    """Tests for the update_course_run_asset wrapper."""

    def test_delegates_to_backend(self, settings):
        """The call is forwarded to the backend and its return value is passed back."""
        fake_backend = MagicMock()
        fake_content = MagicMock()
        fake_backend.update_course_run_asset.return_value = fake_content
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        course_key = MagicMock()
        upload_file = MagicMock()

        with patch(_IMPORT_MODULE, return_value=fake_backend):
            result = update_course_run_asset(course_key, upload_file)

        fake_backend.update_course_run_asset.assert_called_once_with(course_key, upload_file)
        assert result is fake_content

    def test_passes_args_and_kwargs_through(self, settings):
        """Positional and keyword arguments are forwarded unchanged to the backend."""
        fake_backend = MagicMock()
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = "fake.backend"

        with patch(_IMPORT_MODULE, return_value=fake_backend):
            update_course_run_asset("arg1", "arg2", extra="kwarg")

        fake_backend.update_course_run_asset.assert_called_once_with("arg1", "arg2", extra="kwarg")
