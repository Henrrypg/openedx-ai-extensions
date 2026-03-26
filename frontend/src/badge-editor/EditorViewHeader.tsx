interface EditorViewHeaderProps {
  badgeTitle: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDeleteDraft: () => void;
  onSaveDraft: () => void;
  onSavePublish: () => void;
}

const EditorViewHeader = ({
  badgeTitle, hasUnsavedChanges, isSaving, onBack, onDeleteDraft, onSaveDraft, onSavePublish,
}: EditorViewHeaderProps) => (
  <div>EditorViewHeader (stub)</div>
);

export default EditorViewHeader;
