export function getChatLevelColor(level = 1) {
  if (level >= 10) return '#A259FF';
  if (level >= 7) return '#42A5F5';
  if (level >= 4) return '#66bb6a';
  return '#666';
}