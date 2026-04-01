"""
Processor for emitting Open edX events related to badge generation.

This processor is intentionally *not* an LLMProcessor — it performs no AI
calls.  It is a thin service layer that builds the event payload and fires
the ``BADGE_GENERATION`` signal.
"""
import logging
from uuid import uuid4

from opaque_keys.edx.keys import CourseKey

from openedx_ai_badges.events.data import BadgeGenerationData
from openedx_ai_badges.events.signals import BADGE_GENERATION

logger = logging.getLogger(__name__)


class OpenEdXEventsProcessor:
    """
    Builds and emits the ``BADGE_GENERATION`` Open edX event.

    This is a **course-level** event — it carries the badge template
    definition produced by the AI workflow.  No learner (user) data is
    included.  Downstream systems (Credentials → Credly) receive this event
    and create the corresponding badge class on their side.

    Usage::

        processor = OpenEdXEventsProcessor()
        result = processor.emit_badge_generation(
            course_id=course_key,
            badge_info=badge_dict,
        )
    """

    def emit_badge_generation(self, course_id, badge_info: dict) -> dict:
        """
        Emit ``BADGE_GENERATION`` for the given course and badge definition.

        Args:
            course_id: A ``CourseKey`` instance or any value accepted by
                ``CourseKey.from_string()``.
            badge_info (dict): Full session badge entry as stored in
                ``AIWorkflowSession.metadata['badges']``.  Must contain at
                minimum a ``generated_response`` key with the Open Badges 3.0
                payload (``credentialSubject`` or ``credential_subject``).

        Returns:
            dict: ``{'response': {generation_uuid, course_id, badge_name}, 'status': 'generated'}``
                  on success, or ``{'error': ..., 'status': 'error'}`` on failure.
        """
        if not badge_info:
            return {
                'error': 'badge_info is required to emit BADGE_GENERATION.',
                'status': 'error',
            }

        # Normalise course_id to a CourseKey instance
        if not isinstance(course_id, CourseKey):
            try:
                course_id = CourseKey.from_string(str(course_id))
            except Exception as exc:  # pylint: disable=broad-exception-caught
                return {'error': f'Invalid course_id: {exc}', 'status': 'error'}

        generation_uuid = str(uuid4())

        event_data = BadgeGenerationData(
            uuid=generation_uuid,
            course_id=course_id,
            badge_data=badge_info,
        )

        try:
            BADGE_GENERATION.send_event(badge_generation=event_data)
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.exception("Failed to emit BADGE_GENERATION: %s", exc)
            return {'error': f'Failed to emit BADGE_GENERATION: {exc}', 'status': 'error'}

        badge_name = self._extract_badge_name(badge_info)
        logger.info(
            "BADGE_GENERATION emitted for course=%s generation_uuid=%s badge_name=%r",
            course_id, generation_uuid, badge_name,
        )
        return {
            'response': {
                'generation_uuid': generation_uuid,
                'course_id': str(course_id),
                'badge_name': badge_name,
            },
            'status': 'generated',
        }

    @staticmethod
    def _extract_badge_name(badge_info: dict) -> str:
        """
        Extract the achievement name from a session badge entry.

        Handles both camelCase (``credentialSubject``, local LLM path) and
        snake_case (``credential_subject``, MIT DCC path) field names.
        """
        generated = badge_info.get('generated_response', {})
        subject = (
            generated.get('credentialSubject')
            or generated.get('credential_subject')
            or {}
        )
        return subject.get('achievement', {}).get('name', '')
