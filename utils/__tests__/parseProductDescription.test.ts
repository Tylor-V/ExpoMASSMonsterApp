import { parseProductDescription } from '../parseProductDescription';

describe('parseProductDescription', () => {
  const description = `
(30 capsules)

About: Great supplement.
Info: Directions: Take one daily.
Precautions: Keep out of reach of children.
Shelf life: 2 years.
Storage: Store in a cool, dry place.
The Pack includes: 30 capsules.
*Vegetarian-friendly *non-GMO *Soy-free *Vegetable capsule
Manufactured in USA.
These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure or prevent any disease.
`;

  it('parses quantity, about text, info sections, features and manufactured line', () => {
    const parsed = parseProductDescription(description);
    expect(parsed.quantity).toBe('30 capsules');
    expect(parsed.about).toBe('Great supplement.');
    expect(parsed.info['Directions']).toBe('Take one daily.');
    expect(parsed.info['Precautions']).toBe('Keep out of reach of children.');
    expect(parsed.info['Shelf life']).toBe('2 years.');
    expect(parsed.info['Storage']).toBe('Store in a cool, dry place.');
    expect(parsed.info['The Pack includes']).toBe('30 capsules.');
    expect(parsed.features.map(f => f.text)).toEqual([
      'Vegetarian-friendly',
      'non-GMO',
      'Soy-free',
      'Vegetable capsule',
    ]);
    expect(parsed.manufactured).toBe('Manufactured in USA.');
  });

  it('strips About and Info labels from parsed text', () => {
    const parsed = parseProductDescription(`
      About: About: Clean formula.
      Info: Info: Directions: Take one daily.
    `);
    expect(parsed.about).toBe('Clean formula.');
    expect(parsed.info['Directions']).toBe('Take one daily.');
  });
});
