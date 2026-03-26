import { SkillAlignment } from '../types/badges';

interface SkillChipProps {
  skills: SkillAlignment[];
  onChange: (skills: SkillAlignment[]) => void;
  disabled?: boolean;
}

const SkillChip = ({ skills, onChange, disabled }: SkillChipProps) => (
  <div>SkillChip (stub)</div>
);

export default SkillChip;
