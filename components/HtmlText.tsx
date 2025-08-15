import React from 'react';
import { Text, TextStyle } from 'react-native';
import { htmlToSegments } from '../utils/htmlToSegments';
import { fonts } from '../theme';

type HtmlTextProps = {
  html: string;
  style?: TextStyle | TextStyle[];
};

export default function HtmlText({ html, style }: HtmlTextProps) {
  const segments = htmlToSegments(html);
  return (
    <Text style={style} testID="html-text">
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={
            seg.bold
              ? [style, { fontFamily: fonts.bold, fontWeight: 'bold' }]
              : style
          }
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}