import {
  normalizeSharedSplitList,
  normalizeWorkoutPlan,
} from '../splitSharing';

const makePlan = (name: string) => ({
  name,
  startDate: '2024-01-01',
  notes: 'Notes',
  days: [
    { title: 'Day 1', lifts: ['Bench'], notes: '' },
    { title: 'Day 2', lifts: ['Row'], notes: '' },
    { title: 'Day 3', lifts: ['Squat'], notes: '' },
  ],
});

describe('splitSharing helpers', () => {
  test('normalizeWorkoutPlan rejects missing required fields', () => {
    expect(normalizeWorkoutPlan({})).toBeNull();
    expect(normalizeWorkoutPlan({ name: 'Plan', days: [] })).toBeNull();
  });

  test('normalizeWorkoutPlan trims and normalizes days', () => {
    const normalized = normalizeWorkoutPlan({
      name: '  Plan  ',
      startDate: '',
      notes: '  ',
      days: [
        { title: ' Day 1 ', lifts: [' Bench ', 2], notes: 1 },
        { title: '', lifts: [], notes: '' },
        { title: 'Day 2', lifts: ['Row'], notes: '' },
        { title: 'Day 3', lifts: ['Squat'], notes: '' },
      ],
    });
    expect(normalized?.name).toBe('Plan');
    expect(normalized?.notes).toBeUndefined();
    expect(normalized?.days.length).toBe(3);
    expect(normalized?.days[0].lifts).toEqual(['Bench']);
  });

  test('normalizeSharedSplitList dedupes and drops invalid entries', () => {
    const plan = makePlan('Plan');
    const entries = normalizeSharedSplitList([
      { msgId: 'one', split: plan, fromName: 'A', fromPic: '', savedAt: 1 },
      { id: 'one', split: plan, fromName: 'B', fromPic: '', savedAt: 2 },
      { msgId: 'two', split: { name: 'Bad', days: [] } },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].msgId).toBe('one');
  });
});
