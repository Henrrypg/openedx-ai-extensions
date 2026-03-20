import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Collapsible, Icon, IconButton, Spinner,
} from '@openedx/paragon';
import { Refresh } from '@openedx/paragon/icons';
import { ApiService, ApiServiceStatus } from '../../types/badges';
import messages from '../../messages';

interface ApiStatusPanelProps {
  services: Record<string, ApiService> | null;
  isLoading: boolean;
  refresh: () => void;
  /** Optional per-service action elements, keyed by service name. */
  actions?: Record<string, React.ReactNode>;
}

const STATUS_COLORS: Record<ApiServiceStatus, string> = {
  online: 'text-success',
  unavailable: 'text-danger',
  not_configured: 'text-muted',
};

const SERVICE_LABELS: Record<string, string> = {
  badge_api: 'openedx-ai-badges.api-status.service.badge-api',
  ollama: 'openedx-ai-badges.api-status.service.ollama',
  image_api: 'openedx-ai-badges.api-status.service.image-api',
  laiser_api: 'openedx-ai-badges.api-status.service.laiser-api',
};

const STATUS_LABELS: Record<ApiServiceStatus, string> = {
  online: 'openedx-ai-badges.api-status.online',
  unavailable: 'openedx-ai-badges.api-status.unavailable',
  not_configured: 'openedx-ai-badges.api-status.not-configured',
};

/** Semaphore dot: green when all required services are online, yellow otherwise. */
const Semaphore = ({ serviceMap }: { serviceMap: Record<string, ApiService> | null }) => {
  if (!serviceMap) { return null; }
  const allRequiredOnline = Object.values(serviceMap)
    .filter((s) => s.required)
    .every((s) => s.status === 'online');
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: allRequiredOnline ? '#00875a' : '#ffb347',
        flexShrink: 0,
      }}
    />
  );
};

const ApiStatusPanel = ({
  services: serviceMap,
  isLoading,
  refresh,
  actions = {},
}: ApiStatusPanelProps) => {
  const intl = useIntl();

  const hasRequiredDown = serviceMap !== null
    && Object.values(serviceMap).some((s) => s.required && s.status === 'unavailable');

  const entries = serviceMap ? Object.entries(serviceMap) : [];

  return (
    <div className="api-status-panel mt-3 border rounded bg-white">
      <Collapsible.Advanced>
        <div className="d-flex align-items-center justify-content-between px-3 py-2">
          <Collapsible.Trigger
            className="d-flex align-items-center flex-grow-1 border-0 bg-transparent p-0 text-left"
            style={{ cursor: 'pointer', gap: '0.5rem' }}
          >
            <Semaphore serviceMap={serviceMap} />
            <strong className="small text-uppercase text-muted">
              {intl.formatMessage(messages['openedx-ai-badges.api-status.title'])}
            </strong>
          </Collapsible.Trigger>
          <div className="d-flex align-items-center" style={{ gap: '0.25rem' }}>
            {isLoading && (
              <Spinner
                animation="border"
                size="sm"
                variant="primary"
                screenReaderText="Loading"
              />
            )}
            {/* stopPropagation prevents the click from toggling the collapsible */}
            {/* eslint-disable-next-line
                jsx-a11y/click-events-have-key-events,
                jsx-a11y/no-static-element-interactions */}
            <span onClick={(e) => e.stopPropagation()}>
              <IconButton
                src={Refresh}
                iconAs={Icon}
                alt={intl.formatMessage(messages['openedx-ai-badges.api-status.refresh'])}
                onClick={refresh}
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
                    <span className={`mr-2 ${colorClass}`} aria-hidden="true">●</span>
                    <span>{labelKey ? intl.formatMessage(messages[labelKey]) : name}</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className={colorClass}>
                      {statusKey ? intl.formatMessage(messages[statusKey]) : service.status}
                    </span>
                    {actions[name] && (
                      <span className="ml-2">{actions[name]}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasRequiredDown && (
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
