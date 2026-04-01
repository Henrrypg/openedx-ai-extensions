"""
Data classes for openedx-ai-badges local events.

``BadgeTemplateData`` (from openedx-events) covers uuid/origin/name/description/image_url
but has no ``course_id`` or ``criteria_narrative``.  ``BadgeData`` adds a ``UserData``
(learner PII) which is wrong for a course-level event.

``BadgeGenerationData`` extends the template concept with those two missing fields.
It follows OEP-49 (frozen attrs) so it can be contributed to openedx/openedx-events later.

Once accepted upstream, replace these imports with:
    from openedx_events.learning.data import BadgeGenerationData
"""
import attr
from opaque_keys.edx.keys import CourseKey


@attr.s(frozen=True)
class BadgeGenerationData:
    """
    Data for the BADGE_GENERATION event.

    Carries the complete session badge entry (Open Badges 3.0 payload plus
    course context and image) as a single ``badge_data`` field.  No learner
    PII is included — this is a course-level artifact.

    The ``badge_data`` dict mirrors the shape stored in the
    ``AIWorkflowSession.metadata['badges']`` list::

        {
          "id":               str,            # badge UUID
          "status":           str,            # "published"
          "created_at":       str,            # ISO-8601
          "course_context":   dict,           # title, overview, …
          "generated_response": {
            "credentialSubject": {            # camelCase (local LLM path)
              "achievement": {
                "name":        str,
                "description": str,
                "criteria":    {"narrative": str},
              }
            },
            # -- or MIT DCC path --
            "credential_subject": { … },      # snake_case
            "skills": [ {Alignment} … ],
            "badge_configuration": { … },
            "enable_skill_extraction": bool,
          },
          "badge_image":      dict | None,    # {"b64": …, "config": …}
          "versions":         list,
        }

    Attributes:
        uuid (str): Unique identifier for this generation event (UUID v4).
        course_id (CourseKey): The course for which the badge was generated.
        badge_data (dict): Complete session badge entry (see above).
        origin (str): Identifier of the system that generated the badge.
    """

    uuid = attr.ib(type=str)
    course_id = attr.ib(type=CourseKey)
    badge_data = attr.ib(type=dict, factory=dict)
    origin = attr.ib(type=str, default="openedx-ai-badges")
