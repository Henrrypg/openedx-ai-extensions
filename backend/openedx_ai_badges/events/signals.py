"""
Local signal definitions for openedx-ai-badges.

These follow the OEP-41 event naming convention and are intended to be
contributed to openedx/openedx-events once the API is stabilised.

Once accepted upstream, replace this file's usage with:
    from openedx_events.learning.signals import BADGE_GENERATION
"""
from openedx_events.tooling import OpenEdxPublicSignal

from openedx_ai_badges.events.data import BadgeGenerationData

# .. event_type: org.openedx.content_authoring.badge.generation.v1
# .. event_name: BADGE_GENERATION
# .. event_description: Emitted when an AI-generated badge definition is published
#      for a course.  Downstream systems (e.g. Credentials → Credly)
#      consume this event to create the corresponding badge class.
#      NOTE: This event carries the badge *template* only — no user (learner)
#      data.  Learner-specific awarding is handled separately via
#      ``BADGE_AWARDED`` (openedx_events.learning.signals).
# .. event_data: BadgeGenerationData
# .. event_trigger_repository: eduNEXT/openedx-ai-badges
# .. event_warning: Local event pending contribution to openedx/openedx-events.
BADGE_GENERATION = OpenEdxPublicSignal(
    event_type="org.openedx.content_authoring.badge.generation.v1",
    data={
        "badge_generation": BadgeGenerationData,
    },
)
