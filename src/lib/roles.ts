export function isModeratorOrAdmin(role?: string | null) {
  return role === 'moderator' || role === 'admin';
}
