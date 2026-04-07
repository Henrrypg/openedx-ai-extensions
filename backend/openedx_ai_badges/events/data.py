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

    ``badge_data`` is a serialized **OpenBadgeCredential** (OB 3.0 / W3C VC)
    document.  Only the fields that have a direct mapping in the spec are
    included; internal fields (``course_context``, ``badge_configuration``,
    ``enable_skill_extraction``, etc.) are intentionally omitted.

    ``badge_data`` structure::

        {
          "@context": [
            "https://www.w3.org/ns/credentials/v2",
            "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
          ],
          "id":        str,          # "urn:uuid:<badge_id>"
          "type":      ["VerifiableCredential", "OpenBadgeCredential"],
          "name":      str,          # achievement name
          "image":     {
            "type": "Image",
            "id":   str          # image URL
          }
          "validFrom": str,          # ISO-8601 timestamp
          "issuer":    dict,
          "credentialSubject": {
            "type": ["AchievementSubject"],
            "achievement": {
              "id":          str,    # "urn:uuid:<achievement_id>"
              "type":        ["Achievement"],
              "name":        str,
              "description": str,
              "criteria": {
                "narrative": str
              },
              "alignment": [         # present only when skills were generated
                {
                  "type":              ["Alignment"],
                  "targetName":        str,
                  "targetUrl":         str,
                  "targetType":        str,   # e.g. "ESCO:Skill"
                  "targetDescription": str    # optional
                }
              ],
              "image": {             # present only when a badge image exists
                "type": "Image",
                "id":   str          # image URL
              }
            }
          }
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
