export function formatDisplayName(firstName?: string, lastName?: string, fallback = 'User'): string {
  const f = firstName?.trim() ?? '';
  const l = lastName?.trim() ?? '';
  if (!f && !l) return fallback;
  const lastInitial = l ? `${l.charAt(0)}.` : '';
  return [f, lastInitial].filter(Boolean).join(' ');
}