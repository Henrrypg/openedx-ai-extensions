"""
Test configuration and shared fixtures.

Stubs out optional heavy dependencies (openedx_ai_extensions) so that
processor tests can run in environments where the full platform is not
installed.
"""
import sys
from types import ModuleType


def _stub_openedx_ai_extensions():
    """Register a minimal stub for openedx_ai_extensions if not installed."""
    if "openedx_ai_extensions" in sys.modules:
        return

    root = ModuleType("openedx_ai_extensions")
    processors = ModuleType("openedx_ai_extensions.processors")
    workflows = ModuleType("openedx_ai_extensions.workflows")
    orchestrators = ModuleType("openedx_ai_extensions.workflows.orchestrators")
    session_based = ModuleType(
        "openedx_ai_extensions.workflows.orchestrators.session_based_orchestrator"
    )

    class OpenEdXProcessor:  # pylint: disable=too-few-public-methods
        """Minimal test stub."""

        def __init__(self, *args, **kwargs):
            del args, kwargs

        def process(self):
            return {}

    class LLMProcessor:  # pylint: disable=too-few-public-methods
        """Minimal test stub."""

        def __init__(self, *args, **kwargs):
            del args, kwargs

        def process(self, *args, **kwargs):
            del args, kwargs
            return {}

    class SessionBasedOrchestrator:  # pylint: disable=too-few-public-methods
        """Minimal test stub."""

    def execute_orchestrator_async_stub(*args, **kwargs):
        del args, kwargs
        raise NotImplementedError

    processors.OpenEdXProcessor = OpenEdXProcessor
    processors.LLMProcessor = LLMProcessor
    session_based.SessionBasedOrchestrator = SessionBasedOrchestrator
    session_based._execute_orchestrator_async = execute_orchestrator_async_stub  # pylint: disable=protected-access

    sys.modules["openedx_ai_extensions"] = root
    sys.modules["openedx_ai_extensions.processors"] = processors
    sys.modules["openedx_ai_extensions.workflows"] = workflows
    sys.modules["openedx_ai_extensions.workflows.orchestrators"] = orchestrators
    sys.modules[
        "openedx_ai_extensions.workflows.orchestrators.session_based_orchestrator"
    ] = session_based


_stub_openedx_ai_extensions()
