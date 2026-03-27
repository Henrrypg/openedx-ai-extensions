import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Collapsible, Icon, IconButton, Spinner,
} from '@openedx/paragon';
import { Refresh } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { ApiService, ApiServiceStatus } from '../../types/badges';
import { useApiStatus } from '../data/apiHooks';
import messages from '../../messages';

interface ApiStatusPanelProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  enabled?: boolean;
}

const STATUS_COLORS: Record<ApiServiceStatus, string> = {
  online: 'success',
  unavailable: 'danger',
  not_configured: 'gray',
  starting: 'warning',
};

const SERVICE_LABELS: Record<string, string> = {
  badge_api: 'openedx-ai-badges.api-status.service.badge-api',
  ollama: 'openedx-ai-badges.api-status.service.ollama',
  image_api: 'openedx-ai-badges.api-status.service.image-api',
  // laiser_api: 'openedx-ai-badges.api-status.service.laiser-api', // planned for future PR
};

const STATUS_LABELS: Record<ApiServiceStatus, string> = {
  online: 'openedx-ai-badges.api-status.online',
  unavailable: 'openedx-ai-badges.api-status.unavailable',
  not_configured: 'openedx-ai-badges.api-status.not-configured',
  starting: 'openedx-ai-badges.api-status.starting',
};

const Semaphore = ({ serviceMap }: { serviceMap: Record<string, ApiService> | null }) => {
  if (!serviceMap) { return null; }
  const allRequiredOnline = Object.values(serviceMap)
    .filter((s) => s.required)
    .every((s) => s.status === 'online');
  return (
    <span
      aria-hidden="true"
      className={`pgn__bubble ${allRequiredOnline ? 'pgn__bubble-success' : 'pgn__bubble-warning'}`}
    />
  );
};

const ApiStatusPanel = ({ contextData, enabled = true }: ApiStatusPanelProps) => {
  const intl = useIntl();
  const {
    services: serviceMap, isLoading, error, refresh,
  } = useApiStatus(contextData, enabled);

  const hasRequiredDown = serviceMap !== null
    && Object.values(serviceMap).some((s) => s.required && s.status === 'unavailable');

  const entries = serviceMap ? Object.entries(serviceMap) : [];

  return (
    <div className="api-status-panel mt-3 border rounded bg-white">
      <Collapsible.Advanced>
        <div className="d-flex align-items-center justify-content-between px-3 py-2">
          <Collapsible.Trigger
            className="d-flex align-items-center flex-grow-1 border-0 bg-transparent p-0 text-left badge-status__trigger"
          >
            <Semaphore serviceMap={serviceMap} />
            <strong className="small text-uppercase text-muted">
              {intl.formatMessage(messages['openedx-ai-badges.api-status.title'])}
            </strong>
          </Collapsible.Trigger>
          <div className="d-flex align-items-center badge-status__actions">
            {isLoading && (
              <Spinner
                animation="border"
                size="sm"
                variant="primary"
                screenReaderText="Loading"
              />
            )}
            {/* eslint-disable-next-line
                jsx-a11y/click-events-have-key-events,
                jsx-a11y/no-static-element-interactions */}
            <span onClick={(e) => e.stopPropagation()}>
              <IconButton
                src={Refresh}
                iconAs={Icon}
                alt={intl.formatMessage(messages['openedx-ai-badges.api-status.refresh'])}
                onClick={() => refresh()}
                size="sm"
                variant="primary"
              />
            </span>
          </div>
        </div>

        <Collapsible.Body className="px-3 pb-3">
          <ul className="list-unstyled mb-0">
            {entries.map(([name, service]) => {
              const labelKey = SERVICE_LABELS[name] as keyof typeof messages;
              const statusKey = STATUS_LABELS[service.status] as keyof typeof messages;
              const colorClass = STATUS_COLORS[service.status];
              return (
                <li key={name} className="d-flex align-items-center justify-content-between py-1 small">
                  <div className="d-flex align-items-center">
                    <span className={`mr-2 pgn__bubble bg-${colorClass}`} aria-hidden="true" />
                    <span>{labelKey ? intl.formatMessage(messages[labelKey]) : name}</span>
                  </div>
                  <span className={`text-${colorClass}`}>
                    {statusKey ? intl.formatMessage(messages[statusKey]) : service.status}
                  </span>
                </li>
              );
            })}
          </ul>

          {error && (
            <Alert variant="danger" className="mt-2 mb-0 py-2 small">
              {`${intl.formatMessage(messages['openedx-ai-badges.api-status.fetch-error'])} ${error}`}
            </Alert>
          )}
          {!error && hasRequiredDown && (
            <Alert variant="danger" className="mt-2 mb-0 py-2 small">
              {intl.formatMessage(messages['openedx-ai-badges.api-status.services-offline'])}
            </Alert>
          )}
        </Collapsible.Body>
      </Collapsible.Advanced>
    </div>
  );
};

export default ApiStatusPanel;
