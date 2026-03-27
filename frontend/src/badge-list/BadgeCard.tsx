import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Card, Badge, Button, useMediaQuery, breakpoints
} from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { GeneratedBadge } from '../types/badges';
import messages from './messages';

interface BadgeCardProps {
  className?: string;
  original: GeneratedBadge;
  onEdit?: (badge: GeneratedBadge) => void;
}
const fallbackSrc = 'data:image/png;base64,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';

const BadgeCard = ({ className, original: badge, onEdit }: BadgeCardProps) => {
  const intl = useIntl();
  const isSmall = useMediaQuery({ maxWidth: breakpoints.small.maxWidth });
  const badgeImage = badge.badgeImage;
  const name = badge.generatedResponse?.credentialSubject?.achievement?.name
    ?? intl.formatMessage(messages['openedx.ai.badges.card.untitled']);
  const description = badge.generatedResponse?.credentialSubject?.achievement?.description ?? '';
  const isDraft = badge.status === 'draft';
  const imageSrc = badgeImage
    ? (badgeImage.base64.startsWith('data:') ? badgeImage.base64 : `data:image/png;base64,${badgeImage.base64}`)
    : fallbackSrc;

  return (
    <Card className={`badge-card ${className ?? ''}`} orientation={isSmall ? "vertical" : "horizontal"}>
      <Card.ImageCap
        src={imageSrc}

        fallbackSrc={fallbackSrc}
        srcAlt={name}
      />
      <Card.Body>
        <Card.Header
          title={name}
          subtitle={(<Badge variant={isDraft ? 'light' : 'success'}>
            {isDraft
              ? intl.formatMessage(messages['openedx.ai.badges.card.status.draft'])
              : intl.formatMessage(messages['openedx.ai.badges.card.status.published'])}
          </Badge>)}
        />
        {description && (
          <Card.Section>
            <div className="badge-card__description">{description}</div>
          </Card.Section>
        )}
        <Card.Footer>
          <Button
            size='sm'
            block
            variant="secondary"
            iconBefore={Edit}
            disabled={!isDraft}
            className={isDraft ? '' : 'invisible'}
            onClick={() => onEdit?.(badge)}
          >
            {intl.formatMessage(messages['openedx.ai.badges.card.edit'])}
          </Button>
        </Card.Footer>
        </Card.Body>
    </Card>
  );
};

export default BadgeCard;
