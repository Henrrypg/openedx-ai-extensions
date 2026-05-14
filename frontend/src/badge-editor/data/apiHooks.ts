import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@openedx/openedx-ai-extensions-ui';
import {
  ApiService, BadgeFormData, BadgeStatus, BadgeWorkflowAction, GeneratedBadge,
} from '../../types/badges';
import {
  generateBadge, getRunStatus, getApiStatus, saveBadge, deleteDraft,
  generateImageAsync, getImageStatus,
} from './api';
import { pluginId } from '../../contants';
import { queryKey as badgesListKey } from '../../badge-list';

const API_STATUS_POLL_MS = 60_000;
const RUN_STATUS_POLL_MS = 5_000;
const IMAGE_STATUS_POLL_MS = 5_000;

const queryKeys = {
  all: [pluginId, 'badges'],
  runStatus: (contextData) => [...queryKeys.all, 'run-status', contextData],
  imageStatus: (contextData) => [...queryKeys.all, 'image-status', contextData],
  apiStatus: (contextData) => [...queryKeys.all, 'api-status', contextData],
};

export const useApiStatus = (
  contextData: ReturnType<typeof services.prepareContextData>,
  enabled = true,
) => {
  const query = useQuery<Record<string, ApiService>>({
    queryKey: queryKeys.apiStatus(contextData),
    queryFn: () => getApiStatus(contextData),
    enabled,
    retry: 2,
    refetchInterval: (firstArg, secondArg?) => {
      const q = secondArg ?? firstArg;
      return q?.state?.status === 'error' ? false : API_STATUS_POLL_MS;
    },
  });

  const isServicesReady = !query.data
    || !Object.values(query.data).some((s) => s.required && s.status === 'unavailable');

  const error = query.error instanceof Error ? query.error.message : null;

  return {
    services: query.data ?? null,
    isLoading: query.isFetching,
    isServicesReady,
    error,
    refresh: query.refetch,
  };
};

export const useBadgeGenerate = (
  contextData: ReturnType<typeof services.prepareContextData>,
) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ formData, action = 'run' }: { formData: BadgeFormData; action?: BadgeWorkflowAction }) => generateBadge(contextData, formData, action),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.runStatus(contextData) });
    },
  });

  const polling = useQuery({
    queryKey: queryKeys.runStatus(contextData),
    queryFn: () => getRunStatus(contextData),
    enabled: mutation.isSuccess && mutation.data?.status === 'processing',
    refetchInterval: (firstArg, secondArg?) => {
      const q = secondArg ?? firstArg;
      if (q?.state?.status === 'error') { return false; }
      if (!q?.state?.data || q.state.data.status === 'processing') { return RUN_STATUS_POLL_MS; }
      return false;
    },
  });

  const isGenerating = ((mutation as any).isPending ?? (mutation as any).isLoading ?? false) || polling.data?.status === 'processing';
  let generatedBadge: GeneratedBadge | null = null;
  if (polling.data?.status === 'completed') {
    generatedBadge = polling.data.response ?? null;
  }

  let statusMessage: string | null = null;
  if (polling.data?.message) {
    statusMessage = polling.data.message;
  } else if (mutation.isSuccess) {
    statusMessage = mutation.data?.message ?? null;
  }

  let generationError: string | null = null;
  if (mutation.error instanceof Error) {
    generationError = mutation.error.message;
  } else if (polling.data?.status === 'error') {
    generationError = polling.data.error ?? 'Generation failed';
  }

  useEffect(() => {
    if (!generatedBadge) { return; }
    const badgeId = (generatedBadge as any).id;
    queryClient.setQueryData(
      badgesListKey.list(contextData),
      (old: GeneratedBadge[] | undefined) => {
        const list = old ?? [];
        if (badgeId && list.some((b: any) => b.id === badgeId)) { return list; }
        return [...list, generatedBadge];
      },
    );
  }, [generatedBadge, queryClient, contextData]);

  return {
    generate: mutation.mutate,
    isGenerating,
    statusMessage,
    generationError,
    generatedBadge,
  };
};

export const useImageGenerate = (
  contextData: ReturnType<typeof services.prepareContextData>,
) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (inputData: Record<string, unknown>) => generateImageAsync(contextData, inputData),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.imageStatus(contextData) });
    },
  });

  const polling = useQuery({
    queryKey: queryKeys.imageStatus(contextData),
    queryFn: () => getImageStatus(contextData),
    enabled: mutation.isSuccess && mutation.data?.status === 'processing',
    refetchInterval: (data) => {
      if (!data || data.status === 'processing') { return IMAGE_STATUS_POLL_MS; }
      return false;
    },
  });

  const isGeneratingImage = ((mutation as any).isPending ?? (mutation as any).isLoading ?? false) || polling.data?.status === 'processing';
  const generatedImage = polling.data?.status === 'completed' ? polling.data.response ?? null : null;
  const imageStatusMessage = polling.data?.message ?? (isGeneratingImage ? (mutation.data?.message ?? null) : null);
  const imageError = polling.data?.status === 'error' ? polling.data.error ?? 'Image generation failed' : null;

  return {
    generateImage: mutation.mutate,
    isGeneratingImage,
    imageStatusMessage,
    imageError,
    generatedImage,
  };
};

export const useBadgeSave = (
  contextData: ReturnType<typeof services.prepareContextData>,
) => {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: ({ badge, status }: {
      badge: GeneratedBadge;
      status: BadgeStatus
    }) => saveBadge(contextData, badge, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgesListKey.list(contextData) });
    },
  });

  const remove = useMutation({
    mutationFn: (badgeId: string) => deleteDraft(contextData, badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgesListKey.list(contextData) });
    },
  });

  return { save, remove };
};
