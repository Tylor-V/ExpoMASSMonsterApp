import { htmlToSegments } from '../htmlToSegments';

describe('htmlToSegments', () => {
  it('parses bold tags and newlines', () => {
    const html = '<p>Hello <strong>World</strong><br/>Next</p>';
    const result = htmlToSegments(html);
    expect(result).toEqual([
      { text: 'Hello ', bold: false },
      { text: 'World', bold: true },
      { text: '\nNext', bold: false },
    ]);
  });
  
  it('handles bold tags with attributes', () => {
    const html = '<p><strong class="x">Bold</strong> and <b style="font-weight:bold;">Strong</b></p>';
    const result = htmlToSegments(html);
    expect(result).toEqual([
      { text: 'Bold', bold: true },
      { text: ' and ', bold: false },
      { text: 'Strong', bold: true },
    ]);
  });

  it('converts bold spans to segments', () => {
    const html = '<p>Regular <span style="font-weight:700;">Bold</span> End</p>';
    const result = htmlToSegments(html);
    expect(result).toEqual([
      { text: 'Regular ', bold: false },
      { text: 'Bold', bold: true },
      { text: ' End', bold: false },
    ]);
  });
  
  it('handles spans with bold classes', () => {
    const html = '<p><span class="font-weight-bold">Bold</span> Text</p>';
    const result = htmlToSegments(html);
    expect(result).toEqual([
      { text: 'Bold', bold: true },
      { text: ' Text', bold: false },
    ]);
  });
  
  it('converts fw-bold divs to segments', () => {
    const html = '<p>Start <div class="fw-bold">Bold Div</div> End</p>';
    const result = htmlToSegments(html);
    expect(result).toEqual([
      { text: 'Start ', bold: false },
      { text: 'Bold Div', bold: true },
      { text: ' End', bold: false },
    ]);
  });
});