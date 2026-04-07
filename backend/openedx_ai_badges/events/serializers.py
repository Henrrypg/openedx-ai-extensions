"""
Serializers for converting internal badge session data to Open Badges 3.0 format.

The internal badge entry stored in ``AIWorkflowSession.metadata['badges']``
uses a mix of snake_case keys and a structure tailored to the LLM pipeline.
Before the ``BADGE_GENERATION`` event is emitted, the payload is normalised to
a valid **OpenBadgeCredential** (OB 3.0 / W3C VC) document so that consumers
can process a standards-compliant structure without any knowledge of the
internal representation.

Reference spec:
  https://1edtech.github.io/openbadges-specification/ob_v3p0.html
"""
import uuid as _uuid


# OB 3.0 JSON-LD contexts
_OB3_CONTEXTS = [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
]


def to_open_badge_credential(badge_info: dict) -> dict:
    """
    Serialize a session badge entry to an Open Badges 3.0 ``OpenBadgeCredential``.

    Only the fields that map cleanly onto the OB 3.0 schema are included.
    Internal fields such as ``course_context``, ``badge_configuration``, or
    ``enable_skill_extraction`` are intentionally omitted from the event
    payload.

    Args:
        badge_info (dict): Full session badge entry as stored in
            ``AIWorkflowSession.metadata['badges']``.  Expected keys::

                {
                    "id":               str,          # internal UUID
                    "status":           str,
                    "created_at":       str,          # ISO-8601
                    "generated_response": {
                        "credentialSubject" | "credential_subject": {
                            "achievement": {
                                "name":        str,
                                "description": str,
                                "criteria": {"narrative": str}
                            }
                        },
                        "skills": [                   # optional
                            {
                                "type":              str,
                                "targetName":        str,
                                "targetType":        str,
                                "targetUrl":         str,
                                "targetDescription": str  # optional
                            }
                        ]
                    },
                    "badge_image": {                   # optional
                        "b64": str,                    # base64-encoded PNG/SVG
                        "config": dict
                    }
                }

    Returns:
        dict: An ``OpenBadgeCredential`` document::

            {
                "@context": [...],
                "id": "urn:uuid:<badge_id>",
                "type": ["VerifiableCredential", "OpenBadgeCredential"],
                "name": "<achievement name>",
                "image": {...},             # present only when a badge image exists
                "validFrom": "<ISO-8601 timestamp>",
                "issuer": {...},
                "credentialSubject": {
                    "type": ["AchievementSubject"],
                    "achievement": {
                        "id": "urn:uuid:<achievement_id>",
                        "type": ["Achievement"],
                        "name": "<name>",
                        "description": "<description>",
                        "criteria": {"narrative": "<narrative>"},
                        "alignment": [...],  # present only when skills exist
                        "image": {...}        # present only when badge_image exists
                    }
                }
            }
    """
    generated = badge_info.get('generated_response') or {}

    subject_data = (
        generated.get('credentialSubject')
        or generated.get('credential_subject')
        or {}
    )
    achievement_data = subject_data.get('achievement', {})
    criteria_data = achievement_data.get('criteria', {})

    badge_id = badge_info.get('id') or str(_uuid.uuid4())
    valid_from = badge_info.get('created_at', '')
    achievement_name = achievement_data.get('name', '')

    # Build Achievement node
    achievement: dict = {
        "id": f"urn:uuid:{str(_uuid.uuid4())}",
        "type": ["Achievement"],
        "name": achievement_name,
        "description": achievement_data.get('description', ''),
        "criteria": {
            "narrative": criteria_data.get('narrative', ''),
        },
    }

    skills = generated.get('skills') or []
    if skills:
        alignment = []
        for skill in skills:
            entry: dict = {
                "type": ["Alignment"],
                "targetName": skill.get('target_name', ''),
                "targetUrl": skill.get('target_url', ''),
                "targetType": skill.get('target_type', ''),
            }
            target_description = skill.get('target_description')
            if target_description:
                entry["targetDescription"] = target_description
            alignment.append(entry)
        achievement["alignment"] = alignment

    badge_image = badge_info.get('badge_image') or {}
    badge_url = badge_image.get('b_64', '')[:10]  # TODO: store base64 as asset and reference via URL
    achievement["image"] = {
        "type": "Image",
        "id": badge_url,
    }

    issuer = {
      "id": "urn:uuid:issuer-" + str(_uuid.uuid4()),
      "type": "Profile",
      "name": "Issuer Name"  # TODO: populate with real issuer info (e.g., platform name, URL, contact info)
    }

    credential: dict = {
        "@context": _OB3_CONTEXTS,
        "id": f"urn:uuid:{badge_id}",
        "type": ["VerifiableCredential", "OpenBadgeCredential"],
        "name": achievement_name,
        "image": achievement.get("image"),
        "credentialSubject": {
            "id": f"urn:uuid:{str(_uuid.uuid4())}",
            "type": ["AchievementSubject"],
            "achievement": achievement,
        },
        "issuer": issuer,
    }

    if valid_from:
        credential["validFrom"] = valid_from

    return credential
