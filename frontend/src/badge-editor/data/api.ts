import { services } from '@openedx/openedx-ai-extensions-ui';
import { BadgeStatus, GeneratedBadge } from '../../types/badges';

export const saveBadge = async (
  contextData: ReturnType<typeof services.prepareContextData>,
  badge: GeneratedBadge,
  status: BadgeStatus,
): Promise<GeneratedBadge> => {
  const result = await services.callWorkflowService({
    payload: { action: 'save_badge', userInput: { badge, status } },
    context: contextData,
  });
  return result.response as GeneratedBadge;
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
