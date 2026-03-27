import { services } from '@openedx/openedx-ai-extensions-ui';
import {
  ApiService, ApiStatusResult, BadgeFormData, BadgeStatus, BadgeWorkflowAction, GeneratedBadge,
} from '../../types/badges';

export const saveBadge = async (
  contextData: ReturnType<typeof services.prepareContextData>,
  badge: GeneratedBadge,
  status: BadgeStatus,
): Promise<GeneratedBadge> => {
  const userInput: Record<string, unknown> = {
    badge_id: (badge as any).id,
    status,
    course_context: badge.courseContext ?? {},
    generated_response: badge.generatedResponse ?? {},
  };
  if (badge.badgeImage) {
    userInput.badge_image = badge.badgeImage;
  }
  const result = await services.callWorkflowService({
    payload: { action: 'save_badge', userInput },
    context: contextData,
  });
  return result.response as GeneratedBadge;
};

export const getApiStatus = async (
  contextData: ReturnType<typeof services.prepareContextData>,
): Promise<Record<string, ApiService>> => {
  const result = await services.callWorkflowService({
    payload: { action: 'get_api_status', userInput: {} },
    context: contextData,
  }) as ApiStatusResult;
  return result.services ?? {};
};

export const generateBadge = async (
  contextData: ReturnType<typeof services.prepareContextData>,
  formData: BadgeFormData,
  action: BadgeWorkflowAction = 'run',
): Promise<{ status: string; message?: string; error?: string }> => {
  const asyncAction = action === 'regenerate' ? 'regenerate_async' : 'run_async';
  const result = await services.callWorkflowService({
    payload: { action: asyncAction, userInput: formData },
    context: contextData,
  });
  return result as { status: string; message?: string; error?: string };
};

export const getRunStatus = async (
  contextData: ReturnType<typeof services.prepareContextData>,
): Promise<{ status: string; response?: GeneratedBadge; message?: string; error?: string }> => {
  const result = await services.callWorkflowService({
    payload: { action: 'get_run_status', userInput: {} },
    context: contextData,
  });
  return result as { status: string; response?: GeneratedBadge; message?: string; error?: string };
};

export const generateImageAsync = async (
  contextData: ReturnType<typeof services.prepareContextData>,
  inputData: Record<string, unknown>,
): Promise<{ status: string; message?: string }> => {
  const result = await services.callWorkflowService({
    payload: { action: 'generate_image_async', userInput: inputData },
    context: contextData,
  });
  return result as { status: string; message?: string };
};

export const getImageStatus = async (
  contextData: ReturnType<typeof services.prepareContextData>,
): Promise<{ status: string; response?: {
  base64: string; config:
  Record<string, unknown>
}; message?: string; error?: string }> => {
  const result = await services.callWorkflowService({
    payload: { action: 'get_image_status', userInput: {} },
    context: contextData,
  });
  return result as { status: string; response?: {
    base64: string;
    config: Record<string, unknown>
  }; message?: string; error?: string };
};

export const deleteDraft = async (
  contextData: ReturnType<typeof services.prepareContextData>,
  badgeId: string,
): Promise<void> => {
  await services.callWorkflowService({
    payload: { action: 'delete_draft', userInput: { badge_id: badgeId } },
    context: contextData,
  });
};
