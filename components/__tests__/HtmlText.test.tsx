import React from 'react';
import { render } from '@testing-library/react-native';
import HtmlText from '../HtmlText';

describe('HtmlText', () => {
  it('renders common HTML formatting', () => {
    const html = '<h1>Header</h1><p>Hello <strong>world</strong><hr/><em>italic</em></p>';
    const { getByText, getByTestId } = render(<HtmlText html={html} />);
    expect(getByText('Header')).toBeTruthy();
    expect(getByText('world')).toBeTruthy();
    expect(getByTestId('html-hr')).toBeTruthy();
    expect(getByText('italic')).toBeTruthy();
  });
});

