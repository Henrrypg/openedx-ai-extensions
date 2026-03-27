import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge } from '../types/badges';
import CreateForm from './components/CreateForm';
import EditForm from './components/EditForm';

interface CreatePanelProps {
  mode: 'create';
  contextData: ReturnType<typeof services.prepareContextData>;
  onBadgeGenerated: (badge: GeneratedBadge) => void;
}

interface EditPanelProps {
  mode: 'edit';
  badge: GeneratedBadge;
  contextData: ReturnType<typeof services.prepareContextData>;
  onBadgeChange: (badge: GeneratedBadge) => void;
}

type EditorPanelProps = CreatePanelProps | EditPanelProps;

const EditorPanel = (props: EditorPanelProps) => {
  if (props.mode === 'create') {
    return (
      <CreateForm
        contextData={props.contextData}
        onBadgeGenerated={props.onBadgeGenerated}
      />
    );
  }

  return (
    <EditForm
      badge={props.badge}
      contextData={props.contextData}
      onChange={props.onBadgeChange}
    />
  );
};

export default EditorPanel;
