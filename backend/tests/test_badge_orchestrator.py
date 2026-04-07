"""
Tests for BadgeOrchestrator._pre_publish_cleanup and its integration with save_badge.

The key invariant being tested: when a badge is published the API response must
already contain the resolved public image URL (``badge['image']['id']``) and
must NOT contain the raw base64 (``badge['badge_image']``).  If the frontend
relies on the response rather than reloading the page, it should see the correct
image immediately after publishing.
"""

from unittest.mock import MagicMock, patch

from openedx_ai_badges.workflows.orchestrators import BadgeOrchestrator

BADGE_ID = "dd57c09f-4200-4cad-808f-0f5207e31666"
COURSE_ID = "course-v1:edX+Demo+2024"
IMAGE_URL = "http://localhost:18000/asset-v1:edX+Demo+2024+type@asset+block@badge_dd57c09f.png"
B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


def _orchestrator(badges=None):
    """Return a BadgeOrchestrator instance with a minimal mock session."""
    orchestrator = object.__new__(BadgeOrchestrator)
    orchestrator.course_id = COURSE_ID
    orchestrator.session = MagicMock()
    orchestrator.session.metadata = {"badges": badges or []}
    return orchestrator


def _badge_with_image(badge_id=BADGE_ID, b_64=B64, extra_versions=True):
    """Return a draft badge dict that has a badge_image with a b_64 payload."""
    badge = {
        "id": badge_id,
        "status": "draft",
        "badge_image": {"b_64": b_64, "config": {}},
    }
    if extra_versions:
        badge["versions"] = [{"id": "v1", "badge_image": {"b_64": b_64}}]
    return badge


class TestPrePublishCleanup:
    """Unit tests for BadgeOrchestrator._pre_publish_cleanup."""

    def test_versions_are_removed(self):
        """Draft image versions are popped from the badge on cleanup."""
        orchestrator = _orchestrator()
        badge = _badge_with_image()

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = IMAGE_URL
            orchestrator._pre_publish_cleanup(badge)  # pylint: disable=protected-access

        assert "versions" not in badge

    def test_badge_image_replaced_with_url_on_success(self):
        """On successful upload badge_image is removed and image.id is set to the public URL."""
        orchestrator = _orchestrator()
        badge = _badge_with_image()

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = IMAGE_URL
            orchestrator._pre_publish_cleanup(badge)  # pylint: disable=protected-access

        assert "badge_image" not in badge
        assert badge["image"] == {"id": IMAGE_URL}

    def test_upload_called_with_correct_args(self):
        """The processor receives course_id, b64 string, and badge id."""
        orchestrator = _orchestrator()
        badge = _badge_with_image()

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            mock_upload = MockProc.return_value.upload_image_to_assets
            mock_upload.return_value = IMAGE_URL
            orchestrator._pre_publish_cleanup(badge)  # pylint: disable=protected-access

        mock_upload.assert_called_once_with(COURSE_ID, B64, BADGE_ID)

    def test_badge_image_kept_when_upload_fails(self):
        """If the upload returns None the raw badge_image is left in place."""
        orchestrator = _orchestrator()
        badge = _badge_with_image()

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = None
            orchestrator._pre_publish_cleanup(badge)  # pylint: disable=protected-access

        assert "badge_image" in badge
        assert "image" not in badge

    def test_no_upload_when_badge_has_no_image(self):
        """Cleanup is a no-op for the upload step when badge_image is absent."""
        orchestrator = _orchestrator()
        badge = {"id": BADGE_ID, "status": "draft", "versions": []}

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            orchestrator._pre_publish_cleanup(badge)  # pylint: disable=protected-access
            MockProc.return_value.upload_image_to_assets.assert_not_called()

        assert "versions" not in badge
        assert "image" not in badge


class TestSaveBadgePublishResponse:
    """
    Integration-level tests for save_badge ensuring the publish response
    already contains the resolved image URL.

    This is the invariant that prevents a stale-image problem on the frontend:
    if the caller trusts the response body it should see the correct image
    without needing a full page reload.
    """

    def test_response_contains_image_url_not_base64_after_publish(self):
        """The save_badge response for a published badge has image.id, not badge_image."""
        badge = _badge_with_image()
        orchestrator = _orchestrator(badges=[badge])
        orchestrator._emit_badge_generation = MagicMock()  # pylint: disable=protected-access

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = IMAGE_URL
            result = orchestrator.save_badge({
                "badge_id": BADGE_ID,
                "status": "published",
                "badge_image": {"b_64": B64, "config": {}},
            })

        returned_badge = result["response"]
        assert returned_badge.get("image", {}).get("id") == IMAGE_URL
        assert "badge_image" not in returned_badge

    def test_response_still_has_badge_image_when_upload_fails(self):
        """If upload fails the response retains badge_image so the frontend can still render."""
        badge = _badge_with_image()
        orchestrator = _orchestrator(badges=[badge])
        orchestrator._emit_badge_generation = MagicMock()  # pylint: disable=protected-access

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = None
            result = orchestrator.save_badge({
                "badge_id": BADGE_ID,
                "status": "published",
                "badge_image": {"b_64": B64, "config": {}},
            })

        returned_badge = result["response"]
        assert "badge_image" in returned_badge
        assert "image" not in returned_badge

    def test_session_saved_after_cleanup(self):
        """The session is persisted after pre-publish cleanup so the DB reflects the URL."""
        badge = _badge_with_image()
        orchestrator = _orchestrator(badges=[badge])
        orchestrator._emit_badge_generation = MagicMock()  # pylint: disable=protected-access

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = IMAGE_URL
            orchestrator.save_badge({
                "badge_id": BADGE_ID,
                "status": "published",
                "badge_image": {"b_64": B64, "config": {}},
            })

        # save must be called at least twice: once before cleanup, once after
        assert orchestrator.session.save.call_count >= 2

    def test_emit_called_after_cleanup(self):
        """The badge event is emitted after cleanup so the payload carries the URL, not b64."""
        badge = _badge_with_image()
        orchestrator = _orchestrator(badges=[badge])
        emit_mock = MagicMock()
        orchestrator._emit_badge_generation = emit_mock  # pylint: disable=protected-access

        with patch("openedx_ai_badges.workflows.orchestrators.BadgeImageUploadProcessor") as MockProc:
            MockProc.return_value.upload_image_to_assets.return_value = IMAGE_URL
            orchestrator.save_badge({
                "badge_id": BADGE_ID,
                "status": "published",
                "badge_image": {"b_64": B64, "config": {}},
            })

        emit_mock.assert_called_once()
        emitted_badge = emit_mock.call_args[0][0]
        assert emitted_badge.get("image", {}).get("id") == IMAGE_URL
        assert "badge_image" not in emitted_badge
