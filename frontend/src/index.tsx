// Import registration utilities from ai-extensions
import { registerComponents } from '@openedx/openedx-ai-extensions-ui';

import AIBadgesTab from './AIBadgesTab';

// Register the badge configuration tab into the AI Extensions Settings Modal.
// The backend controls whether this tab is shown per course via the
// author-settings API (enabled_features list). The feature ID below must
// match what the backend returns when badges are enabled for a course.
registerComponents('settings', {
  id: 'ai-badges',
  label: 'AI Badges',
  component: AIBadgesTab,
});

export {
  AIBadgesTab,
};
