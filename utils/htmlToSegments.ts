type HtmlSegment = { text: string; bold: boolean };

const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(text: string): string {
  let t = text;
  Object.keys(entities).forEach(ent => {
    t = t.split(ent).join(entities[ent]);
  });
  return t;
}

export function htmlToSegments(html: string): HtmlSegment[] {
  if (!html) return [];
  let text = html.replace(/<br\s*\/?\s*>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');
  // Convert elements with bold font-weight styles or bold-related classes into strong tags
  text = text.replace(
    /<(span|div)[^>]*(?:style=["'][^"']*font-weight\s*:\s*(?:bold|bolder|[5-9]00)\b[^"']*["']|class=["'][^"']*(?:bold|font-weight-bold|fw-bold)[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/gi,
    '<strong>$2</strong>'
  );
  text = text.replace(/\n{2,}/g, '\n');
  text = text.trim();

  const parts = text.split(/(<\/?(?:strong|b)[^>]*>)/gi);
  const segments: HtmlSegment[] = [];
  let bold = false;

  for (const part of parts) {
    if (!part) continue;
    if (/^<strong[^>]*>$/i.test(part) || /^<b[^>]*>$/i.test(part)) {
      bold = true;
    } else if (/^<\/strong[^>]*>$/i.test(part) || /^<\/b[^>]*>$/i.test(part)) {
      bold = false;
    } else {
      const cleaned = part.replace(/<[^>]+>/g, '');
      if (cleaned.length > 0) {
        segments.push({ text: decodeEntities(cleaned), bold });
      }
    }
  }

  return segments;
}