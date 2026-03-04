import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import SettingsScreen from '../SettingsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    dispatch: jest.fn(),
  }),
  CommonActions: {
    reset: jest.fn(),
  },
}));

describe('SettingsScreen', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    mockNavigate.mockClear();
    (Platform as any).OS = originalPlatform;
  });

  afterAll(() => {
    (Platform as any).OS = originalPlatform;
  });

  it('navigates to Account when Account row pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Account'));
    expect(mockNavigate).toHaveBeenCalledWith('Account');
  });

  it('hides Donate & Support row on iOS', () => {
    (Platform as any).OS = 'ios';
    const { queryByText } = render(<SettingsScreen />);
    expect(queryByText('Donate & Support')).toBeNull();
  });
});