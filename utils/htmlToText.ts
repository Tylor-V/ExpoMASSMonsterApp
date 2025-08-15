export function htmlToText(html: string): string {
  if (!html) return '';
  // replace <br> and <p> with new lines
  let text = html.replace(/<br\s*\/?\s*>/gi, '\n');
  text = text.replace(/<\/?p[^>]*>/gi, '\n');
  // remove any other html tags
  text = text.replace(/<[^>]+>/g, '');
  // decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  Object.keys(entities).forEach(ent => {
    text = text.split(ent).join(entities[ent]);
  });
  // collapse multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}