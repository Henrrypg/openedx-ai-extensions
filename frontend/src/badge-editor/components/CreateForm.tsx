import { useState, useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form, StatefulButton } from '@openedx/paragon';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { BadgeFormData, GeneratedBadge, SelectableFieldKey } from '../../types/badges';
import { FORM_OPTIONS, DEFAULT_FORM_DATA } from '../contants';
import { useBadgeGenerate, useApiStatus } from '../data/apiHooks';
import messages from '../messages';

interface CreateFormProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  onBadgeGenerated: (badge: GeneratedBadge) => void;
}

const APPEARANCE_FIELDS: SelectableFieldKey[] = ['style', 'tone'];
const ACHIEVEMENT_FIELDS: SelectableFieldKey[] = ['level', 'criterion'];

const CreateForm = ({
  contextData,
  onBadgeGenerated,
}: CreateFormProps) => {
  const { isServicesReady } = useApiStatus(contextData);
  const intl = useIntl();
  const [formData, setFormData] = useState<BadgeFormData>(DEFAULT_FORM_DATA);

  const {
    generate, isGenerating, statusMessage, generationError, generatedBadge,
  } = useBadgeGenerate(contextData);

  // Guard against stale cached badge on mount — only fire for badges generated this session
  const prevGeneratedBadge = useRef<GeneratedBadge | null>(generatedBadge);
  useEffect(() => {
    if (generatedBadge && generatedBadge !== prevGeneratedBadge.current) {
      prevGeneratedBadge.current = generatedBadge;
      setFormData(DEFAULT_FORM_DATA);
      onBadgeGenerated(generatedBadge);
    }
  }, [generatedBadge, onBadgeGenerated]);

  const handleChange = (field: keyof BadgeFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = () => {
    generate({ formData, action: 'run' });
  };

  const fieldLabels: Record<SelectableFieldKey, string> = {
    style: intl.formatMessage(messages['openedx.ai.badges.editor.create.style.label']),
    tone: intl.formatMessage(messages['openedx.ai.badges.editor.create.tone.label']),
    level: intl.formatMessage(messages['openedx.ai.badges.editor.create.level.label']),
    criterion: intl.formatMessage(messages['openedx.ai.badges.editor.create.criterion.label']),
  };

  const renderRadioField = (field: SelectableFieldKey) => (
    <Form.Group key={field}>
      <Form.Label>{fieldLabels[field]}</Form.Label>
      <Form.RadioSet
        name={field}
        value={formData[field]}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(field, e.target.value)}
        isInline
        disabled={isGenerating}
      >
        {FORM_OPTIONS[field].map((option) => {
          const label = typeof option.label === 'string'
            ? option.label
            : intl.formatMessage(option.label);
          return (
            <Form.Radio key={option.value} value={option.value}>
              {label}
            </Form.Radio>
          );
        })}
      </Form.RadioSet>
    </Form.Group>
  );

  return (
    <div className="d-flex flex-column">
      <h3 className="mb-3 text-primary">
        {intl.formatMessage(messages['openedx.ai.badges.editor.create.header'])}
      </h3>
      <p>
        {intl.formatMessage(messages['openedx.ai.badges.editor.create.description'])}
      </p>
      <Form>
        <hr className="my-3" />
        <h4 className="mb-3">
          {intl.formatMessage(messages['openedx.ai.badges.editor.create.section.appearance'])}
        </h4>
        {APPEARANCE_FIELDS.map(renderRadioField)}

        <hr className="my-3" />
        <h4 className="mb-3">
          {intl.formatMessage(messages['openedx.ai.badges.editor.create.section.achievement'])}
        </h4>
        {ACHIEVEMENT_FIELDS.map(renderRadioField)}

        <hr className="my-3" />
        <h4 className="mb-3">
          {intl.formatMessage(messages['openedx.ai.badges.editor.create.section.context'])}
        </h4>

        <Form.Group className="mb-2">
          <Form.Switch
            id="skills-toggle"
            checked={formData.skillsEnabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('skillsEnabled', e.target.checked)}
            disabled={isGenerating}
          >
            {intl.formatMessage(messages['openedx.ai.badges.editor.create.skills.label'])}
          </Form.Switch>
          <Form.Text className="d-block text-muted">
            {intl.formatMessage(messages['openedx.ai.badges.editor.create.skills.description.short'])}
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label>
            {intl.formatMessage(messages['openedx.ai.badges.editor.create.description.label'])}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={formData.additionalInstructions}
            placeholder={intl.formatMessage(messages['openedx.ai.badges.editor.create.description.placeholder'])}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('additionalInstructions', e.target.value)}
            disabled={isGenerating}
          />
        </Form.Group>

        <div className="d-flex justify-content-start">
          <StatefulButton
            state={isGenerating ? 'pending' : 'default'}
            onClick={handleGenerate}
            disabled={isGenerating || !isServicesReady}
            labels={{
              default: intl.formatMessage(messages['openedx.ai.badges.editor.create.button.generate']),
              pending: statusMessage ?? intl.formatMessage(messages['openedx.ai.badges.editor.create.generating.message']),
              complete: intl.formatMessage(messages['openedx.ai.badges.editor.create.button.generate']),
            }}
          />
        </div>

        {generationError && (
          <div className="mt-3 text-danger small" role="alert">
            {intl.formatMessage(messages['openedx.ai.badges.editor.create.error.generic'])}
          </div>
        )}
      </Form>
    </div>
  );
};

export default CreateForm;
