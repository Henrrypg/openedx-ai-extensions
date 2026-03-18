import {
  useState, useCallback, useEffect, useMemo,
} from 'react';
import { services } from '@openedx/openedx-ai-extensions-ui';
import {
  BadgeFormData,
  GeneratedBadge,
  BadgeSectionKey,
  BadgeWorkflowAction,
  ProfileConfig,
} from '../types/badges';

interface UseBadgeGenerationReturn {
  /** Whether the initial profile fetch is still in flight. */
  isLoadingProfile: boolean;
  /** Profile config from the backend, or null if none is configured. */
  profileConfig: ProfileConfig | null;
  /** Whether a generation or save request is in flight. */
  isGenerating: boolean;
  /** The error message from the last failed request, or null. */
  generationError: string | null;
  /** The AI-generated badge data, or null if not yet generated. */
  generatedBadge: GeneratedBadge | null;
  /** Trigger badge generation with the given form data. */
  handleGenerate: (formData: BadgeFormData, action?: BadgeWorkflowAction) => Promise<void>;
  /** Save an individual section of the generated badge. */
  handleSave: (key: BadgeSectionKey, value: unknown) => Promise<void>;
  /** Locally update a badge section (e.g. from textarea edits). */
  updateBadgeSection: (key: BadgeSectionKey, value: unknown) => void;
}

/**
 * Custom hook that encapsulates all badge generation and saving logic.
 *
 * On mount it fetches the workflow profile for the given course/location to
 * determine whether a badge workflow is configured and to retrieve any
 * actuator_config UIComponents settings (customMessage, buttonText, …).
 */
export const useBadgeGeneration = (
  courseId: string | null,
  uiSlotSelectorId: string | null = 'authoring-resources-ai-badge-creator-modal',
  locationId?: string | null,
): UseBadgeGenerationReturn => {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileConfig, setProfileConfig] = useState<ProfileConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<any>(null);
  const [generatedBadge, setGeneratedBadge] = useState<GeneratedBadge | null>(null);

  const contextData = useMemo(
    () => services.prepareContextData({ uiSlotSelectorId, courseId, locationId }),
    [courseId, locationId, uiSlotSelectorId],
  );

  useEffect(() => {
    const abortController = new AbortController();

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const config = await services.fetchConfiguration({
          contextData,
          configEndpoint: services.getDefaultEndpoint('profile'),
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setProfileConfig(config as ProfileConfig | null);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          setProfileConfig(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();
    return () => abortController.abort();
  }, [contextData]);

  /**
   * Internal helper — calls the workflow service and updates state.
   */
  const callWorkflow = useCallback(
    async (action: string, userInput: unknown) => {
      setIsGenerating(true);
      setGenerationError(null);

      try {
        const result = await services.callWorkflowService({
          payload: { action, userInput },
          context: contextData,
        });

        setGeneratedBadge(result.response as GeneratedBadge);
      } catch (error: unknown) {
        setGenerationError(error);
      } finally {
        setIsGenerating(false);
      }
    },
    [contextData],
  );

  /** Generate a new badge using the form data. */
  const handleGenerate = useCallback(
    (formData: BadgeFormData, action: BadgeWorkflowAction = 'run') => callWorkflow(action, formData),
    [callWorkflow],
  );

  /** Save an individual section back to the backend. */
  const handleSave = useCallback(
    (key: BadgeSectionKey, value: unknown) => {
      // Backend expects snake_case keys
      const backendKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return callWorkflow('save', { key: backendKey, value });
    },
    [callWorkflow],
  );

  /** Update a badge section locally without hitting the backend. */
  const updateBadgeSection = useCallback(
    (key: BadgeSectionKey, value: unknown) => {
      setGeneratedBadge((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  return {
    isLoadingProfile,
    profileConfig,
    isGenerating,
    generationError,
    generatedBadge,
    handleGenerate,
    handleSave,
    updateBadgeSection,
  };
};
