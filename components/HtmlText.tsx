import React from 'react';
import {
  useWindowDimensions,
  TextStyle,
  StyleSheet,
  View,
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import { fonts, colors } from '../theme';

type HtmlTextProps = {
  html: string;
  style?: TextStyle | TextStyle[];
};

export default function HtmlText({ html, style }: HtmlTextProps) {
  const { width } = useWindowDimensions();
  const baseStyle = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
  const baseFontSize = (baseStyle as TextStyle).fontSize ?? 14;
  return (
    <RenderHTML
      testID="html-text"
      contentWidth={width}
      source={{ html: `<div>${html}</div>` }}
      baseStyle={{ fontFamily: fonts.regular, ...baseStyle }}
      tagsStyles={{
        strong: { fontFamily: fonts.bold, fontWeight: 'bold' },
        b: { fontFamily: fonts.bold, fontWeight: 'bold' },
        em: { fontStyle: 'italic', fontFamily: fonts.regular },
        i: { fontStyle: 'italic', fontFamily: fonts.regular },
        h1: { fontFamily: fonts.bold, fontSize: baseFontSize * 1.6 },
        h2: { fontFamily: fonts.bold, fontSize: baseFontSize * 1.4 },
        h3: { fontFamily: fonts.bold, fontSize: baseFontSize * 1.2 },
        h4: { fontFamily: fonts.bold, fontSize: baseFontSize * 1.1 },
        h5: { fontFamily: fonts.bold, fontSize: baseFontSize },
        h6: { fontFamily: fonts.bold, fontSize: baseFontSize * 0.9 },
      }}
      renderers={{
        hr: () => (
          <View
            testID="html-hr"
            style={{
              borderBottomColor: colors.grayLight,
              borderBottomWidth: StyleSheet.hairlineWidth,
              marginVertical: 8,
            }}
          />
        ),
      }}
    />
  );
}

