import { getDescriptionIcons } from '../descriptionIcons';

describe('getDescriptionIcons', () => {
  it('matches phrases case-insensitively', () => {
    const icons = getDescriptionIcons('This product contains soy and is NON-gmo.');
    expect(icons.length).toBe(2);
  });

  it('returns empty array when no phrases match', () => {
    expect(getDescriptionIcons('nothing here')).toEqual([]);
  });
});