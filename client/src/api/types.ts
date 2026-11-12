export type TemplateColor = 'cornflower' | 'lavender' | 'mint';

export interface Employee {
  id: number;
  fullName: string;
  position: string;
  avatarUrl: string | null;
}

export interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: TemplateColor;
  hotkey: number | null;
}

export interface Shift {
  id: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  templateId: number | null;
  publishedAt: string | null;
}

export interface CellRef {
  employeeId: number;
  date: string;
}

export interface ShiftUpsert extends CellRef {
  startTime: string;
  endTime: string;
  templateId: number | null;
}

export interface BatchRequest {
  upserts: ShiftUpsert[];
  deletes: CellRef[];
}
