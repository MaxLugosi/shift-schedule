import { describe, expect, it } from 'vitest';
import { addMonths, eachDay, getRange, rangeLabel, startOfWeek } from './dates';
import { cellsWord, employeesWord } from './plural';
import { compactRange, durationMinutes, formatHours, normalizeTimeInput } from './time';

describe('dates', () => {
  it('weeks start on Monday', () => {
    expect(startOfWeek('2026-07-05')).toBe('2026-06-29');
    expect(startOfWeek('2026-06-29')).toBe('2026-06-29');
  });

  it('builds week and month ranges', () => {
    expect(getRange('week', '2026-07-01')).toEqual({ from: '2026-06-29', to: '2026-07-05' });
    expect(getRange('month', '2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(eachDay('2026-07-01', '2026-07-31')).toHaveLength(31);
  });

  it('formats labels like the mockup', () => {
    expect(rangeLabel('week', '2026-07-01')).toBe('29 июня - 5 июля');
    expect(rangeLabel('week', '2026-07-08')).toBe('6 - 12 июля');
    expect(rangeLabel('month', '2026-07-08')).toBe('Июль 2026');
  });

  it('adds months clamping the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('time', () => {
  it('computes duration including overnight shifts', () => {
    expect(durationMinutes('07:00', '15:00')).toBe(480);
    expect(durationMinutes('22:00', '06:00')).toBe(480);
    expect(formatHours(570)).toBe('9,5 ч');
    expect(formatHours(780)).toBe('13 ч');
  });

  it('formats compact chip ranges', () => {
    expect(compactRange('08:00', '18:00')).toBe('08 - 18');
    expect(compactRange('08:30', '18:00')).toBe('08:30 - 18');
  });

  it('normalizes typed time', () => {
    expect(normalizeTimeInput('9')).toBe('09:00');
    expect(normalizeTimeInput('930')).toBe('09:30');
    expect(normalizeTimeInput('0930')).toBe('09:30');
    expect(normalizeTimeInput('9:5')).toBe('09:05');
    expect(normalizeTimeInput('23.15')).toBe('23:15');
    expect(normalizeTimeInput('24:00')).toBeNull();
    expect(normalizeTimeInput('12:60')).toBeNull();
    expect(normalizeTimeInput('abc')).toBeNull();
  });
});

describe('plural', () => {
  it('declines russian nouns', () => {
    expect(cellsWord(1)).toBe('1 ячейка');
    expect(cellsWord(3)).toBe('3 ячейки');
    expect(cellsWord(8)).toBe('8 ячеек');
    expect(cellsWord(11)).toBe('11 ячеек');
    expect(cellsWord(22)).toBe('22 ячейки');
    expect(employeesWord(2)).toBe('2 сотрудника');
    expect(employeesWord(5)).toBe('5 сотрудников');
  });
});
