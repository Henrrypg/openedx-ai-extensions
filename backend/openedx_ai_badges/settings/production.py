"""
Production settings for the openedx_ai_extensions application.
"""

from openedx_ai_badges.settings.common import plugin_settings as common_settings


def plugin_settings(settings):
    """
    Set up production-specific settings.

    Args:
        settings (dict): Django settings object
    """
    # Apply common settings
    common_settings(settings)

    # -------------------------
    # MIT DCC Badge API
    # -------------------------
    if hasattr(settings, "ENV_TOKENS"):
        settings.MIT_DCC_BADGE_API_URL = settings.ENV_TOKENS.get(
            "MIT_DCC_BADGE_API_URL", settings.MIT_DCC_BADGE_API_URL
        )
        settings.MIT_SLM_OLLAMA_URL = settings.ENV_TOKENS.get(
            "MIT_SLM_OLLAMA_URL", settings.MIT_SLM_OLLAMA_URL
        )
        settings.MIT_SLM_OLLAMA_TOKEN = settings.ENV_TOKENS.get(
            "MIT_SLM_OLLAMA_TOKEN", settings.MIT_SLM_OLLAMA_TOKEN
        )
        settings.MIT_DCC_BADGE_API_HEALTH_URL = settings.ENV_TOKENS.get(
            "MIT_DCC_BADGE_API_HEALTH_URL", settings.MIT_DCC_BADGE_API_HEALTH_URL
        )

    # -------------------------
    # Contentstore wrapper
    # -------------------------
    if hasattr(settings, "ENV_TOKENS"):
        settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND = settings.ENV_TOKENS.get(
            "OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND", settings.OPENEDX_AI_BADGES_CONTENTSTORE_BACKEND
        )
        settings.OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES = settings.ENV_TOKENS.get(
            "OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES", settings.OPENEDX_AI_BADGES_MAX_IMAGE_SIZE_BYTES
        )

    # -------------------------
    # LAiSER API
    # -------------------------
    if hasattr(settings, "ENV_TOKENS"):
        settings.LAISER_API_BASE_URL = settings.ENV_TOKENS.get(
            "LAISER_API_BASE_URL", settings.LAISER_API_BASE_URL
        )
        settings.LAISER_API_KEY = settings.ENV_TOKENS.get(
            "LAISER_API_KEY", settings.LAISER_API_KEY
        )
        settings.LAISER_API_TIMEOUT_SECONDS = settings.ENV_TOKENS.get(
            "LAISER_API_TIMEOUT_SECONDS", settings.LAISER_API_TIMEOUT_SECONDS
        )
        settings.LAISER_API_POLL_INTERVAL_SECONDS = settings.ENV_TOKENS.get(
            "LAISER_API_POLL_INTERVAL_SECONDS", settings.LAISER_API_POLL_INTERVAL_SECONDS
        )
