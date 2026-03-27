import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Container, Spinner, Alert } from '@openedx/paragon';
import { useQueryClient } from '@tanstack/react-query';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { useProfileConfig } from './data/apiHooks';
import { GalleryView } from './badge-list';
import { queryKey as badgesListKey } from './badge-list/data/apiHooks';
import { EditorView } from './badge-editor';
import type { GeneratedBadge } from './types/badges';
import messages from './messages';

import './AIBadgesTab.scss';

type ActiveView = 'gallery' | 'editor';

interface AIBadgesTabProps {
  uiSlotSelectorId: string | null;
  courseId: string | null;
  locationId?: string | null;
}
const AIBadgesTab = ({
  uiSlotSelectorId = 'authoring-resources-ai-badge-creator-modal',
  courseId,
  locationId,
}: AIBadgesTabProps) => {
  const intl = useIntl();
  const [activeView, setActiveView] = useState<ActiveView>('gallery');
  const [selectedBadge, setSelectedBadge] = useState<GeneratedBadge | null>(null);

  const contextData = useMemo(
    () => services.prepareContextData({ uiSlotSelectorId, courseId, locationId }),
    [courseId, locationId, uiSlotSelectorId],
  );

  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: badgesListKey.all, exact: false });
  }, [queryClient]);

  const { data: profileConfig, isLoading: isLoadingProfile } = useProfileConfig(contextData);
  const customMessage = (profileConfig as any)?.request?.config?.customMessage as string | undefined;
  const onCreateNew = useCallback(() => {
    setSelectedBadge(null);
    setActiveView('editor');
  }, []);

  const onEdit = useCallback((badge: GeneratedBadge) => {
    setSelectedBadge(badge);
    setActiveView('editor');
  }, []);

  const onBack = useCallback(() => {
    setActiveView('gallery');
    setSelectedBadge(null);
  }, []);

  const onSaveComplete = useCallback(() => {
    setActiveView('gallery');
    setSelectedBadge(null);
  }, []);

  if (isLoadingProfile) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5">
        <Spinner
          animation="border"
          variant="primary"
          screenReaderText={intl.formatMessage(messages['openedx-ai-badges.profile.loading'])}
        />
      </div>
    );
  }

  if (!profileConfig) {
    return (
      <div className="p-4">
        <Alert variant="info">
          {intl.formatMessage(messages['openedx-ai-badges.profile.no-config'])}
        </Alert>
      </div>
    );
  }

  return (
    <Container fluid className="ai-badges-tab">
      {activeView === 'gallery' && (
        <GalleryView
          contextData={contextData}
          onCreateNew={onCreateNew}
          onEdit={onEdit}
          customMessage={customMessage}
        />
      )}
      {activeView === 'editor' && (
        <EditorView
          key={(selectedBadge as any)?.id ?? 'new'}
          badge={selectedBadge}
          contextData={contextData}
          onBack={onBack}
          onSaveComplete={onSaveComplete}
        />
      )}
    </Container>
  );
};

export default AIBadgesTab;
