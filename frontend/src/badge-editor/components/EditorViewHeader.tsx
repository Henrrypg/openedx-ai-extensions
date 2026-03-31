import { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow, AlertModal, Button, Icon, IconButton,
} from '@openedx/paragon';
import { ArrowBack, Close, DeleteOutline } from '@openedx/paragon/icons';
import messages from '../messages';

interface EditorViewHeaderProps {
  badgeTitle: string;
  isNewBadge: boolean;
  isBadgeReady: boolean;
  isAlreadyPublished: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDeleteDraft: () => void;
  onSaveDraft: () => void;
  onSavePublish: () => void;
}

type PendingAction = 'draft' | 'published' | null;

const EditorViewHeader = ({
  badgeTitle,
  isNewBadge,
  isBadgeReady,
  isAlreadyPublished,
  hasUnsavedChanges,
  isSaving,
  onBack,
  onDeleteDraft,
  onSaveDraft,
  onSavePublish,
}: EditorViewHeaderProps) => {
  const intl = useIntl();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const title = badgeTitle || intl.formatMessage(messages['openedx.ai.badges.editor.header.untitled']);

  const handleSaveDraft = () => {
    if (isAlreadyPublished) {
      setPendingAction('draft');
    } else {
      onSaveDraft();
    }
  };

  const handleSavePublish = () => {
    if (isAlreadyPublished) {
      setPendingAction('published');
    } else {
      onSavePublish();
    }
  };

  const handleConfirm = () => {
    if (pendingAction === 'draft') { onSaveDraft(); }
    if (pendingAction === 'published') { onSavePublish(); }
    setPendingAction(null);
  };

  const modalTitle = pendingAction === 'published'
    ? intl.formatMessage(messages['openedx.ai.badges.editor.confirm.publish.title'])
    : intl.formatMessage(messages['openedx.ai.badges.editor.confirm.draft.title']);

  const modalBody = pendingAction === 'published'
    ? intl.formatMessage(messages['openedx.ai.badges.editor.confirm.publish.body'])
    : intl.formatMessage(messages['openedx.ai.badges.editor.confirm.draft.body']);

  return (
    <>
      <ActionRow>
        <Button
          variant="tertiary"
          iconBefore={ArrowBack}
          onClick={onBack}
        >
          {intl.formatMessage(messages['openedx.ai.badges.editor.header.back'])}
        </Button>
        <span className="border-left pl-3 font-weight-bold">{title}</span>
        <ActionRow.Spacer />
        {!isNewBadge && (
          <Button
            variant="outline-danger"
            iconBefore={DeleteOutline}
            onClick={onDeleteDraft}
            disabled={isSaving}
          >
            {intl.formatMessage(messages['openedx.ai.badges.editor.header.delete'])}
          </Button>
        )}
        {isBadgeReady && (
          <>
            <Button
              variant="outline-primary"
              onClick={handleSaveDraft}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {intl.formatMessage(messages['openedx.ai.badges.editor.header.saveDraft'])}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePublish}
              disabled={isSaving}
            >
              {intl.formatMessage(messages['openedx.ai.badges.editor.header.savePublish'])}
            </Button>
          </>
        )}
        <IconButton
          src={Close}
          iconAs={Icon}
          onClick={onBack}
          disabled={isSaving}
          alt={intl.formatMessage(messages['openedx.ai.badges.editor.header.back'])}
        />
      </ActionRow>

      <AlertModal
        title={modalTitle}
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        footerNode={(
          <ActionRow>
            <Button variant="tertiary" onClick={() => setPendingAction(null)}>
              {intl.formatMessage(messages['openedx.ai.badges.editor.confirm.cancel'])}
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              {intl.formatMessage(messages['openedx.ai.badges.editor.confirm.continue'])}
            </Button>
          </ActionRow>
        )}
      >
        <p>{modalBody}</p>
      </AlertModal>
    </>
  );
};

export default EditorViewHeader;
