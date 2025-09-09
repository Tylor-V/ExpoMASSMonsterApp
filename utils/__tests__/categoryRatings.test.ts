import { parseCategoryRatings } from '../categoryRatings';

describe('parseCategoryRatings', () => {
  it('extracts ratings from description', () => {
    const desc = 'Energy: 4 stars Health: 3 Muscle Building: 5';
    expect(parseCategoryRatings(desc)).toEqual({
      Energy: 4,
      Health: 3,
      'Muscle Building': 5,
    });
  });

  it('ignores values outside 0-5', () => {
    const desc = 'Energy: 6 stars';
    expect(parseCategoryRatings(desc)).toEqual({});
  });
});
