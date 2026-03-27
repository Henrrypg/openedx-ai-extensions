import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ActionRow, Button,
} from '@openedx/paragon';
import { ArrowBack, DeleteOutline } from '@openedx/paragon/icons';
import messages from '../messages';

interface EditorViewHeaderProps {
  badgeTitle: string;
  isNewBadge: boolean;
  isBadgeReady: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDeleteDraft: () => void;
  onSaveDraft: () => void;
  onSavePublish: () => void;
}

const EditorViewHeader = ({
  badgeTitle,
  isNewBadge,
  isBadgeReady,
  hasUnsavedChanges,
  isSaving,
  onBack,
  onDeleteDraft,
  onSaveDraft,
  onSavePublish,
}: EditorViewHeaderProps) => {
  const intl = useIntl();
  const title = badgeTitle || intl.formatMessage(messages['openedx.ai.badges.editor.header.untitled']);

  return (
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
            onClick={onSaveDraft}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {intl.formatMessage(messages['openedx.ai.badges.editor.header.saveDraft'])}
          </Button>
          <Button
            variant="primary"
            onClick={onSavePublish}
            disabled={isSaving}
          >
            {intl.formatMessage(messages['openedx.ai.badges.editor.header.savePublish'])}
          </Button>
        </>
      )}
    </ActionRow>
  );
};

export default EditorViewHeader;
