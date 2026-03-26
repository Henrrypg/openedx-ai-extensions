/** A single selectable option in the badge form. */
export interface FormOption {
  value: string;
  label: string | { id: string; defaultMessage: string };
}

/** Map of form field names to their selectable options. */
export interface FormOptionsMap {
  style: FormOption[];
  tone: FormOption[];
  level: FormOption[];
  criterion: FormOption[];
}

/** Selectable field keys (used to iterate over form option groups). */
export type SelectableFieldKey = keyof FormOptionsMap;

/** Shape of the badge generation form data. */
export interface BadgeFormData {
  style: string;
  tone: string;
  level: string;
  criterion: string;
  skillsEnabled: boolean;
}

/** Keys that identify editable sections of the generated badge response. */
export type BadgeSectionKey = 'achievement' | 'skills' | 'courseContext';

/** Detailed information for each generated section. */

export interface CourseContext {
  title?: string;
  description?: string;
  shortDescription?: string;
  overview?: string;
  [key: string]: unknown;
}

export interface SkillAlignment {
  type: string;
  targetType: string;
  targetName: string;
  targetDescription: string;
  targetUrl: string;
}

export interface BadgeCriteria {
  narrative: string;
}

export interface BadgeData {
  name: string;
  description: string;
  criteria: BadgeCriteria;
  [key: string]: unknown;
}

/** Badge configuration options echoed in the response (camelCased by the service layer). */
export interface BadgeConfiguration {
  badgeStyle: string;
  badgeTone: string;
  badgeLevel: string;
  criterionStyle: string;
  institution?: string;
  instituteUrl?: string;
  customInstructions?: string;
}

/**
 * The canonical generated response shape shared by both orchestrators.
 * Keys are camelCase because the service layer applies camelCaseObject to all API responses.
 */
export interface GeneratedResponse {
  credentialSubject?: {
    achievement?: BadgeData;
  };
  skills?: SkillAlignment[];
  badgeConfiguration?: BadgeConfiguration;
  enableSkillExtraction?: boolean;
  /** MIT DCC only — present when generation was performed via the MIT API. */
  badgeId?: string;
  metrics?: Record<string, unknown>;
  imageConfig?: unknown;
  enableImageGeneration?: boolean;
}

/** Result from the badge image generation API. */
export interface BadgeImageResult {
  base64: string;
  config: Record<string, unknown>;
}

/**
 * Shape of the AI-generated badge response as seen by the frontend.
 * The service layer applies camelCaseObject to the raw API response, so
 * snake_case backend keys (course_context, generated_response) arrive as
 * courseContext and generatedResponse.
 */
export interface GeneratedBadge {
  courseContext?: CourseContext;
  generatedResponse?: GeneratedResponse;
  badgeImage?: BadgeImageResult;
  status?: BadgeStatus;
  versions?: BadgeVersion[];
  [key: string]: unknown;
}

/** Workflow actions supported by the badge generation flow. */
export type BadgeWorkflowAction = 'run' | 'regenerate';

/** Shape of a single UI component entry from the workflow profile. */
export interface ProfileUiComponent {
  component: string;
  config: Record<string, string>;
}

/** UIComponents config returned by the profile endpoint. */
export interface ProfileConfig {
  request: ProfileUiComponent;
  response: ProfileUiComponent;
  metadata?: Record<string, any>;
}

/** Payload sent to the workflow service for badge generation. */
export interface GeneratePayload {
  action: BadgeWorkflowAction;
  userInput: BadgeFormData;
}

/** Payload sent to the workflow service for saving a badge section. */
export interface SavePayload {
  action: 'save';
  userInput: {
    key: string;
    value: unknown;
  };
}

/** Union of all workflow payloads. */
export type WorkflowPayload = GeneratePayload | SavePayload;

/** Possible status values for an external API service. */
export type ApiServiceStatus = 'online' | 'unavailable' | 'not_configured' | 'starting';

/** Status and requirement flag for a single external service. */
export interface ApiService {
  status: ApiServiceStatus;
  required: boolean;
}

/** Response shape from the get_api_status workflow action. */
export interface ApiStatusResult {
  services: Record<string, ApiService>;
}

// ------------------------------------------------------------------
// Multi-badge types (gallery, editor, persistence)
// ------------------------------------------------------------------

/** Draft or published status for a persisted badge. */
export type BadgeStatus = 'draft' | 'published';

/** A snapshot of a previously generated badge image. */
export interface BadgeVersion {
  id: string;
  badgeImage: BadgeImageResult | null;
  createdAt: string;
}

/**
 * A badge entry stored in the session's ``badges[]`` array.
 *
 * The ``completeInfo`` field has the same shape as ``GeneratedBadge``
 * (camelCased by the service layer).
 */
export interface PersistedBadge {
  id: string;
  status: BadgeStatus;
  createdAt: string;
  completeInfo: GeneratedBadge;
  versions: BadgeVersion[];
}

/** Form data shape used by the Studio/Editor view. */
export interface EditorFormData {
  courseContext: CourseContext;
  skills: SkillAlignment[];
  badgeDescription: string;
}

/** Save action type passed to the save_badge backend action. */
export type BadgeSaveAction = 'draft' | 'publish';
