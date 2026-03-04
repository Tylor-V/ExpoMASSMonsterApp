import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import ClassroomScreen from '../ClassroomScreen';

jest.mock('../../hooks/useCurrentUserStatus', () => ({
  useCurrentUserStatus: () => ({
    user: { coursesProgress: { welcome: 0.5 } },
    loading: false,
    error: null,
    refreshUserData: jest.fn(),
  }),
}));

jest.mock('../../courses/WelcomeCourse', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Welcome Course Component</Text>;
});

jest.mock('../../courses/PushPullLegsCourse', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>PPL Course Component</Text>;
});

jest.mock('../../courses/FuelCourse', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Fuel Course Component</Text>;
});

jest.mock('../../courses/MindsetCourse', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>Mindset Course Component</Text>;
});

describe('ClassroomScreen', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    (Platform as any).OS = originalPlatform;
  });

  afterAll(() => {
    (Platform as any).OS = originalPlatform;
  });

  it('shows restart button when progress exists', () => {
    const { getByText } = render(<ClassroomScreen />);
    fireEvent.press(getByText('Welcome to MASS Monster'));
    expect(getByText('Restart Course')).toBeTruthy();
  });

  it('hides iOS membership store CTA for locked member courses', () => {
    (Platform as any).OS = 'ios';
    const { getByText, queryByText } = render(<ClassroomScreen />);

    fireEvent.press(getByText('Push-Pull-Legs'));

    expect(getByText('Membership required')).toBeTruthy();
    expect(queryByText('Visit Store')).toBeNull();
  });
});