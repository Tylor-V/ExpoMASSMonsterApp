export type NameLike = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
};

const DEFAULT_FALLBACK = 'A member';

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Formats a user's name into "First L." with graceful fallbacks.
 */
export function formatUserDisplayName(
  user: NameLike | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (!user) return fallback;

  const first = (user.firstName || '').trim();
  const last = (user.lastName || '').trim();
  const display = (user.displayName || '').trim();

  if (first || last) {
    const formattedFirst = first ? toTitleCase(first) : '';
    const initial = last ? `${toTitleCase(last).charAt(0)}.` : '';
    const parts = [formattedFirst || toTitleCase(display), initial].filter(Boolean);
    return parts.length ? parts.join(' ').trim() : fallback;
  }

  if (display) {
    return toTitleCase(display);
  }

  return fallback;
}

export function formatBadgeName(badgeKey: string): string {
  if (!badgeKey) return 'Badge';
  return toTitleCase(badgeKey.replace(/[_-]+/g, ' '));
}
