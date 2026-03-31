import { useState, useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Card, Icon, Spinner, Button,
} from '@openedx/paragon';
import { WorkspacePremium } from '@openedx/paragon/icons';
import { services } from '@openedx/openedx-ai-extensions-ui';
import { GeneratedBadge, BadgeImageResult, BadgeVersion } from '../types/badges';
import { useImageGenerate, useApiStatus } from './data/apiHooks';
import messages from './messages';
import ApiStatusPanel from './components/ApiStatusPanel';
import VersionThumbnails from './components/VersionThumbnails';

const toSrc = (image: BadgeImageResult) => (
  image.b64.startsWith('data:') ? image.b64 : `data:image/png;base64,${image.b64}`
);

interface PreviewPanelProps {
  contextData: ReturnType<typeof services.prepareContextData>;
  onImageGenerated: (image: BadgeImageResult) => void;
  badge?: GeneratedBadge | null;
  versions?: BadgeVersion[];
  onError?: (message: string) => void;
}

const PreviewPanel = ({
  contextData,
  badge = null,
  versions = [],
  onImageGenerated,
  onError,
}: PreviewPanelProps) => {
  const intl = useIntl();
  const {
    generateImage, isGeneratingImage, imageStatusMessage, generatedImage, imageError,
  } = useImageGenerate(contextData);
  const { isServicesReady } = useApiStatus(contextData);

  const [selectedVersionImage, setSelectedVersionImage] = useState<BadgeImageResult | null>(null);
  const [sessionImage, setSessionImage] = useState<BadgeImageResult | null>(null);
  const [localVersions, setLocalVersions] = useState<BadgeImageResult[]>([]);
  const prevGeneratedImage = useRef<BadgeImageResult | null>(generatedImage);
  const prevImageError = useRef<string | null>(null);

  useEffect(() => {
    if (generatedImage && generatedImage !== prevGeneratedImage.current) {
      prevGeneratedImage.current = generatedImage;
      setSessionImage(generatedImage);
      setLocalVersions((prev) => [generatedImage, ...prev]);
      setSelectedVersionImage(null);
      onImageGenerated(generatedImage);
    }
  }, [generatedImage, onImageGenerated]);

  useEffect(() => {
    if (imageError && imageError !== prevImageError.current) {
      prevImageError.current = imageError;
      const label = intl.formatMessage(messages['openedx.ai.badges.editor.error.image']);
      onError?.(`${label} ${imageError}`);
    }
  }, [imageError, onError, intl]);

  const achievement = badge?.generatedResponse?.credentialSubject?.achievement;
  const canGenerateImage = !!achievement?.description;

  const currentImage: BadgeImageResult | null = selectedVersionImage ?? sessionImage ?? badge?.badgeImage ?? null;

  const handleGenerateImage = () => {
    setSelectedVersionImage(null);
    generateImage({
      mode: 'icon_based',
      badge_name: achievement?.name ?? '',
      badge_description: achievement?.description ?? '',
    });
  };

  // Combine badge versions from props with locally generated ones (deduplicated by base64)
  const allVersionImages: BadgeImageResult[] = [
    ...localVersions,
    ...(versions.flatMap((v) => (v.badgeImage ? [v.badgeImage] : []))),
  ].filter((img, idx, arr) => arr.findIndex((i) => i.b64 === img.b64) === idx);

  return (
    <div>
      <h3 className="mb-3 text-primary">
        {intl.formatMessage(messages['openedx.ai.badges.editor.preview.title'])}
      </h3>

      <Card className="mb-3">
        <Card.Body className="badge-preview__image-area d-flex flex-column align-items-center justify-content-center">
          {isGeneratingImage && !currentImage && (
            <div className="d-flex flex-column align-items-center py-5">
              <Spinner
                animation="border"
                screenReaderText={intl.formatMessage(messages['openedx.ai.badges.editor.preview.generating'])}
              />
              {imageStatusMessage && (
                <p className="text-muted mt-3 small">{imageStatusMessage}</p>
              )}
            </div>
          )}

          {!isGeneratingImage && !currentImage && (
            <div className="d-flex flex-column align-items-center py-5 text-muted">
              <Icon src={WorkspacePremium} className="mb-2" />
              <p className="small mb-0">
                {intl.formatMessage(messages['openedx.ai.badges.editor.preview.placeholder'])}
              </p>
            </div>
          )}

          {currentImage && (
            <div className="position-relative">
              <img
                src={toSrc(currentImage)}
                alt={intl.formatMessage(messages['openedx.ai.badges.editor.preview.imageAlt'])}
                className="img-fluid rounded"
              />
              {isGeneratingImage && (
                <div className="position-absolute d-flex align-items-center justify-content-center rounded badge-preview__overlay">
                  <Spinner
                    animation="border"
                    screenReaderText={intl.formatMessage(messages['openedx.ai.badges.editor.preview.generating'])}
                  />
                  {imageStatusMessage && (
                    <p className="text-muted mt-2 small">{imageStatusMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-center mb-3">
        <Button
          variant="primary"
          onClick={handleGenerateImage}
          disabled={!canGenerateImage || isGeneratingImage || !isServicesReady}
        >
          {isGeneratingImage
            ? intl.formatMessage(messages['openedx.ai.badges.editor.preview.generatingImage'])
            : intl.formatMessage(messages['openedx.ai.badges.editor.preview.generateImage'])}
        </Button>
      </div>

      <VersionThumbnails
        images={allVersionImages.slice(0, 6)}
        selectedImage={selectedVersionImage}
        onSelect={(image) => {
          setSelectedVersionImage(image);
          onImageGenerated(image);
        }}
      />
      <ApiStatusPanel contextData={contextData} />
    </div>
  );
};

export default PreviewPanel;
