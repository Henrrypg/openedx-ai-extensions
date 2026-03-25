"""Tests for MITDCCBadgeOrchestrator service status checks."""
from unittest.mock import MagicMock, patch

from openedx_ai_badges.workflows.orchestrators import MITDCCBadgeOrchestrator


def _orchestrator():
    """Build a bare instance for methods that do not use instance state."""
    return object.__new__(MITDCCBadgeOrchestrator)


@patch("openedx_ai_badges.workflows.orchestrators.requests.get")
@patch("openedx_ai_badges.workflows.orchestrators.settings")
def test_get_api_status_ollama_starting_when_models_list_empty(mock_settings, mock_get):
    """An empty /api/tags model list should be treated as startup state."""
    badge_resp = MagicMock(ok=True)
    ollama_resp = MagicMock(ok=True)
    ollama_resp.json.return_value = {"models": []}
    mock_get.side_effect = [badge_resp, ollama_resp]

    mock_settings.MIT_DCC_BADGE_API_HEALTH_URL = "https://badge.example/health"
    mock_settings.MIT_SLM_OLLAMA_URL = "https://ollama.example/api/generate"
    mock_settings.MIT_SLM_OLLAMA_TOKEN = "secret"

    result = _orchestrator().get_api_status({})

    assert result["services"]["badge_api"]["status"] == "online"
    assert result["services"]["ollama"]["status"] == "starting"


@patch("openedx_ai_badges.workflows.orchestrators.requests.get")
@patch("openedx_ai_badges.workflows.orchestrators.settings")
def test_get_api_status_ollama_online_when_models_list_has_entries(mock_settings, mock_get):
    """A non-empty /api/tags model list should count as online."""
    badge_resp = MagicMock(ok=True)
    ollama_resp = MagicMock(ok=True)
    ollama_resp.json.return_value = {"models": [{"name": "phi4-chat:latest"}]}
    mock_get.side_effect = [badge_resp, ollama_resp]

    mock_settings.MIT_DCC_BADGE_API_HEALTH_URL = "https://badge.example/health"
    mock_settings.MIT_SLM_OLLAMA_URL = "https://ollama.example/api/generate"
    mock_settings.MIT_SLM_OLLAMA_TOKEN = "secret"

    result = _orchestrator().get_api_status({})

    assert result["services"]["badge_api"]["status"] == "online"
    assert result["services"]["ollama"]["status"] == "online"


@patch("openedx_ai_badges.workflows.orchestrators.requests.post")
@patch("openedx_ai_badges.workflows.orchestrators.settings")
def test_generate_image_success(mock_settings, mock_post):
    """Successful image generation should return base64 and config."""
    mock_settings.MIT_DCC_BADGE_IMAGE_API_URL = "http://image.example"

    # Mock response
    mock_resp = MagicMock(ok=True)
    mock_resp.json.return_value = {"base64": "fakebase64", "config": {"layers": []}}
    mock_post.return_value = mock_resp

    # Mock orchestrator and session
    orchestrator = MITDCCBadgeOrchestrator(
        profile=MagicMock(),
        session=MagicMock(metadata={"complete_info": {"badge": {"name": "Test"}}}),
        location_id="loc",
        course_id="course",
        user=MagicMock()
    )

    result = orchestrator.generate_image({
        "mode": "icon_based",
        "badge_name": "Test Badge",
        "badge_description": "Test Description"
    })

    assert result["status"] == "completed"
    assert result["response"]["base64"] == "fakebase64"
    assert "badge_image" in orchestrator.session.metadata["complete_info"]
    assert orchestrator.session.save.called

    # Verify endpoint
    mock_post.assert_called_once_with(
        "http://image.example/api/v1/badge/generate-with-icon",
        json={
            "image_type": "icon_based",
            "badge_name": "Test Badge",
            "badge_description": "Test Description",
            "institution": "",
            "institute_url": "",
            "image_configuration": {},
            "scale_factor": 2.0,
        },
        timeout=60
    )
