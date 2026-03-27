import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  'openedx-ai-badges.tab.description': {
    id: 'openedx-ai-badges.tab.description',
    defaultMessage: 'This tab allows you to generate <bold>Open Badges 3.0</bold> following the official standard. The system automatically extracts real information from your course, including the title, description, and overview by default. The extraction process and the final output are highly configurable via the <bold>AI Workflow Profile</bold>.',
    description: 'First paragraph of the badge generator description',
  },
  'openedx.ai.badges.empty.state.headline': {
    id: 'openedx.ai.badges.empty.state.headline',
    defaultMessage: 'Create your first badge',
    description: 'Headline shown when no badges exist yet',
  },
  'openedx.ai.badges.button.create': {
    id: 'openedx.ai.badges.button.create',
    defaultMessage: 'Create New Badge',
    description: 'Button to create a new badge',
  },
  'openedx.ai.badges.gallery.title': {
    id: 'openedx.ai.badges.gallery.title',
    defaultMessage: 'My Badges',
    description: 'Title heading for the badge gallery view',
  },
  'openedx.ai.badges.gallery.loading': {
    id: 'openedx.ai.badges.gallery.loading',
    defaultMessage: 'Loading badges',
    description: 'Screen reader text shown while badges are loading',
  },
  'openedx.ai.badges.gallery.column.name': {
    id: 'openedx.ai.badges.gallery.column.name',
    defaultMessage: 'Name',
    description: 'Column header for the badge name used by DataTable filtering',
  },
  'openedx.ai.badges.gallery.no.results': {
    id: 'openedx.ai.badges.gallery.no.results',
    defaultMessage: 'No badges match your search.',
    description: 'Message shown when no badges match the search filter',
  },
  'openedx.ai.badges.card.untitled': {
    id: 'openedx.ai.badges.card.untitled',
    defaultMessage: 'Untitled Badge',
    description: 'Fallback title when a badge has no name',
  },
  'openedx.ai.badges.card.status.draft': {
    id: 'openedx.ai.badges.card.status.draft',
    defaultMessage: 'Draft',
    description: 'Status label for a draft badge',
  },
  'openedx.ai.badges.card.status.published': {
    id: 'openedx.ai.badges.card.status.published',
    defaultMessage: 'Published',
    description: 'Status label for a published badge',
  },
  'openedx.ai.badges.card.edit': {
    id: 'openedx.ai.badges.card.edit',
    defaultMessage: 'Edit',
    description: 'Button to edit a draft badge',
  },
});

export default messages;
