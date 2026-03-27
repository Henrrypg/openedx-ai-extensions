import React, { useState, useEffect, useRef } from 'react';
import { snakeCaseObject, camelCaseObject } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Form, Button, Icon, IconButton, Stack, StatefulButton, TransitionReplace,
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge, BadgeData } from '../../types/badges';
import SkillChip from './SkillChip';
import { useBadgeSave, useBadgeGenerate, useApiStatus } from '../data/apiHooks';
import messages from '../messages';

interface EditFormProps {
  badge: GeneratedBadge;
  contextData: ReturnType<typeof services.prepareContextData>;
  onChange: (badge: GeneratedBadge) => void;
  disabled?: boolean;
}

// ─── Section 1: Context & Skills ────────────────────────────────────────────

interface ContextSectionProps {
  badge: GeneratedBadge;
  onSave: (updated: GeneratedBadge) => void;
  onContextChanged: () => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  isRegenerating: boolean;
  statusMessage: string | null;
  isSaving: boolean;
  disabled: boolean;
}


const buildContextJson = (badge: GeneratedBadge) => ({
  course_context: badge.courseContext ? snakeCaseObject(badge.courseContext) : {},
  skills: badge.generatedResponse?.skills ?? [],
  badgeConfiguration: badge.generatedResponse?.badgeConfiguration ?? {},
});

const ContextSection = ({
  badge, onSave, onContextChanged, onRegenerate, canRegenerate, isRegenerating, statusMessage, isSaving, disabled,
}: ContextSectionProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [localJson, setLocalJson] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const originalRef = useRef('');

  const courseContext = badge.courseContext ?? {};
  const skills = badge.generatedResponse?.skills ?? [];
  const description = courseContext.description || courseContext.shortDescription || '';

  const handleEdit = () => {
    const json = JSON.stringify(buildContextJson(badge), null, 2);
    setLocalJson(json);
    originalRef.current = json;
    setIsInvalid(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsInvalid(false);
    setIsEditing(false);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(localJson);
      const original = JSON.parse(originalRef.current);
      const updated: GeneratedBadge = {
        ...badge,
        courseContext: parsed.course_context,
        generatedResponse: {
          ...badge.generatedResponse,
          skills: parsed.skills,
          badgeConfiguration: parsed.badgeConfiguration,
        },
      };
      const changed = JSON.stringify(parsed.course_context) !== JSON.stringify(original.course_context)
        || JSON.stringify(parsed.skills) !== JSON.stringify(original.skills)
        || JSON.stringify(parsed.badgeConfiguration) !== JSON.stringify(original.badgeConfiguration);
      if (changed) onContextChanged();
      onSave(updated);
      setIsEditing(false);
    } catch {
      setIsInvalid(true);
    }
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h3 className="mb-0">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.courseContext'])}</h3>
        {!isEditing && (
          <Button
            as={IconButton}
            src={Edit}
            iconAs={Icon}
            onClick={handleEdit}
            disabled={disabled}
            alt={intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.editButton'])}
          />
        )}
      </div>

      <TransitionReplace>
        {isEditing ? (
          <div key="edit">
            <Form.Control
              as="textarea"
              size="sm"
              rows={14}
              className="text-monospace mb-2"
              aria-label={intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.textareaAria'], { section: 'context' })}
              value={localJson}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setIsInvalid(false);
                setLocalJson(e.target.value);
              }}
            />
            {isInvalid && (
              <Form.Control.Feedback type="invalid">
                {intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.jsonError'])}
              </Form.Control.Feedback>
            )}
            <Stack direction="horizontal" gap={2} className="justify-content-end mb-3">
              <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                {intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.cancel'])}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.saving'])
                  : intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.save'])}
              </Button>
            </Stack>
          </div>
        ) : (
          <div key="view">
            <p className="mb-3">{description}</p>
            <h4>{intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.skills'])}</h4>
            {skills.length === 0 ? (
              <p className="mb-3">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.skills.empty'])}</p>
            ) : (
              <div className="mb-3">
                <SkillChip
                  skills={skills}
                />
              </div>
            )}
          </div>
        )}
      </TransitionReplace>

      {!isEditing && (
      <div className="d-flex justify-content-between align-items-center">
        {isRegenerating && statusMessage ? (
          <p className="text-muted small mb-0">{statusMessage}</p>
        ) : <span />}
        <StatefulButton
          state={isRegenerating ? 'pending' : 'default'}
          onClick={onRegenerate}
          disabled={!canRegenerate}
          variant={canRegenerate ? 'primary' : 'outline-primary'}
          labels={{
            default: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate']),
            pending: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerating']),
            complete: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate']),
          }}
        />
      </div>
      )}
    </div>
  );
};

// ─── Section 2: Badge (achievement) ─────────────────────────────────────────

interface BadgeSectionProps {
  badge: GeneratedBadge;
  onSave: (updated: GeneratedBadge) => void;
  isSaving: boolean;
  disabled: boolean;
}

const BadgeSection = ({
  badge, onSave, isSaving, disabled,
}: BadgeSectionProps) => {
  const intl = useIntl();
  const achievement = badge.generatedResponse?.credentialSubject?.achievement;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [narrative, setNarrative] = useState('');

  const handleEdit = () => {
    setName(achievement?.name ?? '');
    setDescription(achievement?.description ?? '');
    setNarrative(achievement?.criteria?.narrative ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = () => {
    const updated: GeneratedBadge = {
      ...badge,
      generatedResponse: {
        ...badge.generatedResponse,
        credentialSubject: {
          ...badge.generatedResponse?.credentialSubject,
          achievement: {
            ...achievement,
            name,
            description,
            criteria: { narrative },
          } as BadgeData,
        },
      },
    };
    onSave(updated);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h3 className="mb-0">
          {intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.achievement'])}
          {achievement?.name ? `: ${achievement.name}` : ''}
        </h3>
        {!isEditing && (
          <Button
            as={IconButton}
            src={Edit}
            iconAs={Icon}
            onClick={handleEdit}
            disabled={disabled}
            alt={intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.editButton'])}
          />
        )}
      </div>

      <TransitionReplace>
        {isEditing ? (
          <div key="edit">
            <Form.Group className="mb-3">
              <Form.Label>{intl.formatMessage(messages['openedx.ai.badges.editor.edit.name.label'])}</Form.Label>
              <Form.Control
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{intl.formatMessage(messages['openedx.ai.badges.editor.edit.description.label'])}</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{intl.formatMessage(messages['openedx.ai.badges.editor.edit.criteria.label'])}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={narrative}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNarrative(e.target.value)}
              />
            </Form.Group>
            <Stack direction="horizontal" gap={2} className="justify-content-end">
              <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                {intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.cancel'])}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.saving'])
                  : intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.save'])}
              </Button>
            </Stack>
          </div>
        ) : (
          <div key="view">
            <p className="mb-2">{achievement?.description}</p>
            {achievement?.criteria?.narrative && (
              <div className="mt-2">
                <span className="font-weight-bold">
                  {intl.formatMessage(messages['openedx.ai.badges.editor.edit.criteria.heading'])}
                </span>
                <p>{achievement.criteria.narrative}</p>
              </div>
            )}
          </div>
        )}
      </TransitionReplace>
    </div>
  );
};

// ─── EditForm (root) ─────────────────────────────────────────────────────────

const EditForm = ({
  badge, contextData, onChange, disabled = false,
}: EditFormProps) => {
  const { save } = useBadgeSave(contextData);
  const { generate, isGenerating, statusMessage, generatedBadge } = useBadgeGenerate(contextData);
  const { isServicesReady } = useApiStatus(contextData);
  const [contextChanged, setContextChanged] = useState(false);

  const prevGeneratedBadge = useRef<GeneratedBadge | null>(generatedBadge);
  useEffect(() => {
    if (generatedBadge && generatedBadge !== prevGeneratedBadge.current) {
      prevGeneratedBadge.current = generatedBadge;
      onChange(generatedBadge);
    }
  }, [generatedBadge, onChange]);

  const handleRegenerate = () => {
    const config = badge.generatedResponse?.badgeConfiguration ?? {};
    generate({
      formData: {
        badge_id: (badge as any).id,
        style: (config as any).badgeStyle ?? '',
        tone: (config as any).badgeTone ?? '',
        level: (config as any).badgeLevel ?? '',
        criterion: (config as any).criterionStyle ?? '',
        skillsEnabled: badge.generatedResponse?.enableSkillExtraction ?? false,
      } as any,
      action: 'regenerate',
    });
  };

  const handleSave = (updated: GeneratedBadge) => {
    onChange(updated);
    save.mutate({ badge: updated, status: badge.status ?? 'draft' });
  };

  const intl = useIntl();

  return (
    <div>
      <h2 className="mb-2 text-primary">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.title'])}</h2>
      <p className="mb-4">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.intro'])}</p>
      <hr />
      <ContextSection
        badge={badge}
        onSave={handleSave}
        onContextChanged={() => setContextChanged(true)}
        onRegenerate={handleRegenerate}
        canRegenerate={contextChanged && !isGenerating && !disabled && isServicesReady}
        isRegenerating={isGenerating}
        statusMessage={statusMessage}
        isSaving={save.isLoading}
        disabled={disabled || isGenerating}
      />
      <hr />
      <BadgeSection
        badge={badge}
        onSave={handleSave}
        isSaving={save.isLoading}
        disabled={disabled}
      />
    </div>
  );
};

export default EditForm;
