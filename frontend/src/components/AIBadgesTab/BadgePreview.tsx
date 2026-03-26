import React, { useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Stack, Button, Card } from '@openedx/paragon';
import {
  GeneratedBadge, BadgeSectionKey, BadgeData, CourseContext, SkillAlignment,
} from '../../types/badges';
import SectionReviewCard from './SectionReviewCard';
import LoadingSpinner from './LoadingSpinner';
import EmptyPreview from './EmptyPreview';
import messages from '../../messages';

const BADGE_SECTIONS: { key: BadgeSectionKey; title: { id: string; defaultMessage: string } }[] = [
  { key: 'achievement', title: messages['openedx-ai-badges.badge-preview.badge.title'] },
  { key: 'courseContext', title: messages['openedx-ai-badges.badge-preview.course-context.title'] },
  { key: 'skills', title: messages['openedx-ai-badges.badge-preview.skills.title'] },
];

interface BadgePreviewProps {
  /** Whether a generation or save request is in progress. */
  isGenerating: boolean;
  /** Current step message from the async task, or null. */
  statusMessage?: string | null;
  /** The AI-generated badge data, or null. */
  generatedBadge: GeneratedBadge | null;
  /** Called when the user saves an individual section. */
  onSave: (key: BadgeSectionKey, value: unknown) => Promise<void>;
  /** Called when the user triggers image generation. */
  onGenerateImage: (params: { badgeName: string; badgeDescription: string }) => Promise<void>;
}

/**
 * Extract the data for a given section key from the canonical response shape.
 * The service layer converts snake_case API keys to camelCase, so backend
 * `generated_response` arrives as `generatedResponse`, `course_context` as
 * `courseContext`, etc.
 * After a `save` action the backend writes the value at the top level of
 * complete_info (e.g. complete_info['achievement']), which also arrives
 * camelCased as a top-level key — fall back to those when present.
 */
const extractSectionData = (
  badge: GeneratedBadge,
  key: BadgeSectionKey,
): BadgeData | CourseContext | SkillAlignment[] | undefined => {
  switch (key) {
    case 'achievement':
      return badge.generatedResponse?.credentialSubject?.achievement
        ?? (badge as any).achievement;
    case 'skills':
      return badge.generatedResponse?.skills
        ?? (badge as any).skills;
    case 'courseContext':
      return badge.courseContext;
    default:
      return undefined;
  }
};

/**
 * Right panel of the AIBadgesTab — shows a loading spinner, empty state,
 * or formatted cards for each section of the generated badge.
 */
const BadgePreview = ({
  isGenerating,
  statusMessage = null,
  generatedBadge,
  onSave,
  onGenerateImage,
}: BadgePreviewProps) => {
  const intl = useIntl();
  const [editingSection, setEditingSection] = useState<BadgeSectionKey | null>(null);

  if (isGenerating && !generatedBadge) {
    return <LoadingSpinner message={statusMessage ?? undefined} />;
  }

  if (!generatedBadge) {
    return <EmptyPreview />;
  }

  const handleEdit = (key: BadgeSectionKey) => setEditingSection(key);
  const handleCancel = () => setEditingSection(null);

  const handleSave = async (key: BadgeSectionKey, value: unknown) => {
    await onSave(key, value);
    setEditingSection(null);
  };

  const achievement = generatedBadge.generatedResponse?.credentialSubject?.achievement
    ?? (generatedBadge as any).achievement;

  return (
    <Stack>
      {BADGE_SECTIONS.map(({ key, title }) => {
        const data = extractSectionData(generatedBadge, key);
        if (!data) { return null; }

        // Focus Mode: Hide other cards if we are editing one
        if (editingSection && editingSection !== key) { return null; }

        return (
          <SectionReviewCard
            key={key}
            sectionKey={key}
            title={intl.formatMessage(title)}
            data={data}
            isEditing={editingSection === key}
            isSaving={isGenerating}
            onEdit={() => handleEdit(key)}
            onCancel={handleCancel}
            onSave={(updated) => handleSave(key, updated)}
          />
        );
      })}

      {/* Badge Image Section */}
      {!editingSection && (
        <Card className="p-4 mt-4">
          <Card.Header>
            <Card.Title>
              {intl.formatMessage(messages['openedx-ai-badges.badge-preview.image.title'])}
            </Card.Title>
          </Card.Header>
          <Card.Body className="text-center">
            {generatedBadge.badgeImage ? (
              <div className="mb-4">
                <img
                  src={generatedBadge.badgeImage.base64.startsWith('data:')
                    ? generatedBadge.badgeImage.base64
                    : `data:image/png;base64,${generatedBadge.badgeImage.base64}`}
                  alt="Generated Badge"
                  style={{ maxWidth: '300px', height: 'auto' }}
                />
              </div>
            ) : (
              <p className="text-muted mb-4">
                {intl.formatMessage(messages['openedx-ai-badges.badge-preview.image.no-image'])}
              </p>
            )}
            <Button
              variant="primary"
              onClick={() => onGenerateImage({
                badgeName: achievement?.name || '',
                badgeDescription: achievement?.description || '',
              })}
              disabled={isGenerating}
            >
              {intl.formatMessage(messages['openedx-ai-badges.badge-preview.image.button.generate'])}
            </Button>
          </Card.Body>
        </Card>
      )}
    </Stack>
  );
};

export default BadgePreview;
