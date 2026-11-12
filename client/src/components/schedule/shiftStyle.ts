import type { ShiftTemplate, TemplateColor } from '../../api/types';
import type { ShiftValue } from '../../store/schedule';

export type ShiftTone = TemplateColor | 'custom';

export function toneOf(value: ShiftValue, templates: ShiftTemplate[]): ShiftTone {
  if (value.templateId === null) return 'custom';
  return templates.find((t) => t.id === value.templateId)?.color ?? 'custom';
}
