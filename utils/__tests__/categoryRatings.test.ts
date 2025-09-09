import { parseCategoryRatings, stripCategoryRatings } from '../categoryRatings';

describe('parseCategoryRatings', () => {
  it('extracts ratings from description', () => {
    const desc =
      'Energy/Focus: 4 stars General Health: 3 stars Muscle Recovery: 5 stars';
    expect(parseCategoryRatings(desc)).toEqual({
      Energy: 4,
      Health: 3,
      Recovery: 5,
    });
  });

  it('ignores values outside 0-5', () => {
    const desc = 'Strength/Performance: 6 stars';
    expect(parseCategoryRatings(desc)).toEqual({});
  });
});

describe('stripCategoryRatings', () => {
  it('removes rating text from description', () => {
    const desc =
      'Energy/Focus: 4 stars General Health: 3 stars Product description';
    expect(stripCategoryRatings(desc)).toBe('Product description');
  });

  it('returns empty string when input undefined', () => {
    expect(stripCategoryRatings(undefined)).toBe('');
  });
});