import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge } from '../types/badges';

export interface EditorViewProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  badge?: GeneratedBadge | null;
  onBack: () => void;
  onSaveComplete: () => void;
}

const EditorView = ({
  badge, contextData, onBack, onSaveComplete,
}: EditorViewProps) => {
  const mode = badge ? 'edit' : 'create';

  return (
    <div>EditorView (stub) — mode: {mode}</div>
  );
};

export default EditorView;
