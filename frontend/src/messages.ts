import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  'openedx-ai-badges.profile.loading': {
    id: 'openedx-ai-badges.profile.loading',
    defaultMessage: 'Loading badge workflow configuration…',
    description: 'Shown while the profile endpoint is being fetched',
  },
  'openedx-ai-badges.profile.no-config': {
    id: 'openedx-ai-badges.profile.no-config',
    defaultMessage: 'No badge workflow is configured for this course.',
    description: 'Shown when the profile endpoint returns no configuration',
  },

  // API Status panel
  'openedx-ai-badges.api-status.title': {
    id: 'openedx-ai-badges.api-status.title',
    defaultMessage: 'Service Status',
    description: 'Title for the API status panel',
  },
  'openedx-ai-badges.api-status.online': {
    id: 'openedx-ai-badges.api-status.online',
    defaultMessage: 'Online',
    description: 'Status label when a service is online',
  },
  'openedx-ai-badges.api-status.unavailable': {
    id: 'openedx-ai-badges.api-status.unavailable',
    defaultMessage: 'Unavailable',
    description: 'Status label when a service is unavailable',
  },
  'openedx-ai-badges.api-status.not-configured': {
    id: 'openedx-ai-badges.api-status.not-configured',
    defaultMessage: 'Not configured',
    description: 'Status label when a service is not configured',
  },
  'openedx-ai-badges.api-status.starting': {
    id: 'openedx-ai-badges.api-status.starting',
    defaultMessage: 'Starting',
    description: 'Status label when a service is warming up (e.g. Ollama loading a model)',
  },
  'openedx-ai-badges.api-status.services-offline': {
    id: 'openedx-ai-badges.api-status.services-offline',
    defaultMessage: 'Required services are offline. Badge generation is disabled.',
    description: 'Alert shown when one or more required services are unavailable',
  },
  'openedx-ai-badges.api-status.fetch-error': {
    id: 'openedx-ai-badges.api-status.fetch-error',
    defaultMessage: 'Unable to check service status.',
    description: 'Alert shown when the API status request fails after retries',
  },
  'openedx-ai-badges.api-status.refresh': {
    id: 'openedx-ai-badges.api-status.refresh',
    defaultMessage: 'Refresh status',
    description: 'Tooltip / aria-label for the refresh button in the API status panel',
  },
  'openedx-ai-badges.api-status.service.badge-api': {
    id: 'openedx-ai-badges.api-status.service.badge-api',
    defaultMessage: 'Badge Generation API',
    description: 'Display name for the badge generation API service',
  },
  'openedx-ai-badges.api-status.service.ollama': {
    id: 'openedx-ai-badges.api-status.service.ollama',
    defaultMessage: 'Ollama Model',
    description: 'Display name for the Ollama model service',
  },
  'openedx-ai-badges.api-status.service.image-api': {
    id: 'openedx-ai-badges.api-status.service.image-api',
    defaultMessage: 'Image Generation API',
    description: 'Display name for the image generation API service',
  },
});

export default messages;
