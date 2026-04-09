"""
MIT DCC Processor — calls the MIT DCC remote badge-generation API.

Unlike the LLM-based processors, this processor does not use an LLM directly;
it delegates to an external HTTP service.  The interface intentionally mirrors
``BadgeProcessor`` / ``SkillsProcessor`` so the orchestrator can treat all
processors uniformly.

Switch between the real API and the mock by toggling the dispatch line inside
``generate_badge``.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MITDCCProcessor:
    """
    Processor that generates badge data by calling the MIT DCC API.

    Args:
        processor_config (dict): processor_config dict from the workflow profile
                                 (stored but not currently used; reserved for
                                 future per-profile overrides).
    """

    def __init__(self, processor_config=None):
        self.processor_config = processor_config or {}

    @property
    def api_url(self):
        """Return the MIT DCC API URL, configured via Django settings."""
        return settings.MIT_DCC_BADGE_API_URL

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def generate_badge(self, course_context: dict, input_data: dict) -> dict:
        """
        Generate badge data for a given course.

        Args:
            course_context: dict from OpenEdXProcessor (title, description, …)
            input_data: user-supplied form options (style, tone, level,
                        criterion, skillsEnabled, …)

        Returns:
            On success: normalised dict with keys ``badge``, optionally
                        ``skills``, and ``mit_dcc_*`` for every extra field
                        returned by the API.

            On error:   ``{"error": "<message>"}``
        """
        logger.info(
            "MITDCCProcessor.generate_badge called for course: %s",
            course_context.get("title", "<unknown>"),
        )
        logger.debug("generate_badge course_context: %s", course_context)
        logger.debug("generate_badge input_data: %s", input_data)

        # Switch between real API and mock here:
        # return self._mock_api_response(course_context, input_data)
        return self._call_api(course_context, input_data)

    # ------------------------------------------------------------------
    # Real API call
    # ------------------------------------------------------------------

    def _call_api(self, course_context: dict, input_data: dict) -> dict:
        """POST to the MIT DCC service and return the normalised result."""
        skills_enabled = (
            input_data.get("skills_enabled", False)
            or input_data.get("skillsEnabled", False)
        )
        payload = {
            "course_input": self._build_course_input(course_context),
            "badge_configuration": {
                "badge_style": input_data.get("style", ""),
                "badge_tone": input_data.get("tone", ""),
                "badge_level": input_data.get("level", ""),
                "criterion_style": input_data.get("criterion", ""),
            },
            "enable_skill_extraction": skills_enabled,
            "image_generation": {"enabled": False},
        }

        logger.info("MIT DCC API URL: %s", self.api_url)
        logger.info("MIT DCC request payload: %s", payload)

        try:
            response = requests.post(self.api_url, json=payload, timeout=300)
            logger.info(
                "MIT DCC API response — status: %s, headers: %s",
                response.status_code,
                dict(response.headers),
            )
            logger.info("MIT DCC API raw response body: %s", response.text)
            response.raise_for_status()
        except requests.exceptions.ConnectionError as exc:
            logger.error(
                "MIT DCC API connection error (is the service up on %s?): %s",
                self.api_url, exc,
            )
            return {"error": str(exc)}
        except requests.exceptions.Timeout as exc:
            logger.error("MIT DCC API timed out after 300 s: %s", exc)
            return {"error": str(exc)}
        except requests.exceptions.HTTPError as exc:
            logger.error(
                "MIT DCC API HTTP error %s — body: %s",
                response.status_code,
                response.text,
            )
            return {"error": str(exc)}
        except requests.RequestException as exc:
            logger.error("MIT DCC API request failed: %s", exc)
            return {"error": str(exc)}

        try:
            data = response.json()
        except ValueError as exc:
            logger.error(
                "MIT DCC API returned non-JSON body: %s — %s", response.text, exc
            )
            return {"error": f"Invalid JSON response: {exc}"}

        logger.info(
            "MIT DCC API parsed response keys: %s",
            list(data.keys()) if isinstance(data, dict) else type(data).__name__,
        )
        logger.debug("MIT DCC API full parsed response: %s", data)

        result = self._parse_api_response(data, skills_enabled)
        logger.info("MIT DCC result keys: %s", list(result.keys()))
        logger.debug("MIT DCC result: %s", result)
        return result

    # ------------------------------------------------------------------
    # Mock — mirrors the exact shape the real API returns
    # ------------------------------------------------------------------

    def _mock_api_response(self, course_context: dict, input_data: dict) -> dict:
        """
        Return a response shaped identically to the real MIT DCC API so that
        ``_parse_api_response`` produces the same normalised output whether the
        mock or the real API is used.
        """
        course_title = course_context.get("title", "Course")
        level = input_data.get("level", "intermediate")
        criterion = input_data.get("criterion", "completion")
        skills_enabled = (
            input_data.get("skills_enabled", False)
            or input_data.get("skillsEnabled", False)
        )
        badge_style = input_data.get("style", "modern")
        badge_tone = input_data.get("tone", "professional")

        raw = {
            "credentialSubject": {
                "achievement": {
                    "name": f"{course_title} — {level.capitalize()} Badge",
                    "description": (
                        f"Awarded for {criterion} of {course_title}. "
                        "This badge was generated via the MIT DCC badge-generation service."
                    ),
                    "criteria": {
                        "narrative": (
                            f"Earners of this badge have demonstrated {criterion} "
                            f"in {course_title} at the {level} level."
                        )
                    },
                }
            },
            "imageConfig": None,
            "badge_id": "mock-badge-id-00000000-0000-0000-0000-000000000000",
            "metrics": {
                "total_duration": 0,
                "load_duration": 0,
                "prompt_eval_count": 0,
                "prompt_eval_duration": 0,
                "eval_count": 0,
                "eval_duration": 0,
            },
            "skills": [
                {
                    "Knowledge Required": [],
                    "Task Abilities": [],
                    "Skill Tag": "ESCO.474",
                    "Correlation Coefficient": 0.59,
                    "targetName": "E-Learning",
                    "targetDescription": (
                        "The strategies and didactical methods of learning in which "
                        "the main elements include the use of ICT technologies."
                    ),
                    "targetUrl": "http://data.europa.eu/esco/skill/5f5e9350-1d13-4391-b9e1-07f6b2047fc5",
                    "type": "Alignment",
                    "targetType": "ESCO:Skill",
                },
                {
                    "Knowledge Required": [],
                    "Task Abilities": [],
                    "Skill Tag": "ESCO.642",
                    "Correlation Coefficient": 0.56,
                    "targetName": "Learning Technologies",
                    "targetDescription": "The technologies and channels, including digital, to enhance learning.",
                    "targetUrl": "http://data.europa.eu/esco/skill/7fc4c18a-68f3-425a-aadf-f83633be47a1",
                    "type": "Alignment",
                    "targetType": "ESCO:Skill",
                },
            ],
            "badge_configuration": {
                "badge_style": badge_style,
                "badge_tone": badge_tone,
                "criterion_style": criterion,
                "badge_level": level,
                "institution": "",
                "institute_url": "",
                "custom_instructions": "",
            },
            "enable_image_generation": False,
            "enable_skill_extraction": skills_enabled,
        }

        logger.info("MIT DCC mock response generated for course: %s", course_title)
        logger.debug("MIT DCC mock raw response: %s", raw)

        result = self._parse_api_response(raw, skills_enabled)
        logger.info("MIT DCC mock result keys: %s", list(result.keys()))
        return result

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_course_input(self, course_context: dict) -> str:
        """Flatten course_context fields into a single string for the API."""
        parts = []
        if course_context.get("title"):
            parts.append(course_context["title"])
        for field in ("short_description", "description", "overview"):
            value = (course_context.get(field) or "").strip()
            if value:
                parts.append(value)
        course_input = ". ".join(parts)
        logger.debug("_build_course_input result: %s", course_input)
        return course_input

    def _parse_api_response(self, data: dict, skills_enabled: bool) -> dict:
        """
        Validate and pass through the MIT DCC API response.

        The canonical shape is returned as-is.  Warnings are logged when
        expected keys are missing so that callers can detect degraded responses
        without the normalisation layer masking the problem.
        """
        if "credentialSubject" not in data:
            logger.warning(
                "MIT DCC response missing 'credentialSubject' — top-level keys: %s",
                list(data.keys()),
            )
        elif "achievement" not in data.get("credentialSubject", {}):
            logger.warning(
                "MIT DCC credentialSubject missing 'achievement' — credentialSubject keys: %s",
                list(data["credentialSubject"].keys()),
            )

        if skills_enabled and "skills" not in data:
            logger.warning(
                "MIT DCC response missing 'skills' despite enable_skill_extraction=True"
            )

        logger.debug("MIT DCC pass-through response: %s", data)
        return data
