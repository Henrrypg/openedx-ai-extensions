declare module '@openedx/openedx-ai-extensions-ui' {
  interface ContextData {
    uiSlotSelectorId: string | null;
    courseId: string | null;
    locationId?: string | null;
  }

  interface WorkflowResult {
    response: unknown;
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
  };

  interface ComponentRegistration {
    id: string;
    label: string;
    component: React.ComponentType<any>;
  }

  export function registerComponents(components: Record<string, React.ComponentType<any>>): void;
  export function registerComponents(slot: string, registration: ComponentRegistration): void;
}
