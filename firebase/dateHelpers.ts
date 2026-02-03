export function getDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

export function getTodayKey(): string {
  return getDateKey(new Date());
}

export function parseDateKey(dateKey: string): Date | null {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
