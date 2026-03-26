import {
  useState, useCallback, useEffect, useRef, useMemo,
} from 'react';
import { services } from '@openedx/openedx-ai-extensions-ui';
import {
  BadgeFormData,
  GeneratedBadge,
  BadgeSectionKey,
  BadgeWorkflowAction,
  ProfileConfig,
  BadgeImageResult,
} from '../types/badges';

const POLL_INTERVAL_MS = 5000;

interface UseBadgeGenerationReturn {
  /** Context data prepared for workflow service calls — share with sibling hooks. */
  contextData: ReturnType<typeof services.prepareContextData>;
  /** Whether the initial profile fetch is still in flight. */
  isLoadingProfile: boolean;
  /** Profile config from the backend, or null if none is configured. */
  profileConfig: ProfileConfig | null;
  /** Whether a generation or save request is in flight. */
  isGenerating: boolean;
  /** The current step message during async generation, or null. */
  statusMessage: string | null;
  /** The error message from the last failed request, or null. */
  generationError: string | null;
  /** The AI-generated badge data, or null if not yet generated. */
  generatedBadge: GeneratedBadge | null;
  /** Trigger badge generation with the given form data. */
  handleGenerate: (formData: BadgeFormData, action?: BadgeWorkflowAction) => Promise<void>;
  /** Trigger image generation with optional visual preferences. */
  handleGenerateImage: (imageOptions?: unknown) => Promise<void>;
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
 *
 * Badge generation and regeneration are always async: they dispatch a Celery
 * task via run_async / regenerate_async and then poll get_run_status every
 * POLL_INTERVAL_MS milliseconds until completion or error.
 *
 * On mount, after the profile is fetched, the hook also checks whether an
 * async task is already running (e.g. the user closed and reopened the tab
 * mid-generation) and resumes polling automatically if so.
 */
export const useBadgeGeneration = (
  courseId: string | null,
  uiSlotSelectorId: string | null = 'authoring-resources-ai-badge-creator-modal',
  locationId?: string | null,
): UseBadgeGenerationReturn => {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileConfig, setProfileConfig] = useState<ProfileConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedBadge, setGeneratedBadge] = useState<GeneratedBadge | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingCancelledRef = useRef(false);

  const contextData = useMemo(
    () => services.prepareContextData({ uiSlotSelectorId, courseId, locationId }),
    [courseId, locationId, uiSlotSelectorId],
  );

  const stopPolling = useCallback(() => {
    pollingCancelledRef.current = true;
    if (pollTimeoutRef.current !== null) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  /** Poll get_run_status until the task completes, errors, or times out.
   *  Uses a self-scheduling setTimeout so no two requests are ever in-flight
   *  simultaneously. Responses arriving after stopPolling()/unmount are
   *  discarded via pollingCancelledRef. */
  const startPolling = useCallback(() => {
    stopPolling();
    pollingCancelledRef.current = false;

    const scheduleNext = () => {
      pollTimeoutRef.current = setTimeout(async () => {
        if (pollingCancelledRef.current) { return; }

        try {
          const result = await services.callWorkflowService({
            payload: { action: 'get_run_status', userInput: {} },
            context: contextData,
          });

          if (pollingCancelledRef.current) { return; }

          if (result.status === 'processing') {
            setStatusMessage(result.message ?? 'Processing...');
            scheduleNext();
          } else if (result.status === 'completed') {
            stopPolling();
            setGeneratedBadge(result.response as GeneratedBadge);
            setStatusMessage(null);
            setIsGenerating(false);
          } else {
            // 'error' or 'timeout'
            stopPolling();
            setGenerationError(result.error ?? 'Generation failed');
            setStatusMessage(null);
            setIsGenerating(false);
          }
        } catch (err) {
          if (pollingCancelledRef.current) { return; }
          stopPolling();
          setGenerationError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setStatusMessage(null);
          setIsGenerating(false);
        }
      }, POLL_INTERVAL_MS);
    };

    scheduleNext();
  }, [contextData, stopPolling]);

  // Fetch profile on mount, then check whether a task is already in flight.
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
        if (abortController.signal.aborted) { return; }

        setProfileConfig(config as ProfileConfig | null);

        // After profile loads, check whether a task is already running.
        if (config) {
          try {
            const statusResult = await services.callWorkflowService({
              payload: { action: 'get_run_status', userInput: {} },
              context: contextData,
            });

            if (abortController.signal.aborted) { return; }

            if (statusResult.status === 'processing') {
              setIsGenerating(true);
              setStatusMessage(statusResult.message ?? 'Processing...');
              startPolling();
            } else if (statusResult.status === 'completed' && statusResult.response) {
              setGeneratedBadge(statusResult.response as GeneratedBadge);
            } else if (statusResult.status === 'error' || statusResult.status === 'timeout') {
              setGenerationError(statusResult.error ?? 'Previous generation failed');
            }
            // 'idle' → no task has ever run, stay silent
          } catch {
            // No session yet — that's fine, user hasn't generated anything.
          }
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
    return () => {
      abortController.abort();
      stopPolling();
    };
  }, [contextData, startPolling, stopPolling]);

  /**
   * Dispatch an async workflow action (run_async / regenerate_async) then
   * start polling for the result.
   */
  const callWorkflowAsync = useCallback(
    async (asyncAction: string, userInput: unknown) => {
      setIsGenerating(true);
      setGenerationError(null);
      setStatusMessage(null);

      try {
        const initResult = await services.callWorkflowService({
          payload: { action: asyncAction, userInput },
          context: contextData,
        });

        if (initResult.status !== 'processing') {
          // Unexpected non-processing response — handle explicitly.
          if (initResult.status === 'error' || initResult.status === 'timeout') {
            setGenerationError(initResult.error ?? 'Generation failed');
          } else if (initResult.status === 'completed' && initResult.response) {
            setGeneratedBadge(initResult.response as GeneratedBadge);
          }
          setStatusMessage(null);
          setIsGenerating(false);
          return;
        }

        setStatusMessage(initResult.message ?? 'Processing...');
        startPolling();
      } catch (error: unknown) {
        setGenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setStatusMessage(null);
        setIsGenerating(false);
      }
    },
    [contextData, startPolling],
  );

  /** Generate or regenerate a badge — always dispatched as an async task. */
  const handleGenerate = useCallback(
    (formData: BadgeFormData, action: BadgeWorkflowAction = 'run') => {
      const asyncAction = action === 'regenerate' ? 'regenerate_async' : 'run_async';
      return callWorkflowAsync(asyncAction, formData);
    },
    [callWorkflowAsync],
  );

  /** Generate a badge image using the image generation API. */
  const handleGenerateImage = useCallback(
    async (imageOptions: unknown = {}) => {
      setIsGenerating(true);
      setGenerationError(null);
      setStatusMessage('Generating badge image...');

      try {
        const result = await services.callWorkflowService({
          payload: { action: 'generate_image', userInput: imageOptions },
          context: contextData,
        });

        if (result.status === 'error') {
          setGenerationError(result.error ?? 'Image generation failed');
        } else if (result.status === 'completed' && result.response) {
          // The result contains {base64, config}
          // We update the local state with the new badge image
          const badgeImage = result.response as BadgeImageResult;
          setGeneratedBadge((prev) => (prev ? { ...prev, badgeImage } : prev));
        }
      } catch (error: unknown) {
        setGenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setStatusMessage(null);
        setIsGenerating(false);
      }
    },
    [contextData],
  );

  /** Save an individual section back to the backend — stays synchronous. */
  const handleSave = useCallback(
    async (key: BadgeSectionKey, value: unknown) => {
      const backendKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      try {
        const result = await services.callWorkflowService({
          payload: { action: 'save', userInput: { key: backendKey, value } },
          context: contextData,
        });
        setGeneratedBadge(result.response as GeneratedBadge);
      } catch (error: unknown) {
        setGenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
      }
    },
    [contextData],
  );

  /** Update a badge section locally without hitting the backend. */
  const updateBadgeSection = useCallback(
    (key: BadgeSectionKey, value: unknown) => {
      setGeneratedBadge((prev) => {
        if (!prev) { return prev; }
        if (key === 'achievement') {
          return {
            ...prev,
            generatedResponse: {
              ...prev.generatedResponse,
              credentialSubject: {
                ...prev.generatedResponse?.credentialSubject,
                achievement: value as any,
              },
            },
          };
        }
        if (key === 'skills') {
          return {
            ...prev,
            generatedResponse: {
              ...prev.generatedResponse,
              skills: value as any,
            },
          };
        }
        if (key === 'courseContext') {
          return { ...prev, courseContext: value as any };
        }
        return prev;
      });
    },
    [],
  );

  return {
    contextData,
    isLoadingProfile,
    profileConfig,
    isGenerating,
    statusMessage,
    generationError,
    generatedBadge,
    handleGenerate,
    handleGenerateImage,
    handleSave,
    updateBadgeSection,
  };
};
