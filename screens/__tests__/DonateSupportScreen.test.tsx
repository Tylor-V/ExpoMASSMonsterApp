import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

jest.mock('../../hooks/useCurrentUserDoc', () => ({
  useCurrentUserDoc: () => ({ uid: 'u1', referralCode: 'ABC123' }),
}));

import DonateSupportScreen from '../DonateSupportScreen';

describe('DonateSupportScreen iOS gating', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    (Platform as any).OS = originalPlatform;
  });

  afterAll(() => {
    (Platform as any).OS = originalPlatform;
  });

  it('hides donation CTA on iOS', () => {
    (Platform as any).OS = 'ios';
    const { queryByText, getByText } = render(<DonateSupportScreen />);

    expect(queryByText('Donate Now')).toBeNull();
    expect(getByText('Invite via Text')).toBeTruthy();
  });
});