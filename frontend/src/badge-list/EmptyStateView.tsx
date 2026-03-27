import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Container, Icon } from '@openedx/paragon';
import { WorkspacePremium } from '@openedx/paragon/icons';
import messages from './messages';

/** Renders bold text for internationalized messages. */
const Bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
const Br = () => <br />;

interface EmptyStateViewProps {
  onCreateNew: () => void;
  customMessage?: string;
}

const EmptyStateView = ({ onCreateNew, customMessage }: EmptyStateViewProps) => {
  const intl = useIntl();
  return (
    <Container size="md" className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-center">
      <div className="bg-light-200 rounded-circle p-4 mb-3">
        <Icon
          size="inline"
          src={WorkspacePremium}
          className="display-1 text-primary"
          aria-hidden="true"
        />
      </div>
      <h2 className="mt-4">
        {intl.formatMessage(messages['openedx.ai.badges.empty.state.headline'])}
      </h2>
      <p className="text-center mb-5">
        {intl.formatMessage(messages['openedx-ai-badges.tab.description'], { bold: Bold, br: Br })}
      </p>
      {customMessage && (
        <p className="text-center small mb-5"><small>{customMessage}</small></p>
      )}
      <Button variant="primary" onClick={onCreateNew}>
        {intl.formatMessage(messages['openedx.ai.badges.button.create'])}
      </Button>
    </Container>
  );
};

export default EmptyStateView;
