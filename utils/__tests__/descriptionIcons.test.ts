import { getDescriptionIcons } from '../descriptionIcons';

describe('getDescriptionIcons', () => {
  it('returns vegan icon for Vegetarian-friendly descriptions', () => {
    const icons = getDescriptionIcons('This product is Vegetarian-friendly and tasty.');
    expect(icons.some(i => i.text === 'Vegetarian-friendly')).toBe(true);
  });

  it('returns kosher icon when description mentions Kosher', () => {
    const icons = getDescriptionIcons('Certified Kosher product.');
    expect(icons.some(i => i.text === 'Kosher')).toBe(true);
  });
});
