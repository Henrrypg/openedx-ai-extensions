import { Chip, OverlayTrigger, Tooltip } from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';
import { SkillAlignment } from '../../types/badges';

interface SkillChipProps {
  skills: SkillAlignment[];
  onChange?: (skills: SkillAlignment[]) => void;
}

const SkillChip = ({ skills, onChange }: SkillChipProps) => (
  <div className="d-flex flex-wrap">
    {skills.map((skill, index) => (
      <OverlayTrigger
        key={skill.targetUrl}
        placement="top"
        overlay={<Tooltip id={`skill-tooltip-${skill.targetUrl}`}>{skill.targetDescription}</Tooltip>}
      >
        <Chip
          className='m-2'
          {...(onChange && {
            iconAfter: Close,
            onIconAfterClick: () => {
              const updated = skills.filter((_, i) => i !== index);
              onChange(updated);
            },
          })}
        >
          {skill.targetName}
        </Chip>
      </OverlayTrigger>
    ))}
  </div>
);

export default SkillChip;
