declare module '@openedx/openedx-ai-extensions-ui' {
  interface ContextData {
    uiSlotSelectorId: string | null;
    courseId: string | null;
    locationId?: string | null;
  }

  interface WorkflowResult {
    response?: unknown;
    requestId?: string;
    status?: string;
    message?: string;
    error?: string;
    timestamp?: string;
    [k: string]: any;
  }

  interface WorkflowServiceParams {
    payload: { action: string; userInput: unknown };
    context: ContextData;
  }

  export const services: {
    prepareContextData: (params: {
      uiSlotSelectorId: string | null;
      courseId: string | null;
      locationId?: string | null;
    }) => ContextData;
    callWorkflowService: (params: WorkflowServiceParams) => Promise<WorkflowResult>;
    fetchConfiguration: (params: {
      contextData: ContextData;
      configEndpoint: string | null;
      signal?: AbortSignal | null;
    }) => Promise<import('./badges').ProfileConfig | null>;
    getDefaultEndpoint: (endpoint: string) => string;
  };

  interface ComponentRegistration {
    id: string;
    label: string;
    component: React.ComponentType<any>;
  }

  export function registerComponents(components: Record<string, React.ComponentType<any>>): void;
  export function registerComponents(slot: string, registration: ComponentRegistration): void;
}
