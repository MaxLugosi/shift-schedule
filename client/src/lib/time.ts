export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(v: string): boolean {
  return TIME_RE.test(v);
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function durationMinutes(start: string, end: string): number {
  const diff = toMinutes(end) - toMinutes(start);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function formatHours(minutes: number): string {
  const h = minutes / 60;
  const text = Number.isInteger(h) ? String(h) : h.toFixed(1).replace('.', ',');
  return `${text} ч`;
}

// "08 - 18", минуты показываем только если они есть
export function compactRange(start: string, end: string): string {
  const short = (t: string) => (t.endsWith(':00') ? t.slice(0, 2) : t);
  return `${short(start)} - ${short(end)}`;
}

// "9" -> 09:00, "930" -> 09:30, "9:5" -> 09:05
export function normalizeTimeInput(raw: string): string | null {
  const v = raw.trim().replace(/[.,\-\s]/g, ':');
  if (v === '') return null;
  let h: number;
  let m: number;
  if (v.includes(':')) {
    const [hs = '', ms = ''] = v.split(':');
    if (!/^\d{1,2}$/.test(hs) || !/^\d{0,2}$/.test(ms)) return null;
    h = Number(hs);
    m = ms === '' ? 0 : Number(ms);
  } else {
    if (!/^\d{1,4}$/.test(v)) return null;
    if (v.length <= 2) {
      h = Number(v);
      m = 0;
    } else {
      h = Number(v.slice(0, v.length - 2));
      m = Number(v.slice(-2));
    }
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
