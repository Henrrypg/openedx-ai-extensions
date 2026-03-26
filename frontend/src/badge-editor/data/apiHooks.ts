import { useMutation, useQueryClient } from '@tanstack/react-query';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { BadgeStatus, GeneratedBadge } from '../../types/badges';
import { saveBadge, deleteDraft } from './api';
import { pluginId } from '../../contants';

export const useBadgeSave = (
  contextData: ReturnType<typeof services.prepareContextData>,
) => {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: ({ badge, status }: { badge: GeneratedBadge; status: BadgeStatus }) => saveBadge(contextData, badge, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [pluginId, 'badges-list'] });
    },
  });

  const remove = useMutation({
    mutationFn: (badgeId: string) => deleteDraft(contextData, badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [pluginId, 'badges-list'] });
    },
  });

  return { save, remove };
};
