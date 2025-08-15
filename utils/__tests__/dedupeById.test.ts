import { dedupeById } from '../dedupeById';

describe('dedupeById', () => {
  it('removes duplicate ids while preserving order', () => {
    const input = [
      { id: '1', text: 'a' },
      { id: '2', text: 'b' },
      { id: '1', text: 'c' },
    ];
    const result = dedupeById(input);
    expect(result).toEqual([
      { id: '1', text: 'a' },
      { id: '2', text: 'b' },
    ]);
  });
});