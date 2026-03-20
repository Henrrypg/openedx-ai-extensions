"""
Badge Orchestrator - Generates Open Badges 3.0 BadgeClass via async Celery tasks.
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests
from django.conf import settings

# pylint: disable=import-error
from openedx_ai_extensions.processors import OpenEdXProcessor
from openedx_ai_extensions.workflows.orchestrators.session_based_orchestrator import (
    SessionBasedOrchestrator,
    _execute_orchestrator_async,
)

from openedx_ai_badges.processors.badge_processor import BadgeProcessor, SkillsProcessor
from openedx_ai_badges.processors.mit_dcc_processor import MITDCCProcessor

logger = logging.getLogger(__name__)


class BadgeOrchestrator(SessionBasedOrchestrator):
    """
    Orchestrator to generate Open Badges 3.0 BadgeClass
    based on course context and optional skills.
    """

    def save(self, input_data):
        """
        Save the updated value to session metadata.
        Args:
            input_data: dict with keys 'key' and 'value'
        Returns:
            dict: Response containing the updated metadata and status
        """
        key = input_data.get('key')
        value = input_data.get('value')
        if not key:
            return {'error': 'Missing key', 'status': 'error'}
        if 'complete_info' not in self.session.metadata:
            self.session.metadata['complete_info'] = {}
        # Verify that the value is JSON serializable
        try:
            if isinstance(value, str):
                value = json.loads(value)
            json.dumps(value)
        except Exception as e:      # pylint: disable=broad-exception-caught
            return {'error': f'Value must be valid JSON: {str(e)}', 'status': 'error'}
        self.session.metadata['complete_info'][key] = value
        self.session.save(update_fields=['metadata'])
        return {
            "response": self.session.metadata['complete_info'],
            "status": "saved",
        }

    def regenerate(self, input_data):
        """
        Regenerate the badge using the existing session metadata.
        Args:
            input_data: dict containing any necessary input for regeneration
        Returns:
            dict: Response containing the regenerated badge and status
        """
        if not self.session.metadata.get('complete_info'):
            return {
                "error": "No previous generation found to regenerate from.",
                "status": "error",
            }

        complete_info = self.session.metadata['complete_info']

        if not complete_info.get('badge'):
            return {
                "error": "Previous badge definition is missing. Cannot regenerate without a prior badge.",
                "status": "error",
            }

        skills_requested = input_data.get('skills_enabled', False) or input_data.get('skillsEnabled', False)
        if skills_requested and not complete_info.get('skills'):
            return {
                "error": "Skills were requested for regeneration but no previous skills definition was found.",
                "status": "error",
            }

        input_data['previous_badge'] = complete_info.get('badge')
        input_data['previous_skills'] = complete_info.get('skills')

        self._set_status_message("Fetching course content...")
        course_context = self._get_course_context()
        if isinstance(course_context, dict) and 'error' in course_context:
            return course_context

        complete_info = {}
        complete_info['course_context'] = course_context
        if skills_requested:
            self._set_status_message("Generating skills alignment...")
            skills = self._get_skills(course_context, input_data, regenerate=True)
            if isinstance(skills, dict) and 'error' in skills:
                return skills
            complete_info['skills'] = skills

        self._set_status_message("Generating badge definition...")
        badge = self._get_badge(complete_info, input_data, regenerate=True)
        if isinstance(badge, dict) and 'error' in badge:
            return badge
        complete_info['badge'] = badge

        self.session.metadata['complete_info'] = complete_info
        self.session.save(update_fields=['metadata'])

        return {
            "response": complete_info,
            "status": "completed",
        }

    def regenerate_async(self, input_data):
        """
        Launch async task to execute the regenerate method.

        Args:
            input_data: Input data to pass to the regenerate method
        """
        self.session.course_id = self.course_id
        self.session.location_id = self.location_id
        self.session.metadata = self.session.metadata or {}
        self.session.metadata['task_status'] = 'processing'
        self.session.metadata.pop('task_result', None)
        self.session.metadata.pop('task_error', None)
        self.session.metadata.pop('task_status_message', None)
        self.session.save()

        task = _execute_orchestrator_async.delay(
            session_id=self.session.id,
            action='regenerate',
            params={
                "input_data": input_data,
            }
        )

        return {
            'status': 'processing',
            'task_id': task.id,
            'message': 'AI workflow has started',
        }

    def run(self, input_data):
        """
        Execute the badge generation workflow.
        Args:
            input_data: dict containing any necessary input for the workflow
        Returns:
            dict: Final response containing the generated badge and status
        """
        if self.session.metadata.get('complete_info'):
            complete_info = self.session.metadata['complete_info']
            return {
                "response": complete_info,
                "status": "completed",
            }

        self._set_status_message("Fetching course content...")
        course_context = self._get_course_context()
        if isinstance(course_context, dict) and 'error' in course_context:
            return course_context

        complete_info = {}
        complete_info['course_context'] = course_context
        if input_data.get('skills_enabled', False) or input_data.get('skillsEnabled', False):
            self._set_status_message("Generating skills alignment...")
            skills = self._get_skills(course_context, input_data)
            if isinstance(skills, dict) and 'error' in skills:
                return skills
            complete_info['skills'] = skills

        self._set_status_message("Generating badge definition...")
        badge = self._get_badge(complete_info, input_data)
        if isinstance(badge, dict) and 'error' in badge:
            return badge
        complete_info['badge'] = badge

        self.session.metadata['complete_info'] = complete_info
        self.session.save(update_fields=['metadata'])

        return {
            "response": complete_info,
            "status": "completed",
        }

    def _get_course_context(self):
        """Run OpenEdXProcessor and return course context or error dict."""
        openedx_processor = OpenEdXProcessor(
            processor_config=self.profile.processor_config,
            location_id=self.location_id,
            course_id=self.course_id,
            user=self.user,
        )
        course_context = openedx_processor.process()
        if 'error' in course_context:
            return {'error': course_context['error'], 'status': 'error'}
        return course_context

    def _get_skills(self, course_context, input_data, regenerate=False):
        """Run SkillsProcessor and return skills or error dict."""
        skill_processor = SkillsProcessor(
            self.profile.processor_config,
            regenerate=regenerate
        )
        llm_result = skill_processor.process(
            context=json.dumps(course_context),
            input_data=json.dumps(input_data)
        )
        if 'error' in llm_result:
            return {
                'error': f"Skills generation failed: {llm_result.get('error', 'Unknown error')}",
                'status': 'error'
            }
        try:
            skills = json.loads(llm_result.get("response", "{}"))
            return skills
        except json.JSONDecodeError as e:
            return {
                'error': f"Failed to parse skills response: {str(e)}",
                'status': 'error'
            }

    def _get_badge(self, complete_info, input_data, regenerate=False):
        """Run BadgeProcessor and return badge dict."""
        badge_processor = BadgeProcessor(
            self.profile.processor_config,
            regenerate=regenerate
        )
        llm_result = badge_processor.process(
            context=json.dumps(complete_info),
            input_data=json.dumps(input_data)
        )

        if 'error' in llm_result:
            return {
                'error': f"Badge generation failed: {llm_result.get('error', 'Unknown error')}",
                'status': 'error'
            }
        try:
            badge = json.loads(llm_result.get("response", "{}"))
            if complete_info.get('skills'):
                badge = {**badge, **complete_info['skills']}
            return badge
        except json.JSONDecodeError as e:
            return {
                'error': f"Failed to parse badge response: {str(e)}",
                'status': 'error'
            }


class MITDCCBadgeOrchestrator(BadgeOrchestrator):
    """
    Orchestrator that delegates badge generation to the MIT DCC remote API
    instead of running local LLM processors.

    The workflow is:
      1. Extract course context via OpenEdXProcessor (same as base).
      2. POST the course context + user input to the MIT DCC API.
      3. Parse and normalise the response into the same shape that
         BadgeOrchestrator produces so the existing UI works unchanged.

    The ``save`` action is inherited from BadgeOrchestrator without changes.
    """

    def get_api_status(self, input_data):  # pylint: disable=unused-argument
        """
        Check availability of the external services used by this orchestrator.

        Args:
            input_data: accepted for framework compatibility but not used.

        Returns:
            dict: service statuses keyed by service name.
        """
        health_url = getattr(settings, 'MIT_DCC_BADGE_API_HEALTH_URL', '')
        ollama_url = getattr(settings, 'MIT_SLM_OLLAMA_URL', '')
        ollama_token = getattr(settings, 'MIT_SLM_OLLAMA_TOKEN', '')

        def check_badge_api():
            if not health_url:
                return 'not_configured'
            try:
                resp = requests.get(health_url, timeout=5)
                return 'online' if resp.ok else 'unavailable'
            except Exception:   # pylint: disable=broad-exception-caught
                return 'unavailable'

        def check_ollama():
            if not ollama_url:
                return 'not_configured'
            parsed = urlparse(ollama_url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            tags_url = f"{base_url}/api/tags"
            headers = {}
            if ollama_token:
                headers['Authorization'] = f'Bearer {ollama_token}'
            try:
                resp = requests.get(tags_url, headers=headers, timeout=5)
                return 'online' if resp.ok else 'unavailable'
            except Exception:   # pylint: disable=broad-exception-caught
                return 'unavailable'

        with ThreadPoolExecutor(max_workers=2) as executor:
            badge_api_future = executor.submit(check_badge_api)
            ollama_future = executor.submit(check_ollama)
            badge_api_status = badge_api_future.result()
            ollama_status = ollama_future.result()

        return {
            'services': {
                'badge_api': {'status': badge_api_status, 'required': True},
                'ollama': {'status': ollama_status, 'required': True},
                'image_api': {'status': 'not_configured', 'required': False},
                'laiser_api': {'status': 'not_configured', 'required': False},
            }
        }

    def run(self, input_data):
        """
        Execute badge generation via the MIT DCC remote API.

        Args:
            input_data: dict containing user form fields (style, tone, level,
                        criterion, skillsEnabled, …)
        Returns:
            dict: ``{"response": complete_info, "status": "completed"}``
        """
        if self.session.metadata.get('complete_info'):
            return {
                "response": self.session.metadata['complete_info'],
                "status": "completed",
            }

        self._set_status_message("Fetching course content...")
        course_context = self._get_course_context()
        if isinstance(course_context, dict) and 'error' in course_context:
            return course_context

        self._set_status_message("Generating badge via MIT DCC API...")
        processor = MITDCCProcessor(self.profile.processor_config)
        api_result = processor.generate_badge(
            course_context=course_context,
            input_data=input_data,
        )

        if isinstance(api_result, dict) and 'error' in api_result:
            return {**api_result, 'status': 'error'}

        complete_info = {
            'course_context': course_context,
            **api_result,
        }

        self.session.metadata['complete_info'] = complete_info
        self.session.save(update_fields=['metadata'])

        return {
            "response": complete_info,
            "status": "completed",
        }

    def regenerate(self, input_data):
        """
        Re-generate badge via the MIT DCC remote API, passing the previous
        badge result as additional context so the model can improve on it.

        Args:
            input_data: dict containing updated user form fields
        Returns:
            dict: ``{"response": complete_info, "status": "completed"}``
        """
        if not self.session.metadata.get('complete_info'):
            return {
                "error": "No previous generation found to regenerate from.",
                "status": "error",
            }

        previous_complete_info = self.session.metadata['complete_info']

        if not previous_complete_info.get('badge'):
            return {
                "error": "Previous badge definition is missing. Cannot regenerate without a prior badge.",
                "status": "error",
            }

        self._set_status_message("Fetching course content...")
        course_context = self._get_course_context()
        if isinstance(course_context, dict) and 'error' in course_context:
            return course_context

        self._set_status_message("Regenerating badge via MIT DCC API...")
        processor = MITDCCProcessor(self.profile.processor_config)
        api_result = processor.generate_badge(
            course_context=course_context,
            input_data={
                **input_data,
                'previous_badge': previous_complete_info.get('badge'),
                'previous_skills': previous_complete_info.get('skills'),
            },
        )

        if isinstance(api_result, dict) and 'error' in api_result:
            return {**api_result, 'status': 'error'}

        complete_info = {
            'course_context': course_context,
            **api_result,
        }

        self.session.metadata['complete_info'] = complete_info
        self.session.save(update_fields=['metadata'])

        return {
            "response": complete_info,
            "status": "completed",
        }
