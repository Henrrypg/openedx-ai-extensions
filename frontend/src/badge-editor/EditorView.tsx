import { useCallback, useEffect, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Container, Row, Col, Alert,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge, BadgeImageResult, BadgeStatus } from '../types/badges';
import { useBadgeSave } from './data/apiHooks';
import messages from './messages';
import EditorViewHeader from './components/EditorViewHeader';
import EditorPanel from './EditorPanel';
import PreviewPanel from './PreviewPanel';

export interface EditorViewProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  badge?: GeneratedBadge | null;
  onBack: () => void;
  onSaveComplete: () => void;
}

const EditorView = ({
  badge, contextData, onBack, onSaveComplete,
}: EditorViewProps) => {
  const intl = useIntl();
  const isNewBadge = !badge;
  const [editedBadge, setEditedBadge] = useState<GeneratedBadge | null>(null);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<BadgeImageResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { save, remove } = useBadgeSave(contextData);

  useEffect(() => {
    if (save.error) {
      const detail = save.error instanceof Error ? ` ${save.error.message}` : '';
      setActionError(`${intl.formatMessage(messages['openedx.ai.badges.editor.error.save'])}${detail}`);
    }
  }, [save.error, intl]);

  useEffect(() => {
    if (remove.error) {
      const detail = remove.error instanceof Error ? ` ${remove.error.message}` : '';
      setActionError(`${intl.formatMessage(messages['openedx.ai.badges.editor.error.delete'])}${detail}`);
    }
  }, [remove.error, intl]);

  const currentBadge = editedBadge ?? badge ?? null;
  const showEditForm = !!currentBadge;
  const badgeTitle = currentBadge?.generatedResponse?.credentialSubject?.achievement?.name ?? '';

  const handleBadgeGenerated = useCallback((generated: GeneratedBadge) => {
    setEditedBadge(generated);
  }, []);

  const handleBadgeChange = useCallback((updated: GeneratedBadge) => {
    setEditedBadge(updated);
  }, []);

  const handleSave = (status: BadgeStatus) => {
    if (!currentBadge) { return; }
    setActionError(null);
    const badgeToSave = lastGeneratedImage
      ? { ...currentBadge, badgeImage: lastGeneratedImage }
      : currentBadge;
    save.mutate({ badge: badgeToSave, status }, { onSuccess: onSaveComplete });
  };

  const handleDeleteDraft = () => {
    const badgeId = currentBadge?.id as string | undefined;
    if (!badgeId) { return; }
    setActionError(null);
    remove.mutate(badgeId, { onSuccess: onSaveComplete });
  };

  return (
    <Container fluid className="py-3">
      <EditorViewHeader
        badgeTitle={badgeTitle}
        isNewBadge={isNewBadge}
        isBadgeReady={!!currentBadge}
        hasUnsavedChanges={!!editedBadge || !!lastGeneratedImage}
        isSaving={save.isLoading || remove.isLoading}
        onBack={onBack}
        onDeleteDraft={handleDeleteDraft}
        onSaveDraft={() => handleSave('draft')}
        onSavePublish={() => handleSave('published')}
      />
      {actionError && (
        <Alert
          variant="danger"
          dismissible
          icon={InfoOutline}
          onClose={() => setActionError(null)}
          className="mt-3"
        >
          {actionError}
        </Alert>
      )}
      <Row className="mt-4">
        <Col lg={4}>
          <PreviewPanel
            contextData={contextData}
            badge={currentBadge}
            versions={currentBadge?.versions}
            onImageGenerated={setLastGeneratedImage}
            onError={setActionError}
          />
        </Col>
        <Col lg={8}>
          {showEditForm ? (
            <EditorPanel
              mode="edit"
              badge={currentBadge}
              contextData={contextData}
              onBadgeChange={handleBadgeChange}
              onError={setActionError}
            />
          ) : (
            <EditorPanel
              mode="create"
              contextData={contextData}
              onBadgeGenerated={handleBadgeGenerated}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default EditorView;
