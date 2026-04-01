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

    All keys in ``badge_data`` are **camelCase** — snake_case is normalised
    away before the event is emitted.

    ``badge_data`` structure::

        {
          "id":     str,
          "status": str,          # "published"
          "versions": [
            {
              "id":        str,
              "createdAt": str,   # ISO-8601
              "badgeImage": {
                "b64":    str,    # base-64 encoded PNG
                "config": {
                  "layers":      list[dict],
                  "scaleFactor": int
                }
              },
              "courseContext": {
                "title":            str,
                "overview":         str,
                "description":      str,
                "shortDescription": str
              },
              "generatedResponse": {
                "enableSkillExtraction": bool,
                "badgeConfiguration": {
                  "badgeStyle":     str,
                  "badgeTone":      str,
                  "badgeLevel":     str,
                  "criterionStyle": str
                },
                "skills": [
                  {
                    "type":       str,   # e.g. "Alignment"
                    "targetName": str,
                    "targetType": str,   # e.g. "CF:Skill"
                    "targetUrl":  str
                  }
                ],
                "credentialSubject": {
                  "achievement": {
                    "name":        str,
                    "description": str,
                    "criteria": {
                      "narrative": str
                    }
                  }
                }
              }
            }
          ]
        }

    Attributes:
        uuid (str): Unique identifier for this generation event (UUID v4).
        course_id (CourseKey): The course for which the badge was generated.
        origin (str): Identifier of the system that generated the badge.
        badge_data (dict): Complete camelCase badge entry (see above).
    """

    uuid = attr.ib(type=str)
    course_id = attr.ib(type=CourseKey)
    badge_data = attr.ib(type=dict, factory=dict)
    origin = attr.ib(type=str, default="openedx-ai-badges")
