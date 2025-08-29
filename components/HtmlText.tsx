import React from 'react';
import {
  Text,
  TextStyle,
  StyleSheet,
  View,
} from 'react-native';
import { fonts, colors } from '../theme';

type HtmlTextProps = {
  html: string;
  style?: TextStyle | TextStyle[];
};

type StackItem = { tag: string; style: TextStyle };

function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return text.replace(/&[^;]+;/g, m => entities[m] ?? m);
}

export default function HtmlText({ html, style }: HtmlTextProps) {
  const baseStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
  const baseFontSize = (baseStyle as TextStyle).fontSize ?? 14;

  const tokens = html.split(/(<[^>]+>)/g).filter(t => t);
  const stack: StackItem[] = [];
  const elements: React.ReactNode[] = [];
  let key = 0;

  const pushText = (text: string) => {
    if (!text) return;
    const merged = stack.reduce((acc, cur) => ({ ...acc, ...cur.style }), {} as TextStyle);
    elements.push(
      <Text key={key++} style={[{ fontFamily: fonts.regular }, baseStyle, merged]}>
        {decodeHTMLEntities(text)}
      </Text>
    );
  };

  const pushLineBreak = () => {
    elements.push(<Text key={key++}>{'\n'}</Text>);
  };

  tokens.forEach(token => {
    if (token.startsWith('<')) {
      const isClosing = /^<\//.test(token);
      const isSelfClosing = /\/>$/.test(token);
      const tag = token.replace(/<\/?|\/?>/g, '').trim().toLowerCase();

      if (isClosing) {
        const idx = stack.map(s => s.tag).lastIndexOf(tag);
        if (idx !== -1) stack.splice(idx, 1);
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          pushLineBreak();
        }
      } else if (isSelfClosing) {
        if (tag === 'br') {
          pushLineBreak();
        } else if (tag === 'hr') {
          elements.push(
            <View
              key={key++}
              testID="html-hr"
              style={{
                borderBottomColor: colors.grayLight,
                borderBottomWidth: StyleSheet.hairlineWidth,
                marginVertical: 8,
              }}
            />
          );
        }
      } else {
        let tagStyle: TextStyle = {};
        switch (tag) {
          case 'strong':
          case 'b':
            tagStyle = { fontFamily: fonts.bold, fontWeight: 'bold' };
            break;
          case 'em':
          case 'i':
            tagStyle = { fontStyle: 'italic', fontFamily: fonts.regular };
            break;
          case 'h1':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize * 1.6 };
            break;
          case 'h2':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize * 1.4 };
            break;
          case 'h3':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize * 1.2 };
            break;
          case 'h4':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize * 1.1 };
            break;
          case 'h5':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize };
            break;
          case 'h6':
            tagStyle = { fontFamily: fonts.bold, fontSize: baseFontSize * 0.9 };
            break;
        }
        stack.push({ tag, style: tagStyle });
      }
    } else {
      pushText(token);
    }
  });

  return <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{elements}</View>;
}

