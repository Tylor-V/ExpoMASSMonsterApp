import { parseCategoryRatings } from '../categoryRatings';

describe('parseCategoryRatings', () => {
  it('extracts ratings from description', () => {
    const desc = 'Energy/Focus: 4 stars General Health: 3 Muscle Building: 5';
    expect(parseCategoryRatings(desc)).toEqual({
      'Energy/Focus': 4,
      'General Health': 3,
      'Muscle Building': 5,
    });
  });

  it('ignores values outside 0-5', () => {
    const desc = 'Energy/Focus: 6 stars';
    expect(parseCategoryRatings(desc)).toEqual({});
  });
});
