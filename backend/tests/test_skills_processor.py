"""
Tests for SkillsProcessor.generate_skills_laiser_api and related private methods.
"""
# pylint: disable=protected-access,redefined-outer-name
import json
from unittest.mock import MagicMock, patch

import pytest
import requests as req

from openedx_ai_badges.processors.badge_processor import SkillsProcessor

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

LAISER_API_RESULT = [
    {
        "Raw Skill": "Online learning",
        "Taxonomy Source": "esco",
        "Taxonomy Skill": "deliver online training",
        "Taxonomy Description": "Provide training by using online technologies.",
        "Source URL": "http://data.europa.eu/esco/skill/0d7f2cce",
        "Correlation Coefficient": 0.718,
    },
    {
        "Raw Skill": "Assessments",
        "Taxonomy Source": "ukos",
        "Taxonomy Skill": "Design subject exams or assessments",
        "Taxonomy Description": "Create and develop exams tailored to specific subjects.",
        "Source URL": "https://skillsclassification.org/skills",
        "Correlation Coefficient": 0.701,
    },
]

POLL_SUCCEEDED = {
    "jobId": "abc-123",
    "status": "SUCCEEDED",
    "result": LAISER_API_RESULT,
}


@pytest.fixture
def processor():
    """Return a SkillsProcessor with config and context set as they would be during process()."""
    p = SkillsProcessor({"SkillsProcessor": {"function": "generate_skills_laiser_api"}})
    p.config = {"function": "generate_skills_laiser_api"}
    p.context = json.dumps({"title": "Test Course", "description": "A test course."})
    p.input_data = None
    return p


def _mock_response(json_data, status_code=200):
    """Return a MagicMock mimicking a requests.Response."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = json_data
    mock.raise_for_status = MagicMock()
    return mock


# ---------------------------------------------------------------------------
# generate_skills_laiser_api — config validation
# ---------------------------------------------------------------------------

class TestGenerateSkillsLaiserApiConfig:
    """Missing or empty config returns an error immediately."""

    @patch("openedx_ai_badges.processors.badge_processor.settings")
    def test_missing_base_url_returns_error(self, mock_settings, processor):
        mock_settings.LAISER_API_BASE_URL = ""
        mock_settings.LAISER_API_KEY = "key"
        result = processor.generate_skills_laiser_api()
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.settings")
    def test_missing_api_key_returns_error(self, mock_settings, processor):
        mock_settings.LAISER_API_BASE_URL = "https://api.example.com/dev"
        mock_settings.LAISER_API_KEY = ""
        result = processor.generate_skills_laiser_api()
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.settings")
    def test_both_missing_returns_error(self, mock_settings, processor):
        mock_settings.LAISER_API_BASE_URL = ""
        mock_settings.LAISER_API_KEY = ""
        result = processor.generate_skills_laiser_api()
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.settings")
    def test_processor_config_overrides_settings(self, mock_settings, processor):
        mock_settings.LAISER_API_BASE_URL = ""
        mock_settings.LAISER_API_KEY = ""
        mock_settings.LAISER_API_TIMEOUT_SECONDS = 90
        mock_settings.LAISER_API_POLL_INTERVAL_SECONDS = 2
        processor.config["base_url"] = "https://override.example.com/dev"
        processor.config["api_key"] = "override-key"
        with patch("openedx_ai_badges.processors.badge_processor.requests.post") as mock_post, \
             patch("openedx_ai_badges.processors.badge_processor.requests.get") as mock_get, \
             patch("openedx_ai_badges.processors.badge_processor.time.sleep"):
            mock_post.return_value = _mock_response({"jobId": "abc-123"})
            mock_get.return_value = _mock_response(POLL_SUCCEEDED)
            processor.generate_skills_laiser_api()
            args, _ = mock_post.call_args
            assert args[0] == "https://override.example.com/dev/laiser"


# ---------------------------------------------------------------------------
# generate_skills_laiser_api — submit phase
# ---------------------------------------------------------------------------

class TestGenerateSkillsLaiserApiSubmit:
    """Tests for the POST /laiser submit step."""

    @pytest.fixture(autouse=True)
    def patch_settings(self):  # pylint: disable=missing-function-docstring
        with patch("openedx_ai_badges.processors.badge_processor.settings") as s:
            s.LAISER_API_BASE_URL = "https://api.example.com/dev"
            s.LAISER_API_KEY = "test-key"
            s.LAISER_API_TIMEOUT_SECONDS = 90
            s.LAISER_API_POLL_INTERVAL_SECONDS = 2
            yield s

    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_submit_connection_error_returns_error(self, mock_post, processor):
        mock_post.side_effect = req.exceptions.ConnectionError("refused")
        result = processor.generate_skills_laiser_api()
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_submit_non_json_response_returns_error(self, mock_post, processor):
        mock_post.return_value = _mock_response({})
        mock_post.return_value.json.side_effect = ValueError("not JSON")
        result = processor.generate_skills_laiser_api()
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_submit_missing_job_id_returns_error(self, mock_post, processor):
        mock_post.return_value = _mock_response({"status": "QUEUED"})
        result = processor.generate_skills_laiser_api()
        assert "error" in result
        assert "jobId" in result["error"]

    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_context_sent_as_input_text(self, mock_post, processor):
        mock_post.return_value = _mock_response({"jobId": None})
        processor.generate_skills_laiser_api()
        _, kwargs = mock_post.call_args
        assert kwargs["json"]["inputText"] == processor.context

    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_api_key_sent_in_header(self, mock_post, processor):
        mock_post.return_value = _mock_response({"jobId": None})
        processor.generate_skills_laiser_api()
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["x-api-key"] == "test-key"


# ---------------------------------------------------------------------------
# generate_skills_laiser_api — happy path
# ---------------------------------------------------------------------------

class TestGenerateSkillsLaiserApiHappyPath:
    """End-to-end happy path with mocked HTTP."""

    @pytest.fixture(autouse=True)
    def patch_settings(self):  # pylint: disable=missing-function-docstring
        with patch("openedx_ai_badges.processors.badge_processor.settings") as s:
            s.LAISER_API_BASE_URL = "https://api.example.com/dev"
            s.LAISER_API_KEY = "test-key"
            s.LAISER_API_TIMEOUT_SECONDS = 90
            s.LAISER_API_POLL_INTERVAL_SECONDS = 2
            yield s

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_returns_success_status(self, mock_post, mock_get, _sleep, processor):
        mock_post.return_value = _mock_response({"jobId": "abc-123"})
        mock_get.return_value = _mock_response(POLL_SUCCEEDED)
        result = processor.generate_skills_laiser_api()
        assert result["status"] == "success"

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_response_contains_skills_list(self, mock_post, mock_get, _sleep, processor):
        mock_post.return_value = _mock_response({"jobId": "abc-123"})
        mock_get.return_value = _mock_response(POLL_SUCCEEDED)
        result = processor.generate_skills_laiser_api()
        parsed = json.loads(result["response"])
        assert "skills" in parsed
        assert len(parsed["skills"]) == 2

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    @patch("openedx_ai_badges.processors.badge_processor.requests.post")
    def test_skills_are_normalized(self, mock_post, mock_get, _sleep, processor):
        mock_post.return_value = _mock_response({"jobId": "abc-123"})
        mock_get.return_value = _mock_response(POLL_SUCCEEDED)
        result = processor.generate_skills_laiser_api()
        skill = json.loads(result["response"])["skills"][0]
        assert skill["type"] == "Alignment"
        assert skill["target_name"] == "deliver online training"
        assert skill["target_type"] == "ESCO:Skill"
        assert skill["correlation_coefficient"] == 0.718


# ---------------------------------------------------------------------------
# _poll_laiser_job
# ---------------------------------------------------------------------------

class TestPollLaiserJob:
    """Tests for the polling loop."""

    @pytest.fixture(autouse=True)
    def patch_settings(self):  # pylint: disable=missing-function-docstring
        with patch("openedx_ai_badges.processors.badge_processor.settings") as s:
            s.LAISER_API_TIMEOUT_SECONDS = 6
            s.LAISER_API_POLL_INTERVAL_SECONDS = 2
            yield s

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    def test_queued_then_succeeded(self, mock_get, _sleep, processor):
        mock_get.side_effect = [
            _mock_response({"status": "QUEUED"}),
            _mock_response(POLL_SUCCEEDED),
        ]
        result = processor._poll_laiser_job("https://api.example.com/dev", "key", "abc-123")
        assert result["status"] == "SUCCEEDED"
        assert mock_get.call_count == 2

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    def test_running_then_succeeded(self, mock_get, _sleep, processor):
        mock_get.side_effect = [
            _mock_response({"status": "RUNNING"}),
            _mock_response(POLL_SUCCEEDED),
        ]
        result = processor._poll_laiser_job("https://api.example.com/dev", "key", "abc-123")
        assert result["status"] == "SUCCEEDED"

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    def test_timeout_returns_error(self, mock_get, _sleep, processor):
        mock_get.return_value = _mock_response({"status": "QUEUED"})
        result = processor._poll_laiser_job("https://api.example.com/dev", "key", "abc-123")
        assert "error" in result
        assert "timed out" in result["error"]

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    def test_poll_request_error_returns_error(self, mock_get, _sleep, processor):
        mock_get.side_effect = req.exceptions.ConnectionError("refused")
        result = processor._poll_laiser_job("https://api.example.com/dev", "key", "abc-123")
        assert "error" in result

    @patch("openedx_ai_badges.processors.badge_processor.time.sleep")
    @patch("openedx_ai_badges.processors.badge_processor.requests.get")
    def test_job_id_sent_as_query_param(self, mock_get, _sleep, processor):
        mock_get.return_value = _mock_response(POLL_SUCCEEDED)
        processor._poll_laiser_job("https://api.example.com/dev", "key", "abc-123")
        _, kwargs = mock_get.call_args
        assert kwargs["params"]["jobId"] == "abc-123"


# ---------------------------------------------------------------------------
# _normalize_laiser_skill
# ---------------------------------------------------------------------------

class TestNormalizeLaiserSkill:
    """Tests for the API response normalizer."""

    def test_type_is_alignment(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert result["type"] == "Alignment"

    def test_target_name_from_taxonomy_skill(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert result["target_name"] == "deliver online training"

    def test_skill_tag_from_raw_skill(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert result["skill_tag"] == "Online learning"

    def test_esco_source_maps_to_esco_skill(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert result["target_type"] == "ESCO:Skill"

    def test_ukos_source_maps_to_ukos_skill(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[1])
        assert result["target_type"] == "UKOS:Skill"

    def test_unknown_source_passed_through(self):
        skill = {**LAISER_API_RESULT[0], "Taxonomy Source": "custom_source"}
        result = SkillsProcessor._normalize_laiser_skill(skill)
        assert result["target_type"] == "custom_source"

    def test_correlation_coefficient_preserved(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert result["correlation_coefficient"] == 0.718

    def test_empty_lists_for_abilities_and_knowledge(self):
        result = SkillsProcessor._normalize_laiser_skill(LAISER_API_RESULT[0])
        assert not result["task_abilities"]
        assert not result["knowledge_required"]

    def test_missing_fields_default_gracefully(self):
        result = SkillsProcessor._normalize_laiser_skill({})
        assert result["type"] == "Alignment"
        assert result["skill_tag"] == ""
        assert result["target_name"] == ""
        assert result["correlation_coefficient"] == 0
