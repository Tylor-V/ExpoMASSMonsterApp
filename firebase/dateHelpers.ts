export function getTodayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}