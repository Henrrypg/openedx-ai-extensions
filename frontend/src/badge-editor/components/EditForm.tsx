import React, { useState, useEffect, useRef } from 'react';
import { snakeCaseObject } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Badge, Form, Button, Icon, IconButton, OverlayTrigger, Stack, StatefulButton, Tooltip, TransitionReplace,
} from '@openedx/paragon';
import { AutoAwesome, Edit } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge, BadgeData } from '../../types/badges';
import SkillChip from './SkillChip';
import { useBadgeSave, useBadgeGenerate, useApiStatus } from '../data/apiHooks';
import { useProfileConfig } from '../../data/apiHooks';
import messages from '../messages';

interface EditFormProps {
  badge: GeneratedBadge;
  contextData: ReturnType<typeof services.prepareContextData>;
  onChange: (badge: GeneratedBadge) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

// ─── Section 1: Context & Skills ────────────────────────────────────────────

interface ContextSectionProps {
  badge: GeneratedBadge;
  onSave: (updated: GeneratedBadge) => void;
  isSaving: boolean;
  disabled: boolean;
}

interface SkillsSectionProps {
  badge: GeneratedBadge;
  skillsSource: string;
}

const buildContextJson = (badge: GeneratedBadge) => ({
  course_context: badge.courseContext ? snakeCaseObject(badge.courseContext) : {},
  skills: badge.generatedResponse?.skills ?? [],
  badgeConfiguration: badge.generatedResponse?.badgeConfiguration ?? {},
});

const ProvenanceChip = ({ label, tooltip }: { label: string; tooltip?: string }) => {
  const chip = (
    <Badge variant="light" className="font-weight-normal small">
      {label}
    </Badge>
  );
  if (!tooltip) { return chip; }
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`provenance-${label}`}>{tooltip}</Tooltip>}
    >
      <span>{chip}</span>
    </OverlayTrigger>
  );
};

const ContextSection = ({
  badge, onSave, isSaving, disabled,
}: ContextSectionProps) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [localJson, setLocalJson] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const originalRef = useRef('');

  const courseContext = badge.courseContext ?? {};
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
      const updated: GeneratedBadge = {
        ...badge,
        courseContext: parsed.course_context,
        generatedResponse: {
          ...badge.generatedResponse,
          skills: parsed.skills,
          badgeConfiguration: parsed.badgeConfiguration,
        },
      };
      onSave(updated);
      setIsEditing(false);
    } catch {
      setIsInvalid(true);
    }
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <h3 className="mb-1">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.courseContext'])}</h3>
          <ProvenanceChip label={intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.fromCourse'])} />
        </div>
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
          <div key="edit" className="mt-3">
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
          <div key="view" className="mt-3">
            <p className="mb-0">{description}</p>
          </div>
        )}
      </TransitionReplace>
    </div>
  );
};

const SkillsSection = ({
  badge, skillsSource,
}: SkillsSectionProps) => {
  const intl = useIntl();
  const skills = badge.generatedResponse?.skills ?? [];

  const skillsTooltip = skillsSource === 'laiser'
    ? intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.aiExtracted.tooltip.laiser'])
    : intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.aiExtracted.tooltip.llm']);

  return (
    <div className="mb-4">
      <div className="mb-1">
        <h3 className="mb-1">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.skills'])}</h3>
        <ProvenanceChip
          label={intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.aiExtracted'])}
          tooltip={skillsTooltip}
        />
      </div>
      <div className="mt-3">
        {skills.length === 0 ? (
          <p className="mb-0">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.skills.empty'])}</p>
        ) : (
          <SkillChip skills={skills} />
        )}
      </div>
    </div>
  );
};

// ─── Section 2: Badge (achievement) ─────────────────────────────────────────

interface BadgeSectionProps {
  badge: GeneratedBadge;
  onSave: (updated: GeneratedBadge) => void;
  onRegenerate: (instructions: string) => void;
  isSaving: boolean;
  isRegenerating: boolean;
  disabled: boolean;
  statusMessage: string | null;
}

const BadgeSection = ({
  badge, onSave, onRegenerate, isSaving, isRegenerating, disabled, statusMessage,
}: BadgeSectionProps) => {
  const intl = useIntl();
  const achievement = badge.generatedResponse?.credentialSubject?.achievement;
  const [isEditing, setIsEditing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [narrative, setNarrative] = useState('');

  const handleRun = () => {
    onRegenerate(instructions);
    setIsPanelOpen(false);
    setInstructions('');
  };

  const handleRegenerateCancel = () => {
    setIsPanelOpen(false);
    setInstructions('');
  };

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
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <h3 className="mb-1">
            {intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.achievement'])}
            {achievement?.name ? `: ${achievement.name}` : ''}
          </h3>
          <ProvenanceChip
            label={intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.aiGenerated'])}
            tooltip={intl.formatMessage(messages['openedx.ai.badges.editor.edit.provenance.aiGenerated.tooltip'])}
          />
        </div>
        {!isEditing && (
          <Stack direction="horizontal" gap={2}>
            <Button
              as={IconButton}
              src={Edit}
              iconAs={Icon}
              onClick={handleEdit}
              disabled={disabled}
              alt={intl.formatMessage(messages['openedx.ai.badges.editor.edit.section.editButton'])}
            />
            <Button
              variant="outline-primary"
              size="sm"
              iconBefore={AutoAwesome}
              onClick={() => setIsPanelOpen(true)}
              disabled={disabled || isRegenerating || isPanelOpen}
            >
              {intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate'])}
            </Button>
          </Stack>
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

      {isPanelOpen && (
        <div className="border rounded p-3 mt-3">
          <Form.Group className="mb-3">
            <Form.Label className="small font-weight-bold">
              {intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate.instructions.label'])}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate.instructions.placeholder'])}
              value={instructions}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
            />
          </Form.Group>
          <Stack direction="horizontal" gap={2} className="justify-content-between align-items-center">
            {isRegenerating && statusMessage ? (
              <p className="text-muted small mb-0">{statusMessage}</p>
            ) : <span />}
            <Stack direction="horizontal" gap={2}>
              <Button variant="outline-secondary" size="sm" onClick={handleRegenerateCancel} disabled={isRegenerating}>
                {intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate.cancel'])}
              </Button>
              <StatefulButton
                size="sm"
                state={isRegenerating ? 'pending' : 'default'}
                onClick={handleRun}
                disabled={isRegenerating}
                variant="primary"
                labels={{
                  default: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate.run']),
                  pending: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerating']),
                  complete: intl.formatMessage(messages['openedx.ai.badges.editor.edit.regenerate.run']),
                }}
              />
            </Stack>
          </Stack>
        </div>
      )}
    </div>
  );
};

// ─── EditForm (root) ─────────────────────────────────────────────────────────

const EditForm = ({
  badge, contextData, onChange, onError, disabled = false,
}: EditFormProps) => {
  const intl = useIntl();
  const { save } = useBadgeSave(contextData);
  const {
    generate, isGenerating, statusMessage, generatedBadge, generationError,
  } = useBadgeGenerate(contextData);
  const { isServicesReady } = useApiStatus(contextData);
  const { data: profileConfig } = useProfileConfig(contextData);
  const skillsSource = (profileConfig as any)?.request?.config?.skillsSource as string ?? 'llm';

  const prevGeneratedBadge = useRef<GeneratedBadge | null>(generatedBadge);
  useEffect(() => {
    if (generatedBadge && generatedBadge !== prevGeneratedBadge.current) {
      prevGeneratedBadge.current = generatedBadge;
      onChange(generatedBadge);
    }
  }, [generatedBadge, onChange]);

  const prevGenerationError = useRef<string | null>(null);
  useEffect(() => {
    if (generationError && generationError !== prevGenerationError.current) {
      prevGenerationError.current = generationError;
      const label = intl.formatMessage(messages['openedx.ai.badges.editor.error.regenerate']);
      onError?.(`${label} ${generationError}`);
    }
  }, [generationError, onError, intl]);

  const handleRegenerate = (instructions: string) => {
    const config = badge.generatedResponse?.badgeConfiguration ?? {};
    generate({
      formData: {
        badge_id: (badge as any).id,
        style: (config as any).badgeStyle ?? '',
        tone: (config as any).badgeTone ?? '',
        level: (config as any).badgeLevel ?? '',
        criterion: (config as any).criterionStyle ?? '',
        skillsEnabled: badge.generatedResponse?.enableSkillExtraction ?? false,
        additionalInstructions: instructions,
      } as any,
      action: 'regenerate',
    });
  };

  const handleSave = (updated: GeneratedBadge) => {
    onChange(updated);
    save.mutate({ badge: updated, status: badge.status ?? 'draft' });
  };

  return (
    <div>
      <h2 className="mb-2 text-primary">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.title'])}</h2>
      <p className="mb-4 small text-muted">{intl.formatMessage(messages['openedx.ai.badges.editor.edit.intro'])}</p>
      <hr />
      <ContextSection
        badge={badge}
        onSave={handleSave}
        isSaving={save.isLoading}
        disabled={disabled || isGenerating}
      />
      <hr />
      <SkillsSection
        badge={badge}
        skillsSource={skillsSource}
      />
      <hr />
      <BadgeSection
        badge={badge}
        onSave={handleSave}
        onRegenerate={handleRegenerate}
        isSaving={save.isLoading}
        isRegenerating={isGenerating}
        disabled={disabled || !isServicesReady}
        statusMessage={statusMessage}
      />
    </div>
  );
};

export default EditForm;
