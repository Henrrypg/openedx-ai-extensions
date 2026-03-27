import { useCallback, useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button, Container, DataTable, CardView, TextFilter, Spinner,
} from '@openedx/paragon';
import { Add } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { useListBadges } from './data/apiHooks';
import EmptyStateView from './EmptyStateView';
import BadgeCard from './BadgeCard';
import messages from './messages';
import { GeneratedBadge } from '../types/badges';

const Bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

interface GalleryViewProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  onCreateNew: () => void;
  onEdit: (badge: GeneratedBadge) => void;
  customMessage?: string;
}

const CreateBadgeAction = ({ onCreateNew }: { onCreateNew: () => void }) => {
  const intl = useIntl();
  return (
    <Button variant="primary" iconBefore={Add} onClick={onCreateNew}>
      {intl.formatMessage(messages['openedx.ai.badges.button.create'])}
    </Button>
  );
};

const GalleryView = ({
  contextData, onCreateNew, onEdit, customMessage,
}: GalleryViewProps) => {
  const intl = useIntl();
  const { data: badges = [], isLoading } = useListBadges(contextData);
  const columns = useMemo(() => [
    {
      id: 'name',
      Header: intl.formatMessage(messages['openedx.ai.badges.gallery.column.name']),
      accessor: (row: GeneratedBadge) => row.generatedResponse?.credentialSubject?.achievement?.name ?? '',
    },
  ], [intl]);

  const CardWithEdit = useCallback(
    (props: { className?: string; original: GeneratedBadge }) => (
      <BadgeCard {...props} onEdit={onEdit} />
    ),
    [onEdit],
  );

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" screenReaderText={intl.formatMessage(messages['openedx.ai.badges.gallery.loading'])} />
      </Container>
    );
  }

  if (badges.length === 0) {
    return <EmptyStateView onCreateNew={onCreateNew} customMessage={customMessage} />;
  }

  return (
    <Container className="py-4">
      <p>
        {intl.formatMessage(messages['openedx-ai-badges.tab.description'], { bold: Bold })}
      </p>
      {customMessage && <p><small>{customMessage}</small></p>}
      <h2 className="mb-4">{intl.formatMessage(messages['openedx.ai.badges.gallery.title'])}</h2>
      <DataTable
        isFilterable
        defaultColumnValues={{ Filter: TextFilter }}
        itemCount={badges.length}
        data={badges}
        columns={columns}
        tableActions={[
          <CreateBadgeAction onCreateNew={onCreateNew} />,
        ]}
      >
        <DataTable.TableControlBar />
        <CardView
          CardComponent={CardWithEdit}
          columnSizes={{
            xs: 12, md: 6, lg: 6, xl: 4,
          }}
        />
        <DataTable.EmptyTable
          content={intl.formatMessage(messages['openedx.ai.badges.gallery.no.results'])}
        />
        <DataTable.TableFooter />
      </DataTable>
    </Container>
  );
};

export default GalleryView;
