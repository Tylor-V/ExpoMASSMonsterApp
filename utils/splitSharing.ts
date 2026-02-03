export type SplitDay = {
  title: string;
  lifts: string[];
  notes: string;
};

export type WorkoutPlan = {
  name: string;
  startDate: string; // YYYY-MM-DD
  notes?: string;
  days: SplitDay[];
};

export type SharedSplit = {
  id: string;
  msgId: string;
  split: WorkoutPlan;
  fromName: string;
  fromPic: string;
  savedAt: number;
};

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeLifts = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
};

export const normalizeWorkoutPlan = (value: unknown): WorkoutPlan | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const name = cleanString(input.name);
  const notes = cleanString(input.notes);
  const daysInput = Array.isArray(input.days) ? input.days : [];
  const days = daysInput
    .map(day => {
      if (!day || typeof day !== 'object') return null;
      const dayInput = day as Record<string, unknown>;
      const title = cleanString(dayInput.title);
      if (!title) return null;
      return {
        title,
        notes: cleanString(dayInput.notes),
        lifts: normalizeLifts(dayInput.lifts),
      };
    })
    .filter((day): day is SplitDay => Boolean(day));

  if (!name || days.length < 3 || days.length > 10) return null;

  const rawStartDate = cleanString(input.startDate);
  const startDate = rawStartDate || new Date().toISOString().slice(0, 10);

  return {
    name,
    startDate,
    notes: notes || undefined,
    days,
  };
};

export const normalizeSharedSplitEntry = (value: unknown): SharedSplit | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const msgId =
    (typeof input.msgId === 'string' && input.msgId) ||
    (typeof input.id === 'string' && input.id);
  if (!msgId) return null;
  const split = normalizeWorkoutPlan(input.split);
  if (!split) return null;
  const fromName = cleanString(input.fromName) || 'MASS Member';
  const fromPic = cleanString(input.fromPic);
  const savedAt =
    typeof input.savedAt === 'number' && Number.isFinite(input.savedAt)
      ? input.savedAt
      : Date.now();
  return {
    id: msgId,
    msgId,
    split,
    fromName,
    fromPic,
    savedAt,
  };
};

export const normalizeSharedSplitList = (value: unknown): SharedSplit[] => {
  if (!Array.isArray(value)) return [];
  const entries = value
    .map(entry => normalizeSharedSplitEntry(entry))
    .filter((entry): entry is SharedSplit => Boolean(entry));
  const map = new Map<string, SharedSplit>();
  entries.forEach(entry => {
    map.set(entry.msgId, entry);
  });
  return Array.from(map.values());
};
