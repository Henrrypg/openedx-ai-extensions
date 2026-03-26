import { BadgeImageResult, BadgeVersion } from '../types/badges';

interface PreviewPanelProps {
  badgeImage: BadgeImageResult | null;
  versions: BadgeVersion[];
  isGenerating: boolean;
  statusMessage: string | null;
}

const PreviewPanel = ({
  badgeImage, versions, isGenerating, statusMessage,
}: PreviewPanelProps) => (
  <div>PreviewPanel (stub)</div>
);

export default PreviewPanel;
