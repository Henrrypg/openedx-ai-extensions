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
