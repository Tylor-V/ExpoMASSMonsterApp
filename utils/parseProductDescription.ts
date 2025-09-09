import { DescriptionIcon, DESCRIPTION_ICONS } from './descriptionIcons';

export interface ParsedInfoSections {
  directions?: string;
  precautions?: string;
  "Shelf life"?: string;
  Storage?: string;
  "The Pack includes"?: string;
}

export interface ParsedProductDescription {
  quantity?: string;
  about?: string;
  info: ParsedInfoSections;
  features: DescriptionIcon[];
  manufactured?: string;
}

const DISCLAIMER_REGEX = /These statements have not been evaluated by the Food and Drug Administration[\s\S]*?disease\./i;

export const DISCLAIMER_TEXT =
  'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure or prevent any disease.';

const INFO_HEADERS = [
  'Directions',
  'Precautions',
  'Shelf life',
  'Storage',
  'The Pack includes',
];

export function parseProductDescription(description: string): ParsedProductDescription {
  if (!description) {
    return { info: {}, features: [] };
  }

  let text = description;

  // Remove disclaimer text
  text = text.replace(DISCLAIMER_REGEX, '').trim();

  // Extract manufactured line
  let manufactured: string | undefined;
  const manufacturedMatch = text.match(/Manufactured in[^.]*\./i);
  if (manufacturedMatch) {
    manufactured = manufacturedMatch[0].trim();
    text = text.replace(manufacturedMatch[0], '').trim();
  }

  // Extract features denoted by leading asterisks
  const featureMatches = text.match(/\*[^*]+/g) || [];
  const features: DescriptionIcon[] = featureMatches
    .map(m => m.replace('*', '').trim())
    .map(ft => {
      const match = DESCRIPTION_ICONS.find(
        i => i.text.toLowerCase() === ft.toLowerCase(),
      );
      return match ? { text: match.text, asset: match.asset } : undefined;
    })
    .filter((i): i is DescriptionIcon => Boolean(i));
  // Remove feature text from main body
  featureMatches.forEach(f => {
    text = text.replace(f, '');
  });

  // Extract quantity info (first parentheses group)
  let quantity: string | undefined;
  const quantityMatch = text.match(/\(([^)]+)\)/);
  if (quantityMatch) {
    quantity = quantityMatch[1].trim();
    text = text.replace(quantityMatch[0], '').trim();
  }

  // Extract About section
  let about: string | undefined;
  const aboutMatch = text.match(/About:(.*?)(Directions:|$)/is);
  if (aboutMatch) {
    about = aboutMatch[1].trim();
  }

  // Extract info sections starting from Directions
  const infoTextIndex = text.toLowerCase().indexOf('directions:');
  const infoSections: ParsedInfoSections = {};
  if (infoTextIndex !== -1) {
    const infoText = text.substring(infoTextIndex);
    const headerRegex = new RegExp(`(${INFO_HEADERS.join('|')}):`, 'gi');
    const matches: { header: string; index: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(infoText)) !== null) {
      matches.push({ header: match[1], index: match.index });
    }
    for (let i = 0; i < matches.length; i++) {
      const { header, index } = matches[i];
      const start = index + header.length + 1; // account for colon
      const end = i + 1 < matches.length ? matches[i + 1].index : infoText.length;
      const content = infoText.substring(start, end).trim();
      if (content) {
        (infoSections as any)[header] = content;
      }
    }
  }

  return { quantity, about, info: infoSections, features, manufactured };
}

