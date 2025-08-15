import { htmlToText } from '../htmlToText';

describe('htmlToText', () => {
  it('converts basic html to plain text with newlines', () => {
    const html = '<p>Hello<br/>World</p><p>Next</p>';
    expect(htmlToText(html)).toBe('Hello\nWorld\n\nNext');
  });
});