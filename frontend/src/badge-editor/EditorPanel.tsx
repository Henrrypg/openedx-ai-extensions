import { EditorFormData } from '../types/badges';

interface EditorPanelProps {
  editorData: EditorFormData;
  onChange: (data: EditorFormData) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isOutOfSync: boolean;
  disabled?: boolean;
}

const EditorPanel = ({
  editorData, onChange, onRegenerate, isRegenerating, isOutOfSync, disabled,
}: EditorPanelProps) => (
  <div>EditorPanel (stub)</div>
);

export default EditorPanel;
